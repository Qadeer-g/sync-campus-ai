import assert from 'node:assert/strict'
const mem = new Map<string, string>()
;(globalThis as any).window = { localStorage: {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => { mem.set(k, String(v)) },
  removeItem: (k: string) => { mem.delete(k) },
} }
import * as S from '../lib/store'
import * as AT from '../lib/attendance'
import { demoAttendance, teacherClasses, QR_DURATIONS } from '../lib/demo-data'
import { formatDateTime, formatCountdown } from '../lib/format'
const { initialState, saveSubject, deleteSubject, syncAdvisorNotification, ADVISOR_NOTIFICATION_ID, loadSavedState, saveState, openSession, renewSession, closeSession,
  addDemoStudentCheckIn, attemptCheckIn, migrateSession, migrateAttendance, quarantineRecords, readQuarantine, ATTENDANCE_QUARANTINE_KEY } = S
let n = 0
const t = (name: string, fn: () => void) => { mem.clear(); fn(); n++; console.log('PASS', name) }
const T = '2026-11-22T10:00:00.000Z'
const NOW = 1_800_000_000_000
const cls = { code: teacherClasses[0].code, name: teacherClasses[0].name, section: teacherClasses[0].section, room: teacherClasses[0].room }
const advisor = (s: any) => s.notifications.find((x: any) => x.id === ADVISOR_NOTIFICATION_ID)
const withSession = (min = 5, now = NOW) => openSession(initialState(), cls, min, now)
const qr = (s: any, now = NOW + 1000) => attemptCheckIn(s, { code: s.session.token, method: 'QR scan' }, now)
const pin = (s: any, now = NOW + 1000) => attemptCheckIn(s, { code: s.session.token, pin: s.session.pin, method: 'Backup PIN' }, now)

