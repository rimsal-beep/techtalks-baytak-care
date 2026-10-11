import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';

// Run from the repo root: npx tsx --test tests/owner-request-actions.test.mjs
// Only framework/session boundaries are replaced; authorization, actions, and
// PostgreSQL operations use production code. Unique fixtures are removed below.
const root = process.cwd();
const require = createRequire(import.meta.url);
const url = new URL(process.env.DATABASE_URL);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Use a local test database.');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
let currentUser = null;
const refreshed = [];

function loadActions(db = prisma) {
  const cache = new Map();
  function load(name) {
    if (cache.has(name)) return cache.get(name);
    const exports = {};
    cache.set(name, exports);
    const code = ts.transpileModule(fs.readFileSync(path.join(root, name), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    function resolve(id) {
      if (id === 'next/cache') return { revalidatePath: (...args) => refreshed.push(args) };
      if (id === 'next/navigation') return {
        redirect: (url) => { throw new Error('REDIRECT:' + url); },
        notFound: () => { throw new Error('NOT_FOUND'); },
      };
      if (id === '@/lib/session') return { getCurrentUser: async () => currentUser };
      if (id === '@/lib/prisma' || id === '../../lib/prisma') return { prisma: db };
      if (id === '@/lib/uploads') return { saveUpload: () => { throw new Error('Unexpected upload'); } };
      if (id.startsWith('@/')) return load(id.slice(2) + '.ts');
      if (id.startsWith('.')) return load(path.relative(root, path.resolve(root, path.dirname(name), id)) + '.ts');
      return require(id);
    }
    new Function('require', 'exports', 'console', code)(resolve, exports, { error: () => {} });
    return exports;
  }
  return {
    ...load('app/actions/request.ts'),
    ...load('app/actions/maintenance.ts'),
    ...load('app/actions/approval.ts'),
    authz: load('lib/authz.ts'),
    fields: load('lib/maintenanceRequestFields.ts'),
  };
}

function transactionHook({ beforeWrite, failLog } = {}) {
  return new Proxy(prisma, {
    get(target, key) {
      if (key !== '$transaction') return target[key];
      return (callback) => target.$transaction(tx => callback({
        ...tx,
        maintenanceRequest: {
          findFirst: args => tx.maintenanceRequest.findFirst(args),
          updateMany: async args => {
            if (beforeWrite) await beforeWrite(args);
            return tx.maintenanceRequest.updateMany(args);
          },
        },
        activityLog: { create: args => {
          if (failLog) throw new Error('Simulated activity log failure');
          return tx.activityLog.create(args);
        } },
      }));
    },
  });
}

const valid = { title: ' Updated leak ', description: ' New description ', requestType: 'ELECTRICAL', estimatedCost: 45.75, currency: 'LBP', estimateNote: ' Revised estimate ' };
const snapshot = value => JSON.parse(JSON.stringify(value));

test('BAY-74 owner request actions against local PostgreSQL', async t => {
  const userIds = [];
  const propertyIds = [];
  const tag = 'bay74-test-' + randomUUID();
  async function user(role, verified = true) {
    const result = await prisma.user.create({ data: {
      email: randomUUID() + '@bay74-tests.invalid', name: tag, passwordHash: 'test-fixture-no-login', role,
      emailVerifiedAt: verified ? new Date() : null,
    } });
    userIds.push(result.id);
    return result;
  }
  async function request(property, status = 'PENDING_APPROVAL') {
    return prisma.maintenanceRequest.create({ data: {
      title: tag, description: 'Original description', requestType: 'PLUMBING',
      estimatedCost: 20, currency: 'USD', estimateNote: 'Original note', status,
      propertyId: property.id, reportedById: caretaker.id,
      issuePhotoUrls: ['/uploads/original.jpg'], beforePhotoUrls: [], afterPhotoUrls: [],
      contractorName: 'Original contractor', contractorContact: 'Original contact', priority: 'HIGH',
    } });
  }
  const read = id => prisma.maintenanceRequest.findUniqueOrThrow({ where: { id } });
  const logs = id => prisma.activityLog.findMany({ where: { maintenanceRequestId: id } });
  const actions = loadActions();
  let caretaker;
  try {
    const ownerA = await user('OWNER');
    const ownerB = await user('OWNER');
    const unverified = await user('OWNER', false);
    caretaker = await user('CARETAKER');
    const a = await prisma.property.create({ data: { address: tag, ownerId: ownerA.id, caretakerId: caretaker.id } });
    propertyIds.push(a.id);
    const b = await prisma.property.create({ data: { address: tag, ownerId: ownerB.id } });
    propertyIds.push(b.id);
    currentUser = ownerA;

    await t.test('owner edit persists the six editable fields and keeps protected values', async () => {
      const r = await request(a);
      assert.equal((await actions.editRequest(r.id, valid)).success, true);
      const changed = await read(r.id);
      assert.equal(changed.title, 'Updated leak');
      assert.equal(changed.description, 'New description');
      assert.equal(changed.requestType, 'ELECTRICAL');
      assert.equal(changed.estimatedCost.toString(), '45.75');
      assert.equal(changed.currency, 'LBP');
      assert.equal(changed.estimateNote, 'Revised estimate');
      const protectedFields = row => {
        const copy = snapshot(row);
        for (const key of ['title', 'description', 'requestType', 'estimatedCost', 'currency', 'estimateNote', 'updatedAt']) delete copy[key];
        return copy;
      };
      assert.deepEqual(protectedFields(changed), protectedFields(r));
      assert.deepEqual((await logs(r.id)).map(l => [l.action, l.previousStatus, l.newStatus, l.performedById]),
        [['Request edited', 'PENDING_APPROVAL', 'PENDING_APPROVAL', ownerA.id]]);
      assert.ok(refreshed.some(([p]) => p === '/properties/' + a.id));
      assert.ok(refreshed.some(([p]) => p === '/activity'));
    });

    await t.test('owner cancellation retains the row, metadata, prior history and one cancellation log', async () => {
      const r = await request(a);
      assert.equal((await actions.editRequest(r.id, valid)).success, true);
      const before = snapshot(await read(r.id));
      assert.equal((await actions.cancelRequest(r.id)).success, true);
      const after = snapshot(await read(r.id));
      assert.equal(after.status, 'CANCELLED');
      delete before.status; delete after.status; delete before.updatedAt; delete after.updatedAt;
      assert.deepEqual(after, before);
      assert.equal((await logs(r.id)).length, 2);
      assert.equal((await actions.cancelRequest(r.id)).success, true);
      assert.equal((await logs(r.id)).filter(l => l.newStatus === 'CANCELLED').length, 1);
    });

    for (const role of ['Owner B', 'caretaker', 'anonymous', 'unverified owner']) {
      await t.test(role + ' cannot edit or cancel Owner A request', async () => {
        const r = await request(a);
        const before = snapshot(r);
        currentUser = { 'Owner B': ownerB, caretaker, anonymous: null, 'unverified owner': unverified }[role];
        const edit = await actions.editRequest(r.id, valid);
        const cancel = await actions.cancelRequest(r.id);
        assert.equal(edit.success, false); assert.equal(cancel.success, false);
        assert.deepEqual(snapshot(await read(r.id)), before);
        assert.equal((await logs(r.id)).length, 0);
        if (role === 'anonymous' || role === 'unverified owner') {
          assert.equal(edit.error, 'Not logged in or email not verified.');
          const access = await actions.authz.requireRequestAccess(r.id, 'OWNER');
          assert.throws(() => actions.authz.unwrap(access), /REDIRECT:\/login/);
        }
        currentUser = ownerA;
      });
    }

    await t.test('Owner A cannot edit/cancel Owner B request, including idempotent cancellation path', async () => {
      for (const status of ['PENDING_APPROVAL', 'CANCELLED']) {
        const r = await request(b, status);
        assert.equal((await actions.editRequest(r.id, valid)).success, false);
        assert.equal((await actions.cancelRequest(r.id)).success, false);
        assert.deepEqual(snapshot(await read(r.id)), snapshot(r));
      }
    });

    for (const status of ['REPORTED', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']) {
      await t.test(status + ' is not editable; only existing CANCELLED is idempotently cancellable', async () => {
        const r = await request(a, status);
        assert.equal((await actions.editRequest(r.id, valid)).success, false);
        assert.equal((await actions.cancelRequest(r.id)).success, status === 'CANCELLED');
        assert.deepEqual(snapshot(await read(r.id)), snapshot(r));
        assert.equal((await logs(r.id)).length, 0);
      });
    }

    await t.test('protected field injection cannot mass-assign any request metadata or relations', async () => {
      const r = await request(a);
      const injected = {
        ...valid, id: randomUUID(), propertyId: b.id, reportedById: ownerB.id,
        ownerId: ownerB.id, caretakerId: ownerB.id, status: 'COMPLETED', priority: 'URGENT',
        approvedById: ownerB.id, approvedAt: new Date(), rejectedAt: new Date(), rejectionReason: 'Injected',
        completedAt: new Date(), actualCost: 100, contractorName: 'Injected', contractorContact: 'Injected',
        issuePhotoUrls: ['https://example.invalid/injected'], beforePhotoUrls: ['Injected'], afterPhotoUrls: ['Injected'],
        receiptUrl: 'https://example.invalid/receipt', createdAt: new Date(0), updatedAt: new Date(0),
        property: { connect: { id: b.id } }, reportedBy: { connect: { id: ownerB.id } },
        approvedBy: { connect: { id: ownerB.id } }, activityLogs: { deleteMany: {} },
      };
      assert.equal((await actions.editRequest(r.id, injected)).success, true);
      const changed = snapshot(await read(r.id));
      const before = snapshot(r);
      for (const key of ['title', 'description', 'requestType', 'estimatedCost', 'currency', 'estimateNote', 'updatedAt']) {
        delete changed[key]; delete before[key];
      }
      assert.deepEqual(changed, before);
    });

    const invalidValues = [
      ['empty title', { title: ' ' }], ['non-string title', { title: {} }], ['long title', { title: 'x'.repeat(121) }],
      ['unknown type', { requestType: 'INJECTED' }], ['long description', { description: 'x'.repeat(2001) }],
      ['long estimate note', { estimateNote: 'x'.repeat(1001) }], ['invalid currency', { currency: 'EUR' }],
      ['negative cost', { estimatedCost: -1 }], ['NaN cost', { estimatedCost: NaN }], ['infinite cost', { estimatedCost: Infinity }],
      ['string cost', { estimatedCost: '25' }], ['missing estimate', { estimatedCost: undefined }],
      ['null estimate', { estimatedCost: null }], ['cost beyond database precision', { estimatedCost: 100_000_000 }],
    ];
    for (const [name, change] of invalidValues) {
      await t.test('validation rejects ' + name + ' without mutation', async () => {
        const r = await request(a);
        assert.equal((await actions.editRequest(r.id, { ...valid, ...change })).success, false);
        assert.deepEqual(snapshot(await read(r.id)), snapshot(r));
        assert.equal((await logs(r.id)).length, 0);
      });
    }
    await t.test('zero estimate and clearing optional text persist without changing pending status', async () => {
      const r = await request(a);
      assert.equal((await actions.editRequest(r.id, { ...valid, estimatedCost: 0, description: '', estimateNote: '' })).success, true);
      const changed = await read(r.id);
      assert.equal(changed.estimatedCost.toString(), '0');
      assert.equal(changed.description, null); assert.equal(changed.estimateNote, null);
      assert.equal(changed.status, 'PENDING_APPROVAL');
    });

    for (const method of ['editRequest', 'cancelRequest']) {
      for (const status of ['APPROVED', 'COMPLETED']) {
        await t.test('stale ' + method + ' loses to a current ' + status + ' decision at the write', async () => {
          const r = await request(a);
          const racing = loadActions(transactionHook({ beforeWrite: async () => {
            await prisma.maintenanceRequest.update({ where: { id: r.id }, data: { status } });
          } }));
          assert.equal((await racing[method](r.id, valid)).success, false);
          const changed = await read(r.id);
          assert.equal(changed.status, status); assert.equal(changed.title, r.title);
          assert.equal((await logs(r.id)).length, 0);
        });
      }
      await t.test(method + ' rechecks ownership if it changes after authorization', async () => {
        const r = await request(a);
        const racing = loadActions(transactionHook({ beforeWrite: async () => {
          await prisma.property.update({ where: { id: a.id }, data: { ownerId: ownerB.id } });
        } }));
        try {
          assert.equal((await racing[method](r.id, valid)).success, false);
          assert.deepEqual(snapshot(await read(r.id)), snapshot(r));
          assert.equal((await logs(r.id)).length, 0);
        } finally { await prisma.property.update({ where: { id: a.id }, data: { ownerId: ownerA.id } }); }
      });
      await t.test(method + ' rolls back if history cannot be recorded', async () => {
        const r = await request(a);
        const broken = loadActions(transactionHook({ failLog: true }));
        assert.equal((await broken[method](r.id, valid)).success, false);
        assert.deepEqual(snapshot(await read(r.id)), snapshot(r));
        assert.equal((await logs(r.id)).length, 0);
      });
    }

    await t.test('two simultaneous cancellations both succeed and record history once', async () => {
      const r = await request(a);
      let arrivals = 0;
      let release;
      const ready = new Promise(resolve => { release = resolve; });
      const concurrent = loadActions(transactionHook({ beforeWrite: async () => {
        if (++arrivals === 2) release();
        await ready;
      } }));
      const results = await Promise.all([concurrent.cancelRequest(r.id), concurrent.cancelRequest(r.id)]);
      assert.ok(results.every(result => result.success));
      assert.equal((await read(r.id)).status, 'CANCELLED');
      assert.equal((await logs(r.id)).length, 1);
    });

    await t.test('missing and malformed request IDs follow existing denial conventions', async () => {
      for (const id of [randomUUID(), '', 'x'.repeat(65), null, {}, 42]) {
        assert.equal((await actions.editRequest(id, valid)).success, false);
        assert.equal((await actions.cancelRequest(id)).success, false);
      }
    });

    await t.test('shared creation validation preserves owner/caretaker creation states', async () => {
      for (const person of [ownerA, caretaker]) {
        currentUser = person;
        for (const estimatedCost of [undefined, 0, 20]) {
          const title = tag + randomUUID();
          assert.equal((await actions.createMaintenanceRequest({ ...valid, title, estimatedCost, propertyId: a.id })).success, true);
          const created = await prisma.maintenanceRequest.findFirstOrThrow({ where: { title } });
          assert.equal(created.status, estimatedCost === undefined ? 'REPORTED' : 'PENDING_APPROVAL');
          assert.equal(created.reportedById, person.id);
        }
      }
      currentUser = ownerA;
    });

    await t.test('existing approval remains valid and refuses cancelled requests', async () => {
      const pending = await request(a);
      assert.equal((await actions.approveRequest(pending.id)).success, true);
      assert.equal((await read(pending.id)).status, 'APPROVED');
      assert.equal((await actions.editRequest(pending.id, valid)).success, false);
      const cancelled = await request(a);
      assert.equal((await actions.cancelRequest(cancelled.id)).success, true);
      assert.equal((await actions.approveRequest(cancelled.id)).success, false);
      assert.equal((await actions.rejectRequest(cancelled.id, 'No repair needed')).success, false);
      assert.equal((await read(cancelled.id)).status, 'CANCELLED');
    });
  } finally {
    currentUser = null;
    // Exact UUID fixture sets only; no existing application rows are deleted.
    await prisma.activityLog.deleteMany({ where: { propertyId: { in: propertyIds } } });
    await prisma.maintenanceRequest.deleteMany({ where: { propertyId: { in: propertyIds } } });
    await prisma.property.deleteMany({ where: { id: { in: propertyIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  }
});
