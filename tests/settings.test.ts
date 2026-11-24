import assert from 'node:assert/strict'
const mem = new Map<string, string>()
;(globalThis as any).window = { localStorage: {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => { mem.set(k, String(v)) },
  removeItem: (k: string) => { mem.delete(k) },
} }
import * as S from '../lib/store'
import { demoSubjects, demoComplaints, demoAttendance, demoProfile, defaultNotificationPrefs, teacherClasses } from '../lib/demo-data'
const { initialState, saveProfile, migrateProfile, notificationCategory, isNotificationEnabled, visibleNotifications, markAllRead, resetDemo, clearQuarantine,
  saveState, loadSavedState, saveSubject, createComplaint, advanceComplaint, openSession, attemptCheckIn, syncAdvisorNotification, ADVISOR_NOTIFICATION_ID,
  quarantineRecords, QUARANTINE_KEY, SUBJECT_QUARANTINE_KEY, ATTENDANCE_QUARANTINE_KEY } = S
let n = 0
const t = (name: string, fn: () => void) => { mem.clear(); fn(); n++; console.log('PASS', name) }
const T = '2026-11-22T10:00:00.000Z'; const NOW = 1_800_000_000_000
const cls = { code: teacherClasses[0].code, name: teacherClasses[0].name, section: teacherClasses[0].section, room: teacherClasses[0].room }
const prefs = (s: any, p: any) => ({ ...s, notificationPrefs: { ...s.notificationPrefs, ...p } })

/* ---------- Profile ---------- */
t('default profile is the neutral Demo Student', () => {
  const p = initialState().profile; assert.equal(p.name, 'Demo Student'); assert.equal(p.studentId, 'DEMO-0001'); assert.equal(p.email, 'demo.student@example.com')
})
t('saveProfile updates every editable field, trims values, logs which fields changed', () => {
  const s = saveProfile(initialState(), { name: '  Sample Learner ', email: ' sample@example.com', phone: '+00 111 222', department: 'Computer Science', program: 'Demo Program B', semester: 'Demo Semester 2', batch: 'Demo Batch 9', studentId: 'DEMO-0042' }, T)
  assert.deepEqual(s.profile, { name: 'Sample Learner', studentId: 'DEMO-0042', email: 'sample@example.com', phone: '+00 111 222', department: 'Computer Science', program: 'Demo Program B', semester: 'Demo Semester 2', batch: 'Demo Batch 9', avatarUrl: null })
  assert.equal(s.activity[0].title, 'Profile updated'); assert.equal(s.activity[0].detail, 'Name, Demo ID, Email, Phone, Department, Program, Semester, Batch'); assert.equal(s.activity[0].kind, 'profile')
})
t('saveProfile with only one change logs only that field; other fields untouched', () => {
  const s0 = initialState(); const s = saveProfile(s0, { email: 'other@example.com' }, T)
  assert.equal(s.profile.email, 'other@example.com'); assert.equal(s.profile.name, s0.profile.name); assert.equal(s.activity[0].detail, 'Email'); assert.equal(s.activity.length, s0.activity.length + 1)
})
t('saveProfile with no real change (same values / only whitespace) -> same state object, no activity', () => {
  const s0 = initialState(); assert.equal(saveProfile(s0, { name: s0.profile.name }, T), s0); assert.equal(saveProfile(s0, { name: `  ${s0.profile.name}  `, email: s0.profile.email }, T), s0); assert.equal(saveProfile(s0, {}, T), s0)
})
t('profile edit does not change other data and does not mutate the previous state or the seed', () => {
  const s0 = initialState(); const s = saveProfile(s0, { name: 'Changed Name' }, T)
  assert.equal(s0.profile.name, 'Demo Student'); assert.equal(demoProfile.name, 'Demo Student'); assert.equal(s.subjects, s0.subjects); assert.equal(s.complaints, s0.complaints); assert.equal(s.attendance, s0.attendance)
})
t('profile edits survive refresh (save -> load) and logout -> login', () => {
  let s = { ...saveProfile(initialState(), { name: 'Sample Learner', email: 'sample@example.com', phone: '12345678' }, T), isAuthed: true }; saveState(s)
  let l = loadSavedState()!.state; assert.deepEqual(l.profile, s.profile)
  s = { ...l, isAuthed: false }; saveState(s); l = loadSavedState()!.state; assert.equal(l.profile.name, 'Sample Learner'); assert.equal(l.isAuthed, false)    // logout keeps profile
  s = { ...l, isAuthed: true }; saveState(s); l = loadSavedState()!.state; assert.equal(l.profile.email, 'sample@example.com'); assert.equal(l.isAuthed, true) // login keeps profile
})
t('migrateProfile: wrong-typed / empty / extra fields fall back to defaults; valid values kept', () => {
  const base = demoProfile
  assert.deepEqual(migrateProfile(null, base), base); assert.deepEqual(migrateProfile('x', base), base); assert.deepEqual(migrateProfile([], base), base)
  const p = migrateProfile({ name: 5, studentId: '   ', email: 7, phone: null, department: {}, program: 'P', semester: undefined, batch: 'B', avatarUrl: 3, extra: 'x' }, base)
  assert.equal(p.name, base.name); assert.equal(p.studentId, base.studentId); assert.equal(p.email, base.email); assert.equal(p.phone, base.phone); assert.equal(p.program, 'P'); assert.equal(p.semester, base.semester); assert.equal(p.batch, 'B'); assert.equal(p.avatarUrl, null); assert.ok(!('extra' in p))
  assert.equal(migrateProfile({ ...base, name: '   ' }, base).name, base.name)
})
t('loadSavedState with a corrupt saved profile: app still gets a usable profile', () => {
  const s = initialState(); mem.set('ssuet-smart-campus-demo', JSON.stringify({ version: 1, state: { ...s, profile: { name: 42, email: ['x'] } } }))
  const p = loadSavedState()!.state.profile; assert.equal(typeof p.name, 'string'); assert.equal(p.name, 'Demo Student')
})
t('profile edit never changes the attendance duplicate rule (history is keyed by session)', () => {
  let s = openSession(initialState(), cls, 5, NOW); s = attemptCheckIn(s, { code: s.session!.token, method: 'QR scan' }, NOW + 1).state
  s = saveProfile(s, { studentId: 'DEMO-9999', name: 'Someone Else' }, T)
  assert.equal(attemptCheckIn(s, { code: s.session!.token, method: 'QR scan' }, NOW + 2).result.kind, 'duplicate')
})