/* ================= Part 1: stale advisor notification fix ================= */
t('seed: no fixed-text "below 50%" alert; one derived advisor alert reflecting CURRENT marks (Subject 3 at 44%)', () => {
  const s = initialState()
  assert.ok(!s.notifications.some((x) => x.id === 'ntf-2')); assert.ok(!s.notifications.some((x) => /below 50%/.test(x.body)))
  const a = advisor(s); assert.equal(a.body, 'Subject 3 is at 44%, below the 60% target. 1 other subject is also below target. View your study plan.')
  assert.equal(a.read, false); assert.equal(a.href, '/advisor/recommendations'); assert.deepEqual(initialState().notifications, s.notifications, 'deterministic for SSR')
})
t('editing Subject 3: alert always reflects the CURRENT weakest subject; no stale 44% anywhere', () => {
  let s = initialState(); s = saveSubject(s, { ...s.subjects[2], obtained: 50 }, T)           // still weakest, now 50%
  assert.match(advisor(s).body, /^Subject 3 is at 50%, below the 60% target\. 1 other subject is also below target/); assert.ok(!s.notifications.some((x) => /44%/.test(x.body)))
  s = saveSubject(s, { ...s.subjects[2], obtained: 58 }, T)                                 // Subject 2 (52%) is now weakest
  assert.match(advisor(s).body, /^Subject 2 is at 52%.*1 other subject is also below target/); assert.ok(!s.notifications.some((x) => /Subject 3 is at/.test(x.body)))
})
t('Subject 3 fixed to 70: weakest becomes Subject 2 (52%); alert changes and returns as unread', () => {
  let s = initialState(); s = { ...s, notifications: s.notifications.map((x) => ({ ...x, read: true })) }
  s = saveSubject(s, { ...s.subjects[2], obtained: 70 }, T)
  const a = advisor(s); assert.equal(a.body, 'Subject 2 is at 52%, below the 60% target. View your study plan.'); assert.equal(a.read, false); assert.equal(s.notifications[0].id, ADVISOR_NOTIFICATION_ID)
})
t('no weak subjects -> alert removed; weak again -> alert back; deleting the weakest updates it', () => {
  let s = initialState(); s = saveSubject(s, { ...s.subjects[2], obtained: 70 }, T); s = saveSubject(s, { ...s.subjects[1], obtained: 75 }, T)
  assert.equal(advisor(s), undefined)
  s = saveSubject(s, { ...s.subjects[0], obtained: 40 }, T); assert.match(advisor(s).body, /^Subject 1 is at 40%/)
  s = deleteSubject(s, 'sub-1', T); assert.equal(advisor(s), undefined)
})
t('a READ alert stays read while its text is unchanged (unrelated edit), same object', () => {
  let s = initialState(); s = { ...s, notifications: s.notifications.map((x) => (x.id === ADVISOR_NOTIFICATION_ID ? { ...x, read: true } : x)) }
  const before = advisor(s); s = saveSubject(s, { ...s.subjects[0], obtained: 80 }, T)
  assert.equal(advisor(s).read, true); assert.equal(advisor(s), before)
})
t('sync is idempotent (same reference when nothing changes)', () => { const s = initialState(); assert.equal(syncAdvisorNotification(s, T), s) })
t('"advisor tips" preference off -> no alert; back on -> alert returns', () => {
  const s0 = initialState(); const off = syncAdvisorNotification({ ...s0, notificationPrefs: { ...s0.notificationPrefs, advisorTips: false } }, T)
  assert.equal(advisor(off), undefined); assert.ok(advisor(syncAdvisorNotification({ ...off, notificationPrefs: { ...off.notificationPrefs, advisorTips: true } }, T)))
})
t('loading OLD saved data with the stale fixed alert after marks changed: stale alert replaced by a current one', () => {
  const s = initialState(); const staleSaved = { ...s, subjects: s.subjects.map((x) => (x.id === 'sub-3' ? { ...x, obtained: 75 } : x)),
    notifications: [{ id: 'ntf-2', title: 'Advisor insight', body: 'Subject 3 is below 50%. View your study plan.', date: T, read: true, href: '/advisor/recommendations' }, ...s.notifications.filter((x) => x.id !== ADVISOR_NOTIFICATION_ID)] }
  mem.set('ssuet-smart-campus-demo', JSON.stringify({ version: 1, state: staleSaved }))
  const l = loadSavedState()!; assert.ok(!l.state.notifications.some((x) => x.id === 'ntf-2')); assert.ok(!l.state.notifications.some((x) => /below 50%/.test(x.body)))
  assert.match(advisor(l.state).body, /^Subject 2 is at 52%/)
})
t('loading saved data whose alert already matches keeps its read flag', () => {
  let s = initialState(); s = { ...s, notifications: s.notifications.map((x) => (x.id === ADVISOR_NOTIFICATION_ID ? { ...x, read: true } : x)) }; saveState(s)
  assert.equal(advisor(loadSavedState()!.state).read, true)
})

/* ================= Part 2: QR attendance helpers ================= */
t('session code: 8 chars, no look-alikes (0/O/1/I/L), unique across 300; PIN 6 digits, no leading zero', () => {
  const seen = new Set<string>(); for (let i = 0; i < 300; i++) { const c = AT.generateToken(); assert.match(c, /^[A-HJ-KM-NP-Z2-9]{8}$/); seen.add(c); assert.match(AT.generatePin(), /^[1-9]\d{5}$/) }
  assert.ok(seen.size > 295)
})
t('normalise/format: "abcd-efgh", " ABCD EFGH ", "ABCDEFGH" all equal; display ABCD-EFGH', () => {
  for (const v of ['abcd-efgh', ' ABCD EFGH ', 'ABCDEFGH']) assert.equal(AT.normalizeToken(v), 'ABCDEFGH')
  assert.equal(AT.formatToken('ABCDEFGH'), 'ABCD-EFGH')
})
t('QR payload round-trips; non-demo / malformed QR text is rejected', () => {
  assert.equal(AT.parseQrPayload(AT.qrPayload('ABCDEFGH')), 'ABCDEFGH'); assert.equal(AT.parseQrPayload('  ' + AT.qrPayload('ABCDEFGH') + '\n'), 'ABCDEFGH')
  for (const bad of ['', 'https://example.com', 'ABCDEFGH', 'SMARTCAMPUS-DEMO-ATT:', 'SMARTCAMPUS-DEMO-ATT:ABC', 'smartcampus-demo-att:ABCDEFGH', 'SMARTCAMPUS-DEMO-ATT:ABCDEFGHJ']) assert.equal(AT.parseQrPayload(bad), null, bad)
  assert.ok(!AT.qrPayload('ABCDEFGH').includes('PIN'), 'PIN is not in the QR')
})
t('expiry boundary: 1 ms before = active, at expiresAt = expired; remainingMs; countdown text', () => {
  const s = withSession(2); const ses = s.session!
  assert.equal(AT.isExpired(ses, ses.expiresAt - 1), false); assert.equal(AT.isExpired(ses, ses.expiresAt), true)
  assert.equal(AT.remainingMs(ses, NOW), 120_000); assert.equal(AT.remainingMs(ses, ses.expiresAt + 5000), 0); assert.equal(formatCountdown(120_000), '02:00')
})

