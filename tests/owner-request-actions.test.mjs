import dotenv from 'dotenv';
dotenv.config({ path: '.env.test', override: true });
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
const testUrl = new URL(process.env.DATABASE_URL);
assert.ok(
  ['localhost', '127.0.0.1', '[::1]'].includes(testUrl.hostname),
  'Tests must use a local database.'
);
assert.equal(
  testUrl.pathname.slice(1),
  'baytak_care_test',
  'Safety stop: tests must use baytak_care_test.'
);
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

function transactionHook({ beforeLock, beforeWrite, failLog } = {}) {
  return new Proxy(prisma, {
    get(target, key) {
      if (key !== '$transaction') return target[key];
      return (callback) => target.$transaction(tx => callback({
        ...tx,
        // Coordinate property races before lockActiveProperty acquires its row lock.
        $queryRaw: async (...args) => {
          if (beforeLock) await beforeLock();
          return tx.$queryRaw(...args);
        },
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
      propertyId: property.id, reportedById: caretaker.id, idempotencyKey: randomUUID(),
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

    await t.test('owner cannot edit a request because editing is disabled', async () => {
  const r = await request(a);
  const before = snapshot(r);

  const result = await actions.editRequest(r.id, valid);

  assert.equal(result.success, false);
  assert.equal(result.error, 'Requests can no longer be edited.');
  assert.deepEqual(snapshot(await read(r.id)), before);
  assert.equal((await logs(r.id)).length, 0);
});

    await t.test('owner cannot cancel a request because cancellation is disabled', async () => {
  const r = await request(a);
  const before = snapshot(r);

  const result = await actions.cancelRequest(r.id);

  assert.equal(result.success, false);
  assert.equal(result.error, 'Requests can no longer be cancelled.');
  assert.deepEqual(snapshot(await read(r.id)), before);
  assert.equal((await logs(r.id)).length, 0);
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
        assert.equal((await actions.cancelRequest(r.id)).success, false);
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
      assert.equal((await actions.editRequest(r.id, injected)).success, false);
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
    await t.test('zero estimate input cannot bypass disabled editing', async () => {
  const r = await request(a);
  const before = snapshot(r);

  const result = await actions.editRequest(r.id, {
    ...valid,
    estimatedCost: 0,
  });

  assert.equal(result.success, false);
  assert.equal(result.error, 'Requests can no longer be edited.');
  assert.deepEqual(snapshot(await read(r.id)), before);
  assert.equal((await logs(r.id)).length, 0);
});

    for (const method of ['editRequest', 'cancelRequest']) {
      await t.test(method + ' rechecks ownership if it changes after authorization', async () => {
        const r = await request(a);
        const racing = loadActions(transactionHook({ beforeLock: async () => {
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

    await t.test('simultaneous cancellations remain disabled without changing the request', async () => {
  const r = await request(a);
  const before = snapshot(r);

  const results = await Promise.all([
    actions.cancelRequest(r.id),
    actions.cancelRequest(r.id),
  ]);

  assert.equal(results.every((result) => result.success === false), true);
  assert.deepEqual(snapshot(await read(r.id)), before);
  assert.equal((await logs(r.id)).length, 0);
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
          assert.equal((await actions.createMaintenanceRequest({ ...valid, title, estimatedCost, propertyId: a.id, idempotencyKey: randomUUID() })).success, true);
          const created = await prisma.maintenanceRequest.findFirstOrThrow({ where: { title } });
          assert.equal(created.status, estimatedCost === undefined ? 'REPORTED' : 'PENDING_APPROVAL');
          assert.equal(created.reportedById, person.id);
        }
      }
      currentUser = ownerA;
    });

    await t.test('approval remains valid and refuses cancelled requests', async () => {
  const pending = await request(a);

  assert.equal((await actions.editRequest(pending.id, valid)).success, false);
  assert.equal((await actions.cancelRequest(pending.id)).success, false);

  const cancelled = await request(a, 'CANCELLED');

  assert.equal((await actions.cancelRequest(cancelled.id)).success, false);
  assert.equal((await actions.approveRequest(cancelled.id)).success, false);
  assert.equal(
    (await actions.rejectRequest(cancelled.id, 'No repair needed')).success,
    false,
  );
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