/* ---------- Theme ---------- */
t('theme persists (light/dark/system); an invalid saved theme falls back to light', () => {
  for (const theme of ['light', 'dark', 'system'] as const) { saveState({ ...initialState(), theme }); assert.equal(loadSavedState()!.state.theme, theme) }
  const s = initialState(); mem.set('ssuet-smart-campus-demo', JSON.stringify({ version: 1, state: { ...s, theme: 'purple' } })); assert.equal(loadSavedState()!.state.theme, 'light')
})

/* ---------- Notification preferences ---------- */
t('notification category is derived from where it links', () => {
  assert.equal(notificationCategory({ href: '/complaints/DEMO-0141' }), 'complaintUpdates'); assert.equal(notificationCategory({ href: '/attendance/student' }), 'attendanceAlerts')
  assert.equal(notificationCategory({ href: '/advisor/recommendations' }), 'advisorTips'); assert.equal(notificationCategory({ href: '/settings' }), null); assert.equal(notificationCategory({ href: '/Complaints/x' }), 'complaintUpdates')
})
t('complaint updates OFF: complaint notifications hidden, others visible; ON again: they come back', () => {
  const s = initialState(); const all = visibleNotifications(s).length
  const off = prefs(s, { complaintUpdates: false }); const vis = visibleNotifications(off)
  assert.ok(!vis.some((x) => x.href.startsWith('/complaints'))); assert.equal(vis.length, all - 1); assert.ok(vis.some((x) => x.href.startsWith('/attendance')) && vis.some((x) => x.href.startsWith('/advisor')))
  assert.equal(visibleNotifications(prefs(off, { complaintUpdates: true })).length, all); assert.equal(off.notifications.length, s.notifications.length, 'nothing is deleted')
})
t('attendance alerts OFF hides the attendance notification; advisor tips OFF removes the alert, ON restores it', () => {
  const s = initialState(); assert.ok(!visibleNotifications(prefs(s, { attendanceAlerts: false })).some((x) => x.href.startsWith('/attendance')))
  const off = syncAdvisorNotification(prefs(s, { advisorTips: false }), T); assert.ok(!off.notifications.some((x) => x.id === ADVISOR_NOTIFICATION_ID))
  const on = syncAdvisorNotification(prefs(off, { advisorTips: true }), T); assert.ok(on.notifications.some((x) => x.id === ADVISOR_NOTIFICATION_ID))
})
t('with a category OFF, new events of that kind create no notification (complaint status change, attendance check-in)', () => {
  let s = prefs(createComplaint(initialState(), { category: 'Other', location: 'L', title: 'Title here', description: 'z'.repeat(30), attachmentName: null }, 'c1', T), { complaintUpdates: false })
  const before = s.notifications.length; s = advanceComplaint(s, 'c1', T); assert.equal(s.notifications.length, before)
  let a = prefs(openSession(initialState(), cls, 5, NOW), { attendanceAlerts: false }); const nb = a.notifications.length
  a = attemptCheckIn(a, { code: a.session!.token, method: 'QR scan' }, NOW + 1).state; assert.equal(a.notifications.length, nb)
})
t('with a category ON, new events create exactly one unread notification of the right category', () => {
  let s = createComplaint(initialState(), { category: 'Other', location: 'L', title: 'Title here', description: 'z'.repeat(30), attachmentName: null }, 'c1', T); const before = visibleNotifications(s).length
  s = advanceComplaint(s, 'c1', T); assert.equal(visibleNotifications(s).length, before + 1); assert.equal(notificationCategory(s.notifications[0]), 'complaintUpdates'); assert.equal(s.notifications[0].read, false)
})
t('"mark all read" only marks VISIBLE notifications; hidden ones stay unread and are still unread when switched back on', () => {
  const off = prefs(initialState(), { complaintUpdates: false }); const marked = markAllRead(off)
  assert.ok(visibleNotifications(marked).every((x) => x.read)); assert.equal(marked.notifications.find((x) => x.href.startsWith('/complaints'))!.read, false)
  assert.equal(visibleNotifications(prefs(marked, { complaintUpdates: true })).filter((x) => !x.read).length, 1)
})
t('"mark all read" with nothing unread visible returns the same state object', () => { const a = markAllRead(initialState()); assert.equal(markAllRead(a), a) })
t('preferences persist through save -> load; the advisor alert is re-derived from them on load', () => {
  saveState(prefs(initialState(), { complaintUpdates: false, advisorTips: false, attendanceAlerts: true }))
  const l = loadSavedState()!.state; assert.deepEqual(l.notificationPrefs, { ...defaultNotificationPrefs, complaintUpdates: false, advisorTips: false }); assert.ok(!l.notifications.some((x) => x.id === ADVISOR_NOTIFICATION_ID))
})