/* ================= Part 3: teacher actions ================= */
t('openSession: all five expiry options (1,2,3,5,10 min) set the right expiry, session code + 6-digit PIN present', () => {
  assert.deepEqual([...QR_DURATIONS], [1, 2, 3, 5, 10])
  for (const d of QR_DURATIONS) { const ses = withSession(d).session!; assert.equal(ses.expiresAt - ses.createdAt, d * 60_000); assert.equal(ses.durationMin, d); assert.match(ses.token, /^[A-Z2-9]{8}$/); assert.match(ses.pin, /^\d{6}$/); assert.deepEqual(ses.checkIns, []); assert.equal(ses.subjectName, 'Subject 5') }
})
t('openSession rejects other durations (0, 4, -1, NaN) and leaves state unchanged', () => {
  const s = initialState(); for (const d of [0, 4, -1, NaN, 11]) assert.equal(openSession(s, cls, d, NOW), s)
})
t('opening a new session replaces the old one (new id/code, empty roster)', () => {
  const a = pin(withSession()).state; const b = openSession(a, cls, 5, NOW + 5)
  assert.notEqual(b.session!.id, a.session!.id); assert.equal(b.session!.checkIns.length, 0); assert.equal(b.attendance.length, a.attendance.length)
})
t('regenerate: same session id and roster, new code + PIN + fresh window; old code stops working', () => {
  const a = qr(withSession(1)).state; const old = a.session!
  const b = renewSession(a, 10, NOW + 90_000)
  assert.equal(b.session!.id, old.id); assert.deepEqual(b.session!.checkIns, old.checkIns); assert.notEqual(b.session!.token, old.token); assert.notEqual(b.session!.pin, old.pin)
  assert.equal(b.session!.expiresAt, NOW + 90_000 + 600_000); assert.equal(b.session!.durationMin, 10)
  assert.equal(attemptCheckIn(b, { code: old.token, method: 'QR scan' }, NOW + 91_000).result.kind, 'invalid-code')
})
t('regenerate an EXPIRED session: new QR works again for a student who has not checked in', () => {
  const s = withSession(1); const late = NOW + 61_000
  assert.equal(qr(s, late).result.kind, 'expired')
  const r = renewSession(s, 3, late); assert.equal(qr(r, late + 1000).result.kind, 'success')
})
t('regenerate: no session or bad duration is a no-op', () => { const s = initialState(); assert.equal(renewSession(s, 5, NOW), s); const w = withSession(); assert.equal(renewSession(w, 7, NOW), w) })
t('reset (closeSession): live session and roster removed, student history kept; second reset no-op', () => {
  const a = qr(withSession()).state; const b = closeSession(a)
  assert.equal(b.session, null); assert.equal(b.attendance.length, a.attendance.length); assert.equal(closeSession(b), b)
  assert.equal(attemptCheckIn(b, { code: 'ABCDEFGH', method: 'QR scan' }, NOW).result.kind, 'no-session')
})

