import dotenv from 'dotenv';
dotenv.config({ path: '.env.test', override: true });
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';

// npx tsx --test tests/property-soft-delete.test.mjs
// Production authorization, mutations and page queries against local PostgreSQL.
// Only session/framework/email boundaries are substituted; emails are never sent.

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

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});
// Process-local test configuration; never change the application's .env.
process.env.SESSION_SECRET = 'phase6-isolated-test-secret-at-least-32-characters';
process.env.APP_URL = 'http://localhost:3000';
let currentUser = null;
let sent = 0;
const refreshed = [];
const queried = [];
const snapshot = row => JSON.parse(JSON.stringify(row));

function loadProduction(db = prisma) {
  const cache = new Map();
  function load(name) {
    if (cache.has(name)) return cache.get(name);
    const exports = {};
    cache.set(name, exports);
    const code = ts.transpileModule(fs.readFileSync(path.join(root, name), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    function resolve(id) {
      if (id === 'next/cache') return { revalidatePath: (...args) => refreshed.push(args) };
      if (id === 'next/navigation') return {
        redirect: url => { throw new Error('REDIRECT:' + url); },
        notFound: () => { throw new Error('NOT_FOUND'); },
      };
      if (id === 'react') return { cache: fn => fn };
      if (id === '@/lib/session') return {
        getCurrentUser: async () => currentUser,
        requireVerifiedUser: async () => currentUser && (currentUser.role !== 'OWNER' || currentUser.emailVerifiedAt)
          ? { success: true, user: currentUser } : { success: false, error: 'Not logged in or email not verified.' },
      };
      if (id === '@/lib/prisma' || id === '../../lib/prisma') return { prisma: db };
      if (id === '@/lib/email') return { sendCaretakerInvitationEmail: async () => { sent++; } };
      if (id === '@/lib/uploads') return { saveUpload: () => { throw new Error('Unexpected upload'); } };
      if (id === 'next/link' || id.endsWith('.css')) return { __esModule: true, default: {} };
      if (id.startsWith('@/generated/')) return require(path.join(root, id.slice(2) + '.ts'));
      const candidate = id.startsWith('@/') ? id.slice(2)
        : id.startsWith('.') ? path.relative(root, path.resolve(root, path.dirname(name), id)) : null;
      if (candidate) {
        const file = ['.ts', '.tsx'].map(ext => candidate + ext).find(p => fs.existsSync(path.join(root, p)));
        // Page presentation components do not run during these server-query tests.
        if (file?.endsWith('.tsx')) return new Proxy({}, { get: () => () => null });
        if (file) return load(file);
      }
      return require(id);
    }
    new Function('require', 'exports', 'console', code)(resolve, exports, { error: () => {} });
    return exports;
  }
  return {
    ...load('app/actions/property.ts'), ...load('app/actions/invitation.ts'),
    ...load('app/actions/maintenance.ts'), ...load('app/actions/request.ts'),
    ...load('app/actions/approval.ts'), ...load('app/actions/job.ts'),
    authz: load('lib/authz.ts'), undo: load('lib/checklistUndo.ts'),
    caretakerData: load('app/caretaker/dashboard/data.ts').getCaretakerData,
    page: name => load(name).default,
  };
}

function hooked({ beforeLock, afterLock, beforeDelete, failRevoke, captureQueries } = {}) {
  return new Proxy(prisma, { get(target, key) {
    if (key === '$transaction') return callback => target.$transaction(tx => callback(new Proxy(tx, {
      get(t, k) {
              if (k === '$queryRaw') return async (...args) => {
          if (beforeLock) await beforeLock();

          const rows = await t.$queryRaw(...args);
          const query = args[0]?.join?.(' ') ?? '';

          if (afterLock && query.includes('"Property"')) {
            await afterLock();
          }

          return rows;
        };
        if (k === 'property') return new Proxy(t.property, { get(model, method) {
          if (method === 'updateMany') return async args => {
            if (beforeDelete) await beforeDelete();
            return model.updateMany(args);
          };
          return model[method];
        } });
        if (k === 'invitation' && failRevoke) return new Proxy(t.invitation, { get(model, method) {
          if (method === 'updateMany') return () => { throw new Error('Simulated invitation failure'); };
          return model[method];
        } });
        return t[k];
      },
    })));
    if (captureQueries && ['property', 'maintenanceRequest', 'activityLog'].includes(key)) {
      return new Proxy(target[key], { get(model, method) {
        if (method === 'findMany') return async args => {
          const rows = await model.findMany(args); queried.push({ model: key, args, rows }); return rows;
        };
        return model[method];
      } });
    }
    return target[key];
  } });
}

test('BAY-74 Phase 6 property soft-delete against local PostgreSQL', async t => {
  const userIds = [], propertyIds = [];
  const tag = 'bay74-phase6-' + randomUUID();
  const actions = loadProduction();
  let ownerA, ownerB, caretaker, unverified;
  async function user(role, verified = true) {
    const row = await prisma.user.create({ data: {
      email: randomUUID() + '@bay74-tests.invalid', name: tag, passwordHash: 'test-fixture-no-login', role,
      emailVerifiedAt: verified ? new Date() : null,
    } }); userIds.push(row.id); return row;
  }
  async function property(owner = ownerA, assigned = false) {
    const row = await prisma.property.create({ data: { address: tag, city: 'Test city', ownerId: owner.id, caretakerId: assigned ? caretaker.id : null } });
    propertyIds.push(row.id); return row;
  }
  async function request(p, status = 'PENDING_APPROVAL') {
    return prisma.maintenanceRequest.create({ data: {
      propertyId: p.id, reportedById: caretaker.id, idempotencyKey: randomUUID(), title: tag,
      requestType: 'PLUMBING', status, estimatedCost: 20, currency: 'USD',
      issuePhotoUrls: ['/uploads/preserved.jpg'], beforePhotoUrls: ['/uploads/before.jpg'], afterPhotoUrls: ['/uploads/after.jpg'],
      receiptUrl: '/uploads/receipt.pdf', actualCost: 30,
    } });
  }
  async function invitation(p, status = 'PENDING', email = caretaker.email) {
    const token = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
    const row = await prisma.invitation.create({ data: {
      propertyId: p.id, invitedById: ownerA.id, email, tokenHash: createHash('sha256').update(token).digest('hex'), status,
      expiresAt: new Date(Date.now() + 86400_000), acceptedAt: status === 'ACCEPTED' ? new Date() : null,
      revokedAt: status === 'REVOKED' ? new Date() : null,
    } }); return { ...row, token };
  }
  const read = id => prisma.property.findUniqueOrThrow({ where: { id } });
  const fields = { title: tag, requestType: 'PLUMBING', estimatedCost: 20, currency: 'USD' };
  try {
    ownerA = await user('OWNER'); ownerB = await user('OWNER'); caretaker = await user('CARETAKER'); unverified = await user('OWNER', false);
    t.beforeEach(() => { currentUser = ownerA; });
    currentUser = ownerA;
    const p = await property(ownerA, true);
    const r = await request(p);
    const now = new Date();
    const item = await prisma.checklistItem.create({ data: {
      propertyId: p.id, text: 'Check water and plumbing', completed: true, completedById: caretaker.id, completedAt: now,
      monthKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    } });
    const log = await prisma.activityLog.create({ data: { propertyId: p.id, maintenanceRequestId: r.id, performedById: caretaker.id, action: 'Preserved history' } });
    const pending = await invitation(p);
    const stalePending = await invitation(p, 'PENDING', 'expired-' + caretaker.email);
    await prisma.invitation.update({ where: { id: stalePending.id }, data: { expiresAt: new Date(0) } });
    const history = await Promise.all(['ACCEPTED', 'EXPIRED', 'REVOKED'].map(s => invitation(p, s)));
    const historySnapshots = await prisma.invitation.findMany({ where: { id: { in: history.map(i => i.id) } }, orderBy: { id: 'asc' } });

    for (const [name, person] of [['other owner', ownerB], ['caretaker', caretaker], ['anonymous', null], ['unverified owner', unverified]]) {
      await t.test(name + ' cannot delete another owner property', async () => {
        currentUser = person;
        assert.equal((await actions.deleteProperty(p.id)).success, false);
        assert.deepEqual(snapshot(await read(p.id)), snapshot(p));
      });
    }
    currentUser = ownerA;
    await t.test('malformed/missing IDs and object-based protected field injection are denied', async () => {
      for (const id of ['', null, 42, {}, "' OR 1=1 --", 'x'.repeat(65), randomUUID(), { id: p.id, deletedAt: new Date(), ownerId: ownerB.id }]) {
        assert.equal((await actions.deleteProperty(id)).success, false);
      }
      assert.deepEqual(snapshot(await read(p.id)), snapshot(p));
    });
    await t.test('own-property delete sets server timestamp, clears caretaker, preserves every history row and protected field', async () => {
      const start = Date.now();
      assert.equal((await actions.deleteProperty(p.id, { ownerId: ownerB.id, caretakerId: ownerB.id, deletedAt: new Date(0), isActive: false })).success, true);
      const after = await read(p.id);
      assert.ok(after.deletedAt.getTime() >= start); assert.equal(after.caretakerId, null);
      const clean = row => { const s = snapshot(row); for (const k of ['deletedAt', 'caretakerId', 'updatedAt']) delete s[k]; return s; };
      assert.deepEqual(clean(after), clean(p));
      assert.deepEqual(snapshot(await prisma.maintenanceRequest.findUniqueOrThrow({ where: { id: r.id } })), snapshot(r));
      assert.deepEqual(snapshot(await prisma.checklistItem.findUniqueOrThrow({ where: { id: item.id } })), snapshot(item));
      assert.deepEqual(snapshot(await prisma.activityLog.findUniqueOrThrow({ where: { id: log.id } })), snapshot(log));
      assert.equal(await prisma.activityLog.count({ where: { propertyId: p.id } }), 1);
    });
    await t.test('pending invitations including stale pending links become revoked; all other lifecycle history is intact', async () => {
      const deleted = await read(p.id);
      for (const id of [pending.id, stalePending.id]) {
        const row = await prisma.invitation.findUniqueOrThrow({ where: { id } });
        assert.equal(row.status, 'REVOKED'); assert.equal(row.revokedAt.getTime(), deleted.deletedAt.getTime());
      }
      assert.deepEqual(snapshot(await prisma.invitation.findMany({ where: { id: { in: history.map(i => i.id) } }, orderBy: { id: 'asc' } })), snapshot(historySnapshots));
    });
    await t.test('repeated delete is idempotent and other-owner repeated delete is denied', async () => {
      const before = snapshot(await read(p.id));
      const invites = snapshot(await prisma.invitation.findMany({ where: { propertyId: p.id }, orderBy: { id: 'asc' } }));
      assert.equal((await actions.deleteProperty(p.id)).success, true);
      assert.deepEqual(snapshot(await read(p.id)), before);
      assert.deepEqual(snapshot(await prisma.invitation.findMany({ where: { propertyId: p.id }, orderBy: { id: 'asc' } })), invites);
      currentUser = ownerB; assert.equal((await actions.deleteProperty(p.id)).success, false); currentUser = ownerA;
    });
    await t.test('actual owner dashboard/lists and caretaker data exclude deleted property; activity page preserves history', async () => {
      const pages = loadProduction(hooked({ captureQueries: true }));
      for (const file of ['app/page.tsx', 'app/properties/page.tsx', 'app/requests/page.tsx', 'app/requests/pending-approvals/page.tsx']) {
        queried.length = 0; await pages.page(file)();
        assert.ok(queried.length);
        for (const q of queried) assert.ok(!q.rows.some(row => row.id === p.id || row.id === r.id));
      }
      assert.equal(await actions.getPropertyId(), null);
      assert.equal((await actions.authz.requireOwnerOfProperty(p.id)).ok, false);
      for (const file of ['app/properties/[propertyId]/page.tsx', 'app/properties/[propertyId]/caretaker/page.tsx', 'app/properties/[propertyId]/edit/page.tsx']) {
        await assert.rejects(() => pages.page(file)({ params: Promise.resolve({ propertyId: p.id }), searchParams: Promise.resolve({}) }), /NOT_FOUND/);
      }
      queried.length = 0; await pages.page('app/activity/page.tsx')();
      assert.ok(queried.some(q => q.rows.some(row => row.id === log.id)));
      currentUser = caretaker;
      const data = await pages.caretakerData();
      assert.ok(!data.properties.some(row => row.id === p.id)); assert.ok(!data.requests.some(row => row.id === r.id));
      assert.equal((await actions.authz.requireAssignedCaretaker(p.id)).ok, false);
      assert.equal((await actions.acceptInvitation(pending.token)).success, false);
      assert.equal((await actions.acceptInvitation(history[0].token)).success, false);
      currentUser = ownerA;
    });
    await t.test('all owner/property/request actions reject deleted properties without changing history', async () => {
      const before = snapshot(await prisma.maintenanceRequest.findUniqueOrThrow({ where: { id: r.id } }));
      for (const call of [
        () => actions.updateProperty(p.id, { address: 'Injected' }),
        () => actions.inviteCaretaker(p.id, caretaker.email),
        () => actions.resendInvitation(p.id, caretaker.email),
        () => actions.revokeInvitation(pending.id), () => actions.removeCaretaker(p.id),
        () => actions.createMaintenanceRequest({ ...fields, propertyId: p.id, idempotencyKey: randomUUID() }),
        () => actions.editRequest(r.id, fields), () => actions.cancelRequest(r.id),
        () => actions.approveRequest(r.id), () => actions.rejectRequest(r.id, 'Rejected'),
      ]) assert.equal((await call()).success, false);
      assert.deepEqual(snapshot(await prisma.maintenanceRequest.findUniqueOrThrow({ where: { id: r.id } })), before);
      assert.equal(sent, 0);
    });
    await t.test('caretaker checklist/request/work/upload actions reject deleted property', async () => {
      currentUser = caretaker;
      for (const call of [
        () => actions.completeChecklistItem({ propertyId: p.id, text: item.text }),
        () => actions.undoChecklistItem({ propertyId: p.id, itemId: item.id, text: item.text, undoToken: actions.undo.checklistUndoToken(item) }),
        () => actions.createMaintenanceRequest({ ...fields, propertyId: p.id, idempotencyKey: randomUUID() }),
        () => actions.startWork(r.id),
        () => actions.completeJob({ requestId: r.id, actualCost: 30, beforePhotoUrls: [], afterPhotoUrls: ['/uploads/after.jpg'], receiptUrl: '/uploads/receipt.pdf' }),
        () => actions.uploadJobFile(new FormData()),
      ]) assert.equal((await call()).success, false);
      assert.deepEqual(snapshot(await prisma.checklistItem.findUniqueOrThrow({ where: { id: item.id } })), snapshot(item));
      currentUser = ownerA;
    });
    await t.test('two concurrent deletes both succeed with one timestamp and one invitation transition', async () => {
      const c = await property(ownerA, true); const i = await invitation(c);
      let arrivals = 0, release; const ready = new Promise(resolve => { release = resolve; });
      const concurrent = loadProduction(hooked({ beforeDelete: async () => { if (++arrivals === 2) release(); await ready; } }));
      const results = await Promise.all([concurrent.deleteProperty(c.id), concurrent.deleteProperty(c.id)]);
      assert.ok(results.every(x => x.success));
      const row = await read(c.id); assert.equal(row.caretakerId, null);
      const revoked = await prisma.invitation.findUniqueOrThrow({ where: { id: i.id } });
      assert.equal(revoked.status, 'REVOKED'); assert.equal(revoked.revokedAt.getTime(), row.deletedAt.getTime());
      assert.equal(await prisma.activityLog.count({ where: { propertyId: c.id } }), 0);
    });
    await t.test('invitation-update failure rolls back both tombstone and caretaker unassignment', async () => {
      const c = await property(ownerA, true); const i = await invitation(c);
      const broken = loadProduction(hooked({ failRevoke: true }));
      assert.equal((await broken.deleteProperty(c.id)).success, false);
      assert.deepEqual(snapshot(await read(c.id)), snapshot(c));
      assert.equal((await prisma.invitation.findUniqueOrThrow({ where: { id: i.id } })).status, 'PENDING');
      assert.equal((await actions.deleteProperty(c.id)).success, true);
    });
    await t.test('ownership is rechecked at delete write after authorization', async () => {
      const c = await property();
      const stale = loadProduction(hooked({ beforeDelete: () => prisma.property.update({ where: { id: c.id }, data: { ownerId: ownerB.id } }) }));
      assert.equal((await stale.deleteProperty(c.id)).success, false);
      const row = await read(c.id); assert.equal(row.deletedAt, null); assert.equal(row.ownerId, ownerB.id);
    });
    await t.test('acceptance already in flight loses when delete takes the property lock first', async () => {
      const c = await property(); const i = await invitation(c);
      let arrived, release; const ready = new Promise(resolve => { arrived = resolve; }); const gate = new Promise(resolve => { release = resolve; });
      const accepting = loadProduction(hooked({ beforeLock: async () => { arrived(); await gate; } }));
      currentUser = caretaker; const accept = accepting.acceptInvitation(i.token);
      await ready; currentUser = ownerA;
      assert.equal((await actions.deleteProperty(c.id)).success, true);
      release(); assert.equal((await accept).success, false);
      assert.equal((await read(c.id)).caretakerId, null);
      assert.equal((await prisma.invitation.findUniqueOrThrow({ where: { id: i.id } })).status, 'REVOKED');
    });
    await t.test('acceptance taking the property lock first is preserved, then deletion clears its assignment', async () => {
      const c = await property(); const i = await invitation(c);
      let locked, release, deleting; const ready = new Promise(resolve => { locked = resolve; }); const gate = new Promise(resolve => { release = resolve; }); const deleteReady = new Promise(resolve => { deleting = resolve; });
      const accepting = loadProduction(hooked({ afterLock: async () => { locked(); await gate; } }));
      currentUser = caretaker; const accept = accepting.acceptInvitation(i.token); await ready;
      currentUser = ownerA;
      const deletingActions = loadProduction(hooked({ beforeDelete: async () => { deleting(); } }));
      const deletion = deletingActions.deleteProperty(c.id); await deleteReady; release();
      assert.equal((await accept).success, true); assert.equal((await deletion).success, true);
      assert.equal((await read(c.id)).caretakerId, null);
      const accepted = await prisma.invitation.findUniqueOrThrow({ where: { id: i.id } });
      assert.equal(accepted.status, 'ACCEPTED'); assert.ok(accepted.acceptedAt); assert.equal(accepted.revokedAt, null);
    });
    await t.test('active-looking pending invitation cannot bypass a property tombstone', async () => {
      const forged = await invitation(p, 'PENDING', 'forged-' + caretaker.email);
      const matched = { ...caretaker, email: forged.email };
      currentUser = matched; assert.equal((await actions.acceptInvitation(forged.token)).success, false);
      currentUser = ownerA; assert.equal((await actions.revokeInvitation(forged.id)).success, false);
      assert.equal((await actions.resendInvitation(p.id, forged.email)).success, false);
      assert.equal((await read(p.id)).caretakerId, null);
      assert.equal((await prisma.invitation.findUniqueOrThrow({ where: { id: forged.id } })).status, 'PENDING');
    });
    for (const method of ['createMaintenanceRequest', 'editRequest', 'cancelRequest', 'approveRequest', 'rejectRequest', 'inviteCaretaker', 'resendInvitation', 'completeChecklistItem', 'undoChecklistItem', 'startWork', 'completeJob']) {
      await t.test('stale ' + method + ' loses to deletion before its transaction lock', async () => {
        const isCaretaker = ['completeChecklistItem', 'undoChecklistItem', 'startWork', 'completeJob'].includes(method);
        const c = await property(ownerA, isCaretaker);
        const r = await request(c, method === 'startWork' ? 'APPROVED' : method === 'completeJob' ? 'IN_PROGRESS' : 'PENDING_APPROVAL');
        await invitation(c);
        const item = await prisma.checklistItem.create({ data: { propertyId: c.id, text: 'Check water and plumbing', monthKey: String(randomUUID()), completed: true, completedAt: now, completedById: caretaker.id } });
        if (method === 'completeChecklistItem') await prisma.checklistItem.update({ where: { id: item.id }, data: { completed: false } });
        currentUser = isCaretaker ? caretaker : ownerA;
        const racing = loadProduction(hooked({ beforeLock: async () => {
          await prisma.property.update({ where: { id: c.id }, data: { deletedAt: new Date(), caretakerId: null } });
        } }));
        const calls = {
          createMaintenanceRequest: () => racing.createMaintenanceRequest({ ...fields, propertyId: c.id, idempotencyKey: randomUUID() }),
          editRequest: () => racing.editRequest(r.id, fields), cancelRequest: () => racing.cancelRequest(r.id),
          approveRequest: () => racing.approveRequest(r.id), rejectRequest: () => racing.rejectRequest(r.id, 'Reject'),
          inviteCaretaker: () => racing.inviteCaretaker(c.id, 'new-' + caretaker.email), resendInvitation: () => racing.resendInvitation(c.id, caretaker.email),
          completeChecklistItem: () => racing.completeChecklistItem({ propertyId: c.id, text: item.text }),
          undoChecklistItem: () => racing.undoChecklistItem({ propertyId: c.id, itemId: item.id, text: item.text, undoToken: racing.undo.checklistUndoToken(item) }),
          startWork: () => racing.startWork(r.id),
          completeJob: () => racing.completeJob({ requestId: r.id, actualCost: 30, beforePhotoUrls: [], afterPhotoUrls: ['/uploads/after.jpg'], receiptUrl: '/uploads/receipt.pdf' }),
        };
        const sentBefore = sent;
        assert.equal((await calls[method]()).success, false);
        assert.ok((await read(c.id)).deletedAt);
        assert.deepEqual(snapshot(await prisma.maintenanceRequest.findUniqueOrThrow({ where: { id: r.id } })), snapshot(r));
        assert.equal(await prisma.activityLog.count({ where: { propertyId: c.id } }), 0);
        assert.equal(sent, sentBefore);
        currentUser = ownerA;
      });
    }
    await t.test('active properties retain edit, request duplicate-submit, checklist undo, approval and caretaker workflow', async () => {
      const c = await property(ownerA, true);
      assert.equal((await actions.updateProperty(c.id, { address: tag + ' edited', city: 'Updated' })).success, true);
      const key = randomUUID(); const input = { ...fields, propertyId: c.id, idempotencyKey: key };
      const first = await actions.createMaintenanceRequest(input); assert.equal(first.success, true);
      const second = await actions.createMaintenanceRequest(input); assert.equal(second.success, true); assert.equal(second.duplicate, true); assert.equal(second.requestId, first.requestId);
      assert.equal((await actions.editRequest(first.requestId, { ...fields, title: tag + ' edit' })).success, true);
      assert.equal((await actions.approveRequest(first.requestId)).success, true);
      currentUser = caretaker;
      assert.equal((await actions.startWork(first.requestId)).success, true);
      assert.equal((await actions.completeJob({ requestId: first.requestId, actualCost: 30, beforePhotoUrls: [], afterPhotoUrls: ['/uploads/after.jpg'], receiptUrl: '/uploads/receipt.pdf' })).success, true);
      assert.equal((await actions.completeChecklistItem({ propertyId: c.id, text: item.text })).success, true);
      const done = await prisma.checklistItem.findFirstOrThrow({ where: { propertyId: c.id } });
      assert.equal((await actions.undoChecklistItem({ propertyId: c.id, itemId: done.id, text: done.text, undoToken: actions.undo.checklistUndoToken(done) })).success, true);
      currentUser = ownerA;
      const cancel = await request(c); assert.equal((await actions.cancelRequest(cancel.id)).success, true); assert.equal((await actions.cancelRequest(cancel.id)).success, true);
      assert.equal((await actions.deleteProperty(c.id)).success, true);
    });
    await t.test('active invitations retain duplicate issuance/resend/revoke/accept semantics', async () => {
      const c = await property(); const before = sent;
      assert.equal((await actions.inviteCaretaker(c.id, caretaker.email)).success, true);
      assert.equal(sent, before + 1);
      assert.equal((await actions.inviteCaretaker(c.id, caretaker.email)).success, true); assert.equal(sent, before + 1);
      const i = await prisma.invitation.findFirstOrThrow({ where: { propertyId: c.id } });
      assert.equal((await actions.resendInvitation(c.id, caretaker.email)).success, false);
      await prisma.invitation.update({ where: { id: i.id }, data: { lastEmailAt: new Date(0) } });
      assert.equal((await actions.resendInvitation(c.id, caretaker.email)).success, true); assert.equal(sent, before + 2);
      assert.equal((await actions.revokeInvitation(i.id)).success, true);
      const accept = await invitation(c);
      currentUser = caretaker; assert.equal((await actions.acceptInvitation(accept.token)).success, true);
      assert.equal((await read(c.id)).caretakerId, caretaker.id);
      currentUser = ownerA; assert.equal((await actions.deleteProperty(c.id)).success, true);
      assert.equal((await prisma.invitation.findUniqueOrThrow({ where: { id: accept.id } })).status, 'ACCEPTED');
    });
    await t.test('active simultaneous request cancellation remains safe and records one log', async () => {
      const c = await property(); const r = await request(c);
      let arrivals = 0, release; const ready = new Promise(resolve => { release = resolve; });
      const concurrent = loadProduction(hooked({ beforeLock: async () => { if (++arrivals === 2) release(); await ready; } }));
      const results = await Promise.all([concurrent.cancelRequest(r.id), concurrent.cancelRequest(r.id)]);
      assert.ok(results.every(x => x.success));
      assert.equal(await prisma.activityLog.count({ where: { maintenanceRequestId: r.id, action: 'Request cancelled' } }), 1);
    });
  } finally {
    currentUser = null;
    // Delete only exact UUID fixtures created by this test, never application data.
    await prisma.activityLog.deleteMany({ where: { propertyId: { in: propertyIds } } });
    await prisma.checklistItem.deleteMany({ where: { propertyId: { in: propertyIds } } });
    await prisma.invitation.deleteMany({ where: { propertyId: { in: propertyIds } } });
    await prisma.maintenanceRequest.deleteMany({ where: { propertyId: { in: propertyIds } } });
    await prisma.property.deleteMany({ where: { id: { in: propertyIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  }
});

test('delete control opens confirmation only, cancel does not mutate, and double confirm submits once', async () => {
  const source = fs.readFileSync(path.join(root, 'app/properties/[propertyId]/DeletePropertyButton.tsx'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  let cursor = 0, calls = 0, release;
  const state = [], navigation = [];
  const pending = new Promise(resolve => { release = resolve; });
  const hooks = {
    useState: initial => {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = value; }];
    },
    useRef: initial => {
      const index = cursor++;
      if (!(index in state)) state[index] = { current: initial };
      return state[index];
    },
  };
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  new Function('require', 'exports', code)(id => {
    if (id.endsWith('.module.css')) return new Proxy({}, { get: (_, key) => String(key) });
    if (id === 'react') return hooks;
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id === 'next/navigation') return { useRouter: () => ({ replace: url => navigation.push(url), refresh: () => navigation.push('refresh') }) };
    if (id === '@/app/actions/property') return { deleteProperty: async id => { assert.equal(id, 'test-property'); calls++; return pending; } };
    throw new Error('Unexpected UI import: ' + id);
  }, exports);
  function render() { cursor = 0; return exports.default({ propertyId: 'test-property' }); }
  function buttons(node) {
    if (Array.isArray(node)) return node.flatMap(buttons);
    if (!node || typeof node !== 'object') return [];
    return [...(node.type === 'button' ? [node] : []), ...buttons(node.props?.children)];
  }
  let controls = buttons(render()); assert.equal(controls.length, 1);
  controls[0].props.onClick(); assert.equal(calls, 0);
  controls = buttons(render()); assert.equal(controls.length, 2);
  controls[1].props.onClick(); assert.equal(calls, 0);
  controls = buttons(render()); assert.equal(controls.length, 1);
  controls[0].props.onClick(); controls = buttons(render());
  const first = controls[0].props.onClick(); const second = controls[0].props.onClick();
  assert.equal(calls, 1);
  assert.ok(buttons(render()).every(button => button.props.disabled));
  release({ success: true }); await Promise.all([first, second]);
  assert.deepEqual(navigation, ['/properties', 'refresh']);
});