/* ---------- Reset Demo Data ---------- */
const dirtyState = () => {
  let s = saveProfile({ ...initialState(), isAuthed: true, theme: 'dark' as const }, { name: 'Sample Learner', email: 'sample@example.com', phone: '12345678' }, T)
  s = saveSubject(s, { ...s.subjects[2], obtained: 90 }, T); s = saveSubject(s, { code: 'SUB-07', name: 'Subject 7', creditHours: 2, obtained: 10, total: 50 }, T)
  s = createComplaint(s, { category: 'Other', location: 'Room 1', title: 'Projector broken', description: 'x'.repeat(30), attachmentName: null }, 'cx', T); s = advanceComplaint(s, 'cx', T)
  s = openSession(s, cls, 5, NOW); s = attemptCheckIn(s, { code: s.session!.token, method: 'QR scan' }, NOW + 1).state
  s = { ...s, notificationPrefs: { ...s.notificationPrefs, complaintUpdates: false, advisorTips: false }, notifications: s.notifications.map((x) => ({ ...x, read: true })) }
  return s
}
t('resetDemo restores EVERYTHING to the clean default Demo Student state (only login + theme kept)', () => {
  const dirty = dirtyState(); assert.notDeepEqual(dirty.subjects, demoSubjects)
  const r = resetDemo(dirty); assert.deepEqual(r, { ...initialState(), isAuthed: true, theme: 'dark' })
  assert.equal(r.profile.name, 'Demo Student'); assert.deepEqual(r.subjects, demoSubjects); assert.deepEqual(r.complaints, demoComplaints); assert.deepEqual(r.attendance, demoAttendance)
  assert.equal(r.session, null); assert.deepEqual(r.notificationPrefs, defaultNotificationPrefs); assert.ok(r.notifications.some((x) => !x.read)); assert.equal(r.activity.length, initialState().activity.length)
  assert.ok(r.notifications.some((x) => x.id === ADVISOR_NOTIFICATION_ID), 'advisor alert is back with default prefs')
})
t('resetDemo keeps a logged-out state logged out and the chosen theme (light/dark/system)', () => {
  for (const theme of ['light', 'dark', 'system'] as const) for (const isAuthed of [true, false]) { const r = resetDemo({ ...dirtyState(), theme, isAuthed }); assert.equal(r.theme, theme); assert.equal(r.isAuthed, isAuthed) }
})
t('reset is idempotent and does not mutate the seed data or the previous state', () => {
  const dirty = dirtyState(); const snapshot = JSON.stringify(dirty); const r1 = resetDemo(dirty)
  assert.equal(JSON.stringify(dirty), snapshot); assert.deepEqual(resetDemo(r1), r1); assert.equal(demoSubjects.length, 6); assert.equal(demoSubjects[2].obtained, 44); assert.equal(demoProfile.name, 'Demo Student')
})
t('after reset + save + load the defaults persist (no leftover edited data), also after logout/login', () => {
  saveState(resetDemo(dirtyState())); let l = loadSavedState()!.state
  assert.equal(l.profile.name, 'Demo Student'); assert.deepEqual(l.subjects, demoSubjects); assert.deepEqual(l.complaints, demoComplaints); assert.equal(l.session, null); assert.deepEqual(l.attendance, demoAttendance)
  saveState({ ...l, isAuthed: false }); l = loadSavedState()!.state; saveState({ ...l, isAuthed: true }); assert.equal(loadSavedState()!.state.profile.name, 'Demo Student')
})
t('clearQuarantine removes ALL three skipped-record backups and nothing else', () => {
  quarantineRecords([{ c: 1 }], QUARANTINE_KEY); quarantineRecords([{ s: 1 }], SUBJECT_QUARANTINE_KEY); quarantineRecords([{ a: 1 }], ATTENDANCE_QUARANTINE_KEY)
  saveState(initialState()); mem.set('unrelated-key', 'keep')
  assert.ok(mem.has(QUARANTINE_KEY) && mem.has(SUBJECT_QUARANTINE_KEY) && mem.has(ATTENDANCE_QUARANTINE_KEY))
  clearQuarantine(); assert.ok(!mem.has(QUARANTINE_KEY) && !mem.has(SUBJECT_QUARANTINE_KEY) && !mem.has(ATTENDANCE_QUARANTINE_KEY))
  assert.ok(mem.has('ssuet-smart-campus-demo'), 'main saved state untouched'); assert.equal(mem.get('unrelated-key'), 'keep')
})
t('clearQuarantine is safe when nothing is stored or storage throws', () => {
  clearQuarantine(); const real = (globalThis as any).window.localStorage.removeItem; (globalThis as any).window.localStorage.removeItem = () => { throw new Error('blocked') }
  assert.doesNotThrow(() => clearQuarantine()); (globalThis as any).window.localStorage.removeItem = real
})
console.log(`\n${n} checks passed`)