/* ================= Part 4: student check-in validation ================= */
t('QR scan success: record + roster entry + activity + notification, all consistent', () => {
  const s0 = withSession(); const { state: s, result } = qr(s0)
  assert.equal(result.kind, 'success'); if (result.kind === 'success') { assert.equal(result.subjectName, 'Subject 5'); assert.equal(result.subjectCode, 'SUB-05') }
  const rec = s.attendance[0]; assert.equal(rec.sessionId, s0.session!.id); assert.equal(rec.method, 'QR scan'); assert.equal(rec.isDemo, false); assert.equal(s.attendance.length, demoAttendance.length + 1)
  assert.deepEqual(s.session!.checkIns.map((c) => [c.studentName, c.studentKey, c.method]), [['Demo Student', 'DEMO-0001', 'QR scan']])
  assert.equal(s.activity[0].title, 'Attendance marked'); assert.equal(s.notifications[0].title, 'Attendance recorded'); assert.equal(s.notifications[0].read, false)
})
t('manual code + PIN success (method "Backup PIN"); lowercase/hyphenated code and padded PIN accepted', () => {
  const s0 = withSession(); const code = AT.formatToken(s0.session!.token).toLowerCase()
  const { state, result } = attemptCheckIn(s0, { code, pin: ` ${s0.session!.pin} `, method: 'Backup PIN' }, NOW + 1)
  assert.equal(result.kind, 'success'); assert.equal(state.attendance[0].method, 'Backup PIN')
})
t('wrong PIN -> invalid-pin, nothing changes (same state object)', () => {
  const s = withSession(); const wrong = String((Number(s.session!.pin) % 900000) + 100000)
  for (const p of [wrong, '', '12345', 'abcdef']) { const r = attemptCheckIn(s, { code: s.session!.token, pin: p, method: 'Backup PIN' }, NOW + 1); assert.equal(r.result.kind, 'invalid-pin'); assert.equal(r.state, s) }
})
t('PIN is not required for a QR scan (QR already proves the code), but a wrong code still fails', () => {
  const s = withSession(); assert.equal(attemptCheckIn(s, { code: 'ZZZZZZZZ', method: 'QR scan' }, NOW + 1).result.kind, 'invalid-code')
})
t('invalid session code -> invalid-code, no change', () => { const s = withSession(); const r = attemptCheckIn(s, { code: 'WRONGCOD', pin: s.session!.pin, method: 'Backup PIN' }, NOW + 1); assert.equal(r.result.kind, 'invalid-code'); assert.equal(r.state, s) })
t('no session open -> no-session', () => assert.equal(attemptCheckIn(initialState(), { code: 'ABCDEFGH', method: 'QR scan' }, NOW).result.kind, 'no-session'))
t('expired (exactly at expiry and later) -> expired for both QR and manual; no change', () => {
  const s = withSession(1); const at = s.session!.expiresAt
  for (const when of [at, at + 1, at + 600_000]) { for (const r of [qr(s, when), pin(s, when)]) { assert.equal(r.result.kind, 'expired'); assert.equal(r.state, s) } }
  assert.equal(qr(s, at - 1).result.kind, 'success')
})
t('check order: wrong code beats expired; expired beats wrong PIN; wrong PIN beats duplicate', () => {
  const s = withSession(1); const late = s.session!.expiresAt + 1
  assert.equal(attemptCheckIn(s, { code: 'WRONGCOD', method: 'QR scan' }, late).result.kind, 'invalid-code')
  assert.equal(attemptCheckIn(s, { code: s.session!.token, pin: '000000', method: 'Backup PIN' }, late).result.kind, 'expired')
  const done = qr(s).state; assert.equal(attemptCheckIn(done, { code: done.session!.token, pin: '000000', method: 'Backup PIN' }, NOW + 2000).result.kind, 'invalid-pin')
})
t('DUPLICATE: second attempt (QR then QR, QR then PIN, PIN then QR) -> duplicate, no second record', () => {
  for (const [first, second] of [[qr, qr], [qr, pin], [pin, qr], [pin, pin]] as const) {
    const a = first(withSession()).state; const b = second(a, NOW + 5000)
    assert.equal(b.result.kind, 'duplicate'); assert.equal(b.state, a); assert.equal(a.attendance.filter((x) => x.sessionId === a.session!.id).length, 1); assert.equal(a.session!.checkIns.length, 1)
  }
})
t('duplicate stays blocked after the teacher regenerates the QR (same session); old code invalid, new code -> duplicate', () => {
  const a = qr(withSession(1)).state; const b = renewSession(a, 5, NOW + 70_000)
  assert.equal(attemptCheckIn(b, { code: b.session!.token, method: 'QR scan' }, NOW + 71_000).result.kind, 'duplicate')
  assert.equal(attemptCheckIn(b, { code: a.session!.token, method: 'QR scan' }, NOW + 71_000).result.kind, 'invalid-code')
})
t('after a teacher RESET + new session the student can mark again; old history stays', () => {
  const a = qr(withSession()).state; const b = openSession(closeSession(a), cls, 5, NOW + 10_000); const c = qr(b, NOW + 11_000)
  assert.equal(c.result.kind, 'success'); assert.equal(c.state.attendance.length, a.attendance.length + 1); assert.deepEqual(c.state.attendance.slice(1), a.attendance)
})
t('attendanceAlerts pref off: record + activity still saved, no notification', () => {
  const s0 = withSession(); const s1 = { ...s0, notificationPrefs: { ...s0.notificationPrefs, attendanceAlerts: false } }
  const r = qr(s1); assert.equal(r.result.kind, 'success'); assert.equal(r.state.notifications.length, s1.notifications.length); assert.equal(r.state.attendance.length, s1.attendance.length + 1)
})

