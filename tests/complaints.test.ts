// Tests the REAL exports of lib/store.tsx (not copies). Run with tsx + a fake window.localStorage.
import assert from 'node:assert/strict'
const mem = new Map<string, string>()
;(globalThis as any).window = { localStorage: {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => { mem.set(k, String(v)) },
  removeItem: (k: string) => { mem.delete(k) },
} }
import * as store from '../lib/store'
import { demoComplaints, demoNotifications } from '../lib/demo-data'
import { COMPLAINT_STATUSES, nextComplaintStatus } from '../lib/types'
const { initialState, advanceComplaint, markComplaintRead, createComplaint, migrateComplaints, loadSavedState, quarantineRecords, readQuarantine, QUARANTINE_KEY, nextTicketId } = store
let n = 0
const t = (name: string, fn: () => void) => { mem.clear(); fn(); n++; console.log('PASS', name) }
const T1 = '2026-11-22T10:00:00.000Z', T2 = '2026-11-22T10:05:00.000Z', T3 = '2026-11-22T10:10:00.000Z', T4 = '2026-11-22T10:15:00.000Z'
const find = (s: any, tid: string) => s.complaints.find((c: any) => c.ticketId === tid)

t('nextComplaintStatus: Submitted->Under Review->Resolved->null', () => {
  assert.equal(nextComplaintStatus('Submitted'), 'Under Review'); assert.equal(nextComplaintStatus('Under Review'), 'Resolved'); assert.equal(nextComplaintStatus('Resolved'), null)
  assert.equal(nextComplaintStatus('Nonsense' as any), null)
})
t('seed complaints all have location (string) and unreadCount (number)', () => {
  for (const c of demoComplaints) { assert.equal(typeof c.location, 'string'); assert.ok(c.location.length > 0); assert.equal(typeof c.unreadCount, 'number') }
})
t('createComplaint saves location, unreadCount 0, Submitted, 1 history event, unique ID, activity', () => {
  const s0 = initialState()
  const s1 = createComplaint(s0, { category: 'Other', location: 'Room 1', title: 'Projector broken', description: 'x'.repeat(30), attachmentName: null }, 'cmp-new', T1)
  const c = s1.complaints[0]
  assert.equal(c.location, 'Room 1'); assert.equal(c.unreadCount, 0); assert.equal(c.status, 'Submitted'); assert.equal(c.history.length, 1)
  assert.equal(c.history[0].date, T1); assert.equal(c.ticketId, 'DEMO-0160'); assert.equal(s1.complaints.length, s0.complaints.length + 1)
  assert.equal(s1.activity[0].title, 'Complaint submitted')
  const s2 = createComplaint(s1, { category: 'Other', location: 'Room 2', title: 'Another one', description: 'y'.repeat(30), attachmentName: null }, 'cmp-new2', T2)
  assert.equal(s2.complaints[0].ticketId, 'DEMO-0161')
})
t('advance: Submitted -> Under Review adds history, timestamps, unread, notification, activity', () => {
  let s = createComplaint(initialState(), { category: 'Other', location: 'Room 1', title: 'Projector broken', description: 'x'.repeat(30), attachmentName: null }, 'cmp-new', T1)
  const before = find(s, 'DEMO-0160'); const nNot = s.notifications.length; const nAct = s.activity.length
  s = advanceComplaint(s, 'cmp-new', T2)
  const c = find(s, 'DEMO-0160')
  assert.equal(c.status, 'Under Review'); assert.equal(c.updatedAt, T2); assert.equal(c.createdAt, T1); assert.equal(c.unreadCount, 1)
  assert.equal(c.history.length, 2); assert.deepEqual(c.history[0], before.history[0]); assert.equal(c.history[1].status, 'Under Review'); assert.equal(c.history[1].date, T2)
  assert.equal(c.ticketId, before.ticketId); assert.equal(c.id, before.id); assert.equal(c.location, 'Room 1')
  assert.equal(s.notifications.length, nNot + 1); const nt = s.notifications[0]
  assert.equal(nt.read, false); assert.equal(nt.href, '/complaints/DEMO-0160'); assert.match(nt.body, /DEMO-0160 moved to Under Review/)
  assert.equal(s.activity.length, Math.min(12, nAct + 1)); assert.equal(s.activity[0].title, 'Complaint status updated'); assert.match(s.activity[0].detail, /DEMO-0160 · Under Review/)
})
t('full flow on a new ticket: 2 advances -> Resolved, 3rd is a no-op', () => {
  let s = createComplaint(initialState(), { category: 'Other', location: 'L', title: 'Title here', description: 'z'.repeat(30), attachmentName: null }, 'c1', T1)
  s = advanceComplaint(s, 'c1', T2); s = advanceComplaint(s, 'c1', T3)
  assert.equal(find(s, 'DEMO-0160').status, 'Resolved'); assert.equal(find(s, 'DEMO-0160').history.length, 3)
  assert.deepEqual(find(s, 'DEMO-0160').history.map((h: any) => h.status), ['Submitted', 'Under Review', 'Resolved'])
  assert.equal(find(s, 'DEMO-0160').unreadCount, 2)
  const again = advanceComplaint(s, 'c1', T4)
  assert.equal(again, s, 'must return the very same state object')
})
t('advancing a seed that is already Resolved (DEMO-0128) is a no-op; others untouched', () => {
  const s = initialState(); const resolved = s.complaints.find((c: any) => c.status === 'Resolved')!
  assert.equal(advanceComplaint(s, resolved.id, T1), s)
})
t('advance does not touch other complaints and unknown id is a no-op', () => {
  const s = initialState(); const target = s.complaints.find((c: any) => c.status !== 'Resolved')!
  const s2 = advanceComplaint(s, target.id, T1)
  for (const c of s.complaints) if (c.id !== target.id) assert.equal(s2.complaints.find((x: any) => x.id === c.id), c)
  assert.equal(advanceComplaint(s, 'does-not-exist', T1), s)
})
t('notification preference off: history/unread/activity still recorded, no notification', () => {
  const s0 = initialState(); const s = { ...s0, notificationPrefs: { ...s0.notificationPrefs, complaintUpdates: false } }
  const target = s.complaints.find((c: any) => c.status !== 'Resolved')!
  const s2 = advanceComplaint(s, target.id, T1)
  assert.equal(s2.notifications.length, s.notifications.length); assert.equal(s2.complaints.find((c: any) => c.id === target.id)!.unreadCount, target.unreadCount + 1)
  assert.equal(s2.activity[0].title, 'Complaint status updated')
})
t('caps: notifications <= 30 and activity <= 12 after many changes', () => {
  let s = initialState()
  for (let i = 0; i < 40; i++) { s = createComplaint(s, { category: 'Other', location: 'L', title: 'Title ' + i, description: 'q'.repeat(30), attachmentName: null }, 'k' + i, T1); s = advanceComplaint(s, 'k' + i, T2) }
  assert.ok(s.notifications.length <= 30); assert.ok(s.activity.length <= 12)
})
t('markComplaintRead: resets counter and ONLY that complaint\'s notifications (seed DEMO-0141)', () => {
  const s = initialState(); const c = find(s, 'DEMO-0141'); assert.equal(c.unreadCount, 1)
  const unreadBefore = s.notifications.filter((x: any) => !x.read).length
  const s2 = markComplaintRead(s, c.id)
  assert.equal(find(s2, 'DEMO-0141').unreadCount, 0)
  assert.equal(s2.notifications.find((x: any) => x.href === '/complaints/DEMO-0141')!.read, true)
  assert.equal(s2.notifications.filter((x: any) => !x.read).length, unreadBefore - 1)   // other unread notification untouched
})
t('markComplaintRead: no change -> same state reference (no render loop)', () => {
  const s = markComplaintRead(initialState(), find(initialState(), 'DEMO-0141').id)
  assert.equal(markComplaintRead(s, find(s, 'DEMO-0141').id), s)
  assert.equal(markComplaintRead(s, 'nope'), s)
})
t('markComplaintRead also matches legacy notification links that used the internal id', () => {
  const s0 = initialState(); const c = find(s0, 'DEMO-0152')
  const s = { ...s0, notifications: [{ id: 'old', title: 't', body: 'b', date: T1, read: false, href: '/complaints/cmp-3' }, ...s0.notifications] }
  const s2 = markComplaintRead(s, c.id); assert.equal(s2.notifications[0].read, true)
})
t('advance then open: unread +1 then read -> 0, notification read', () => {
  let s = advanceComplaint(initialState(), find(initialState(), 'DEMO-0152').id, T1)
  assert.equal(find(s, 'DEMO-0152').unreadCount, 1)
  s = markComplaintRead(s, find(s, 'DEMO-0152').id)
  assert.equal(find(s, 'DEMO-0152').unreadCount, 0); assert.ok(!s.notifications.some((x: any) => x.href === '/complaints/DEMO-0152' && !x.read))
})
t('migration: old complaint (no location/unreadCount, In Progress) keeps ID/history/dates, gains defaults', () => {
  const old = { id: 'x1', ticketId: 'SSC-2026-0165', category: 'Other', title: 'Old one', description: 'd'.repeat(25), status: 'In Progress', createdAt: '2026-11-01T08:00:00+05:00', updatedAt: '2026-11-02T08:00:00+05:00', attachmentName: null, isDemo: false,
    history: [{ status: 'Submitted', date: '2026-11-01T08:00:00+05:00', note: 'a' }, { status: 'In Progress', date: '2026-11-02T08:00:00+05:00', note: 'b' }] }
  const { complaints, skipped } = migrateComplaints([old])
  assert.equal(skipped.length, 0); const c = complaints[0]
  assert.equal(c.ticketId, 'SSC-2026-0165'); assert.equal(c.location, ''); assert.equal(c.unreadCount, 0); assert.equal(c.status, 'Under Review')
  assert.deepEqual(c.history.map((h: any) => h.date), old.history.map((h) => h.date)); assert.equal(c.history.length, 2)
  assert.equal(nextTicketId([c]), 'DEMO-0166')
  assert.equal(advanceComplaint({ ...initialState(), complaints: [c] }, 'x1', T1).complaints[0].status, 'Resolved')
})
t('migration: bad unreadCount values -> 0; good values kept', () => {
  const base = { id: 'x', ticketId: 'DEMO-1', category: 'Other', title: 'T', description: 'd', status: 'Submitted', createdAt: T1, updatedAt: T1, attachmentName: null, isDemo: false, history: [] }
  const r = migrateComplaints([{ ...base, unreadCount: -3 }, { ...base, id: 'y', unreadCount: NaN }, { ...base, id: 'z', unreadCount: '5' }, { ...base, id: 'w', unreadCount: 3 }, { ...base, id: 'v', unreadCount: 2.9 }])
  assert.deepEqual(r.complaints.map((c: any) => c.unreadCount), [0, 0, 0, 3, 2])
})
t('migration reports skipped records (not silent) and keeps the valid ones', () => {
  const good = { id: 'g', ticketId: 'DEMO-9', category: 'Other', title: 'T', description: 'd', status: 'Submitted', createdAt: T1, updatedAt: T1, attachmentName: null, isDemo: false, history: [] }
  const bad1 = { id: 'b1', title: 'no ticket id' }, bad2 = { ...good, id: 'b2', createdAt: 'garbage' }
  const r = migrateComplaints([bad1, good, null, 'str', bad2])
  assert.equal(r.complaints.length, 1); assert.equal(r.skipped.length, 4); assert.deepEqual(r.skipped[0], bad1)
})
t('loadSavedState: full round trip of an old v1 save (migrates, reports skipped, defaults for new fields)', () => {
  const s = initialState()
  const oldComplaints = [
    { id: 'o1', ticketId: 'SSC-2026-0170', category: 'Other', title: 'Saved earlier', description: 'd'.repeat(25), status: 'In Progress', createdAt: T1, updatedAt: T2, attachmentName: null, isDemo: false, history: [{ status: 'In Progress', date: T2, note: 'n' }] },
    { broken: true },
  ]
  mem.set('ssuet-smart-campus-demo', JSON.stringify({ version: 1, state: { ...s, isAuthed: true, complaints: oldComplaints } }))
  const loaded = loadSavedState()!
  assert.equal(loaded.state.isAuthed, true); assert.equal(loaded.state.complaints.length, 1); assert.equal(loaded.skipped.length, 1)
  const c = loaded.state.complaints[0]; assert.equal(c.status, 'Under Review'); assert.equal(c.location, ''); assert.equal(c.unreadCount, 0); assert.equal(c.ticketId, 'SSC-2026-0170')
})
t('loadSavedState: fresh browser -> null; corrupt JSON -> null; wrong version -> null', () => {
  assert.equal(loadSavedState(), null)
  mem.set('ssuet-smart-campus-demo', '{not json'); assert.equal(loadSavedState(), null)
  mem.set('ssuet-smart-campus-demo', JSON.stringify({ version: 99, state: {} })); assert.equal(loadSavedState(), null)
})
t('quarantine: stores records, ignores duplicates (StrictMode double-run), caps at 20, survives corrupt storage', () => {
  assert.equal(quarantineRecords([{ a: 1 }, { b: 2 }]), 2)
  assert.equal(quarantineRecords([{ a: 1 }]), 2, 'duplicate must not be added twice')
  assert.equal(readQuarantine().length, 2)
  const stored = JSON.parse(mem.get(QUARANTINE_KEY)!); assert.deepEqual(stored[0].record, { a: 1 }); assert.ok(typeof stored[0].skippedAt === 'string')
  const many = Array.from({ length: 30 }, (_, i) => ({ i })); assert.equal(quarantineRecords(many), 20)
  mem.set(QUARANTINE_KEY, '{oops'); assert.deepEqual(readQuarantine(), []); assert.equal(quarantineRecords([{ z: 1 }]), 1)
})
console.log(`\n${n} checks passed`)