/* ================= Part 5: teacher roster ================= */
t('demo roster: "Demo Student 2", "3", ... marked Simulated; real check-in appears alongside; no real attendance record for sims', () => {
  let s = withSession(); s = addDemoStudentCheckIn(s, NOW + 1); s = addDemoStudentCheckIn(s, NOW + 2); s = qr(s, NOW + 3).state
  assert.deepEqual(s.session!.checkIns.map((c) => c.studentName), ['Demo Student 2', 'Demo Student 3', 'Demo Student']); assert.deepEqual(s.session!.checkIns.map((c) => c.method), ['Simulated', 'Simulated', 'QR scan'])
  assert.equal(s.attendance.length, demoAttendance.length + 1)
})
t('demo roster: not possible after expiry or without a session (same state object)', () => {
  const s = withSession(1); assert.equal(addDemoStudentCheckIn(s, s.session!.expiresAt), s); const e = initialState(); assert.equal(addDemoStudentCheckIn(e, NOW), e)
})
t('roster blocks a duplicate by student key even if the history list lacks the record', () => {
  const a = qr(withSession()).state; const stripped = { ...a, attendance: demoAttendance }
  assert.equal(attemptCheckIn(stripped, { code: a.session!.token, method: 'QR scan' }, NOW + 9000).result.kind, 'duplicate')
})

/* ================= Part 6: persistence & robustness ================= */
t('session, roster and attendance persist through save -> load; logout -> login keeps them', () => {
  let s = addDemoStudentCheckIn(withSession(10), NOW + 1); s = qr(s, NOW + 2).state; s = { ...s, isAuthed: true }; saveState(s)
  let l = loadSavedState()!; assert.deepEqual(l.state.session, s.session); assert.deepEqual(l.state.attendance, s.attendance); assert.equal(l.skippedAttendance.length, 0)
  s = { ...l.state, isAuthed: false }; saveState(s); l = loadSavedState()!; assert.deepEqual(l.state.session, s.session)
  s = { ...l.state, isAuthed: true }; saveState(s); l = loadSavedState()!; assert.equal(l.state.session!.checkIns.length, 2); assert.equal(l.state.attendance[0].method, 'QR scan')
})
t('countdown survives a refresh: remaining time is derived from the saved expiry timestamp', () => {
  const s = withSession(5); saveState(s); const l = loadSavedState()!.state.session!
  assert.equal(AT.remainingMs(l, NOW + 100_000), 200_000); assert.equal(AT.isExpired(l, NOW + 300_000), true)
})
t('a session that expired while the app was closed loads as expired (not silently deleted)', () => {
  saveState(withSession(1)); const l = loadSavedState()!.state.session!; assert.equal(AT.isExpired(l, NOW + 3_600_000), true)
})
t('migrateSession: valid kept; missing checkIns -> []; bad PIN/types -> null; bad roster entries dropped', () => {
  const good = withSession().session! as any; const { checkIns, ...noRoster } = good
  assert.deepEqual(migrateSession(noRoster)!.checkIns, []); assert.deepEqual(migrateSession(good), good)
  for (const bad of [{ ...good, pin: 'abc' }, { ...good, pin: '12345' }, { ...good, expiresAt: 'x' }, { ...good, id: 5 }, { ...good, token: '' }, { ...good, room: undefined }]) assert.equal(migrateSession(bad), null)
  assert.equal(migrateSession({ ...good, checkIns: [{ id: 'a' }, null, 7, { id: 'c', studentKey: 'k', studentName: 'n', checkedInAt: 'bad', method: 'QR scan' }, { id: 'ok', studentKey: 'k', studentName: 'n', checkedInAt: T, method: 'QR scan' }] })!.checkIns.length, 1)
})
t('migrateAttendance: seeds are valid and unchanged; bad records skipped and reported', () => {
  assert.deepEqual(migrateAttendance(demoAttendance).records, demoAttendance)
  const r = migrateAttendance([...demoAttendance, null, { id: 'x' }, { ...demoAttendance[0], markedAt: 'nope' }, { ...demoAttendance[0], method: 'Telepathy' }]); assert.equal(r.records.length, 3); assert.equal(r.skipped.length, 4)
})
t('loadSavedState: corrupt session and bad attendance record are skipped + reported; no loaded date can crash the Dashboard formatter', () => {
  const s = initialState(); mem.set('ssuet-smart-campus-demo', JSON.stringify({ version: 1, state: { ...s, session: { id: 'x', pin: 'zz' }, attendance: [...s.attendance, { ...s.attendance[0], id: 'bad', markedAt: 'garbage' }] } }))
  const l = loadSavedState()!; assert.equal(l.state.session, null); assert.equal(l.skippedAttendance.length, 2); assert.equal(l.state.attendance.length, 3)
  for (const r of l.state.attendance) assert.doesNotThrow(() => formatDateTime(r.markedAt))
})
t('old saved shape (with removed "sessionScans", session without roster) still loads', () => {
  const s = withSession(); const { checkIns, ...legacySession } = s.session as any
  mem.set('ssuet-smart-campus-demo', JSON.stringify({ version: 1, state: { ...s, sessionScans: 4, session: legacySession } }))
  const l = loadSavedState()!; assert.deepEqual(l.state.session!.checkIns, []); assert.equal((l.state as any).sessionScans, undefined)
})
t('attendance quarantine uses its own key, de-duplicated', () => {
  assert.equal(quarantineRecords([{ a: 1 }], ATTENDANCE_QUARANTINE_KEY), 1); assert.equal(quarantineRecords([{ a: 1 }], ATTENDANCE_QUARANTINE_KEY), 1); assert.equal(readQuarantine().length, 0)
})
t('every result kind has a distinct, non-empty message; success names the subject', () => {
  const kinds = ['no-session', 'invalid-code', 'invalid-qr', 'expired', 'invalid-pin', 'duplicate'] as const
  const msgs = kinds.map((k) => AT.resultMessage({ kind: k })); assert.ok(msgs.every((m) => m.length > 10)); assert.equal(new Set(msgs).size, kinds.length)
  assert.match(AT.resultMessage({ kind: 'success', subjectName: 'Subject 5', subjectCode: 'SUB-05', markedAt: T }), /Subject 5 \(SUB-05\)/)
})
console.log(`\n${n} checks passed`)
