'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  defaultNotificationPrefs,
  demoActivity,
  demoAttendance,
  demoComplaints,
  demoNotifications,
  demoProfile,
  demoSubjects,
  QR_DURATIONS,
} from './demo-data'
import { analyse, WEAK_THRESHOLD } from './advisor'
import { generatePin, generateToken, isExpired, normalizeToken, type CheckInResult } from './attendance'
import { percent, uid } from './format'
import { COMPLAINT_STATUSES, nextComplaintStatus } from './types'
import type {
  ActivityItem,
  AppNotification,
  AttendanceCheckIn,
  AttendanceRecord,
  AttendanceSession,
  Complaint,
  ComplaintCategory,
  ComplaintStatus,
  NotificationPrefs,
  Profile,
  Subject,
  ThemePreference,
} from './types'

export type State = {
  /** Simulated local login flag. No real authentication happens anywhere. */
  isAuthed: boolean
  profile: Profile
  subjects: Subject[]
  analysedAt: string | null
  complaints: Complaint[]
  session: AttendanceSession | null
  attendance: AttendanceRecord[]
  theme: ThemePreference
  notificationPrefs: NotificationPrefs
  notifications: AppNotification[]
  activity: ActivityItem[]
}

export const initialState = (): State =>
  // Deterministic (fixed date) so server and client render the same first markup.
  syncAdvisorNotification(initialStateBase(), '2026-11-07T08:00:00+05:00')

const initialStateBase = (): State => ({
  isAuthed: false,
  profile: demoProfile,
  subjects: demoSubjects,
  analysedAt: '2026-11-07T08:00:00+05:00',
  complaints: demoComplaints,
  session: null,
  attendance: demoAttendance,
  theme: 'light',
  notificationPrefs: defaultNotificationPrefs,
  notifications: demoNotifications,
  activity: demoActivity,
})

/* ------------------------------------------------------------------ */
/* Local persistence (browser localStorage only — nothing leaves the   */
/* device). Bump STORAGE_VERSION when the saved shape changes; saved    */
/* data with a different version is ignored and defaults are used.     */
/* ------------------------------------------------------------------ */
const STORAGE_KEY = 'ssuet-smart-campus-demo'
const STORAGE_VERSION = 1

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const THEMES: ThemePreference[] = ['light', 'dark', 'system']

/* ---- Complaint status migration -------------------------------------------------------------
 * The statuses are now exactly: Submitted, Under Review, Resolved. Saved data may still contain
 * the retired "In Progress" status. On load it is mapped to "Under Review"; nothing is deleted:
 * ticket history events, their dates and notes, and all timestamps are kept as they were.
 * A status that is not recognised at all (corrupt data) falls back to "Submitted".
 * Complaints that are missing fields the UI needs (ids, title, description, valid dates) cannot
 * be shown safely and are skipped. The migration is idempotent, so it is safe to run every load. */
const isValidDate = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v))
const retiredStatusText = (v: unknown) => (typeof v === 'string' ? v.replace(/\bIn Progress\b/g, 'Under Review') : v)

function migrateStatus(value: unknown): ComplaintStatus {
  if (typeof value === 'string') {
    if ((COMPLAINT_STATUSES as readonly string[]).includes(value)) return value as ComplaintStatus
    if (value === 'In Progress') return 'Under Review'
  }
  return 'Submitted'
}

export function migrateComplaints(list: unknown[]): { complaints: Complaint[]; skipped: unknown[] } {
  const complaints: Complaint[] = []
  const skipped: unknown[] = []
  for (const c of list) {
    if (
      !isObject(c) ||
      typeof c.id !== 'string' ||
      typeof c.ticketId !== 'string' ||
      typeof c.title !== 'string' ||
      typeof c.description !== 'string' ||
      !isValidDate(c.createdAt) ||
      !isValidDate(c.updatedAt)
    ) {
      skipped.push(c) // reported to the caller so it is never lost silently
      continue
    }
    const history = (Array.isArray(c.history) ? c.history : [])
      .filter((h): h is Record<string, unknown> => isObject(h) && isValidDate(h.date))
      .map((h) => ({
        ...h,
        status: migrateStatus(h.status),
        date: h.date as string,
        note: typeof h.note === 'string' ? (retiredStatusText(h.note) as string) : '',
      }))
    complaints.push({
      ...(c as unknown as Complaint),
      status: migrateStatus(c.status),
      // Fields added later: complaints saved before they existed get safe defaults.
      location: typeof c.location === 'string' ? c.location : '',
      unreadCount: typeof c.unreadCount === 'number' && Number.isFinite(c.unreadCount) && c.unreadCount > 0 ? Math.floor(c.unreadCount) : 0,
      history,
    })
  }
  return { complaints, skipped }
}

/* ---- Saved subject validation ----------------------------------------------------------------
 * Marks must be usable numbers or the Advisor would show NaN. Entries that are not objects, have no
 * id/name, or have non-numeric / negative / impossible marks (obtained > total, total <= 0) are not
 * shown; they are reported back so the caller can set them aside (never silently deleted). */
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function migrateSubjects(list: unknown[]): { subjects: Subject[]; skipped: unknown[] } {
  const subjects: Subject[] = []
  const skipped: unknown[] = []
  for (const x of list) {
    if (
      !isObject(x) ||
      typeof x.id !== 'string' ||
      !x.id ||
      typeof x.name !== 'string' ||
      !x.name.trim() ||
      !isNum(x.creditHours) ||
      x.creditHours <= 0 ||
      !isNum(x.obtained) ||
      x.obtained < 0 ||
      !isNum(x.total) ||
      x.total <= 0 ||
      x.obtained > x.total
    ) {
      skipped.push(x)
      continue
    }
    subjects.push({
      id: x.id,
      code: typeof x.code === 'string' && x.code.trim() ? x.code : 'N/A',
      name: x.name,
      creditHours: x.creditHours,
      obtained: x.obtained,
      total: x.total,
    })
  }
  return { subjects, skipped }
}

/** Next unique demo ticket ID, e.g. DEMO-0160. Never reuses an ID that already exists. */
export const formatTicketId = (n: number) => `DEMO-${String(n).padStart(4, '0')}`
export function nextTicketId(existing: Complaint[]) {
  const used = new Set(existing.map((c) => c.ticketId.toLowerCase()))
  const highest = existing.reduce((max, c) => Math.max(max, Number(c.ticketId.match(/(\d+)$/)?.[1] ?? 0)), 0)
  let n = Math.max(160, highest + 1)
  while (used.has(formatTicketId(n).toLowerCase())) n++
  return formatTicketId(n)
}

export function loadSavedState(): { state: State; skipped: unknown[]; skippedSubjects: unknown[]; skippedAttendance: unknown[] } | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isObject(parsed) || parsed.version !== STORAGE_VERSION || !isObject(parsed.state)) return null
    const s = parsed.state
    const base = initialState()
    const migrated = Array.isArray(s.complaints) ? migrateComplaints(s.complaints) : null
    const migratedSubjects = Array.isArray(s.subjects) ? migrateSubjects(s.subjects) : null
    const migratedAttendance = Array.isArray(s.attendance) ? migrateAttendance(s.attendance) : null
    const migratedSession = isObject(s.session) ? migrateSession(s.session) : null
    const state: State = {
      isAuthed: s.isAuthed === true,
      profile: migrateProfile(s.profile, base.profile),
      subjects: migratedSubjects ? migratedSubjects.subjects : base.subjects,
      analysedAt: typeof s.analysedAt === 'string' || s.analysedAt === null ? s.analysedAt : base.analysedAt,
      complaints: migrated ? migrated.complaints : base.complaints,
      session: migratedSession,
      attendance: migratedAttendance ? migratedAttendance.records : base.attendance,
      theme: THEMES.includes(s.theme as ThemePreference) ? (s.theme as ThemePreference) : base.theme,
      notificationPrefs: isObject(s.notificationPrefs)
        ? { ...base.notificationPrefs, ...(s.notificationPrefs as Partial<NotificationPrefs>) }
        : base.notificationPrefs,
      notifications: Array.isArray(s.notifications)
        ? (s.notifications.filter(isObject).map((n) => ({ ...n, body: retiredStatusText(n.body) })) as unknown as AppNotification[])
        : base.notifications,
      activity: Array.isArray(s.activity)
        ? (s.activity.filter(isObject).map((a) => ({ ...a, detail: retiredStatusText(a.detail) })) as unknown as ActivityItem[])
        : base.activity,
    }
    return {
      // Re-derive the advisor alert from the marks that were actually loaded, so a stale saved alert
      // can never describe marks that no longer apply.
      state: syncAdvisorNotification(state, new Date().toISOString()),
      skipped: migrated ? migrated.skipped : [],
      skippedSubjects: migratedSubjects ? migratedSubjects.skipped : [],
      skippedAttendance: [...(migratedAttendance ? migratedAttendance.skipped : []), ...(isObject(s.session) && !migratedSession ? [s.session] : [])],
    }
  } catch {
    // Corrupt JSON, blocked storage (private mode), etc. — fall back to defaults.
    return null
  }
}

/* ---- Diagnostics for skipped records ---------------------------------------------------------
 * Saved complaints that cannot be shown safely are not shown, but they are also not thrown away:
 * they are copied (max 20, newest kept, duplicates ignored) to a separate localStorage key so they
 * can still be inspected or recovered. Normal users only see a short plain-language note with the
 * count (Complaint Center); the technical detail goes to the browser console only. */
export const QUARANTINE_KEY = `${STORAGE_KEY}:skipped`
export const SUBJECT_QUARANTINE_KEY = `${STORAGE_KEY}:skipped-subjects`
export const ATTENDANCE_QUARANTINE_KEY = `${STORAGE_KEY}:skipped-attendance`
const QUARANTINE_MAX = 20

export function readQuarantine(key: string = QUARANTINE_KEY): unknown[] {
  try {
    const raw = window.localStorage.getItem(key)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Stores newly skipped records and returns how many are now set aside in total. */
export function quarantineRecords(records: unknown[], key: string = QUARANTINE_KEY): number {
  const existing = readQuarantine(key)
  const known = new Set(existing.map((e) => JSON.stringify(isObject(e) ? e.record : e)))
  const added = records
    .filter((r) => !known.has(JSON.stringify(r)))
    .map((record) => ({ skippedAt: new Date().toISOString(), record }))
  const all = [...existing, ...added].slice(-QUARANTINE_MAX)
  try {
    window.localStorage.setItem(key, JSON.stringify(all))
  } catch {
    // Storage unavailable: the console warning is still emitted by the caller.
  }
  return all.length
}

/* ---- Complaint state transitions (pure; exported so they can be tested directly) ---------------- */
export type NewComplaintInput = {
  category: ComplaintCategory
  location: string
  title: string
  description: string
  attachmentName: string | null
}

export function createComplaint(s: State, input: NewComplaintInput, id: string, now: string): State {
  const created: Complaint = {
    id,
    ticketId: nextTicketId(s.complaints),
    ...input,
    status: 'Submitted',
    createdAt: now,
    updatedAt: now,
    unreadCount: 0,
    isDemo: false,
    history: [{ status: 'Submitted', date: now, note: 'Demo complaint saved in this browser. It was not submitted to SSUET.' }],
  }
  return {
    ...s,
    complaints: [created, ...s.complaints],
    activity: [
      { id: uid('act'), kind: 'complaint' as const, title: 'Complaint submitted', detail: `${created.ticketId} · ${input.category}`, date: now },
      ...s.activity,
    ].slice(0, 12),
  }
}

/** Demo-only: moves a complaint one step (Submitted → Under Review → Resolved). Resolved never advances. */
export function advanceComplaint(s: State, id: string, now: string): State {
  const c = s.complaints.find((x) => x.id === id)
  if (!c) return s
  const next = nextComplaintStatus(c.status)
  if (!next) return s
  const updated: Complaint = {
    ...c,
    status: next,
    updatedAt: now,
    unreadCount: c.unreadCount + 1,
    history: [...c.history, { status: next, date: now, note: `Demo action: moved to ${next}. This is not an update from SSUET.` }],
  }
  // Respect the existing "complaint updates" notification preference; the history entry, unread
  // marker and activity log are always recorded.
  const notifications = s.notificationPrefs.complaintUpdates
    ? [
        { id: uid('ntf'), title: 'Complaint update', body: `${c.ticketId} moved to ${next}.`, date: now, read: false, href: `/complaints/${c.ticketId}` },
        ...s.notifications,
      ].slice(0, 30)
    : s.notifications
  return {
    ...s,
    complaints: s.complaints.map((x) => (x.id === id ? updated : x)),
    notifications,
    activity: [
      { id: uid('act'), kind: 'complaint' as const, title: 'Complaint status updated', detail: `${c.ticketId} · ${next}`, date: now },
      ...s.activity,
    ].slice(0, 12),
  }
}

/** Opening a complaint marks its updates as read (the complaint's counter and its notifications). */
export function markComplaintRead(s: State, id: string): State {
  const c = s.complaints.find((x) => x.id === id)
  if (!c) return s
  const links = new Set([`/complaints/${c.ticketId}`.toLowerCase(), `/complaints/${c.id}`.toLowerCase()])
  const isThisComplaint = (href: string) => links.has(href.toLowerCase())
  if (c.unreadCount === 0 && !s.notifications.some((n) => !n.read && isThisComplaint(n.href))) return s // nothing to change
  return {
    ...s,
    complaints: s.complaints.map((x) => (x.id === id ? { ...x, unreadCount: 0 } : x)),
    notifications: s.notifications.map((n) => (isThisComplaint(n.href) && !n.read ? { ...n, read: true } : n)),
  }
}

/* ---- Marks transitions (pure; exported so they can be tested directly) -------------------------- */
export type SubjectInput = Omit<Subject, 'id'> & { id?: string }

/** Adds a subject, or updates it when `subject.id` matches an existing one. Refreshes `analysedAt`. */
export function saveSubject(s: State, subject: SubjectInput, now: string): State {
  const exists = subject.id ? s.subjects.some((x) => x.id === subject.id) : false
  const saved: Subject = { ...subject, id: subject.id ?? uid('sub') }
  const subjects = exists ? s.subjects.map((x) => (x.id === saved.id ? saved : x)) : [...s.subjects, saved]
  const pct = percent(saved.obtained, saved.total)
  return syncAdvisorNotification(
    {
      ...s,
      subjects,
      analysedAt: now,
      activity: [
        { id: uid('act'), kind: 'advisor' as const, title: exists ? 'Marks updated' : 'Subject added', detail: `${saved.name} · ${pct}%`, date: now },
        ...s.activity,
      ].slice(0, 12),
    },
    now,
  )
}

export function deleteSubject(s: State, id: string, now: string): State {
  const target = s.subjects.find((x) => x.id === id)
  if (!target) return s
  return syncAdvisorNotification(
    {
      ...s,
      subjects: s.subjects.filter((x) => x.id !== id),
      analysedAt: now,
      activity: [{ id: uid('act'), kind: 'advisor' as const, title: 'Subject removed', detail: target.name, date: now }, ...s.activity].slice(0, 12),
    },
    now,
  )
}

/* ---- Advisor alert notification (derived from the current marks) ----------------------------------
 * There is exactly one advisor alert, id 'ntf-advisor'. It is rebuilt from the CURRENT marks whenever
 * marks change (and when saved data is loaded), so it can never show an outdated academic warning:
 * it names the weakest subject at its current percentage, disappears when no subject is below the
 * target, and respects the "advisor tips" notification preference. A read alert stays read as long
 * as its text does not change; a changed alert comes back as unread. */
export const ADVISOR_NOTIFICATION_ID = 'ntf-advisor'
const LEGACY_ADVISOR_NOTIFICATION_IDS = ['ntf-2'] // old fixed-text seed alert

export function syncAdvisorNotification(s: State, date: string): State {
  const { weak } = analyse(s.subjects)
  const existing = s.notifications.find((n) => n.id === ADVISOR_NOTIFICATION_ID)
  const others = s.notifications.filter((n) => n.id !== ADVISOR_NOTIFICATION_ID && !LEGACY_ADVISOR_NOTIFICATION_IDS.includes(n.id))
  const hadLegacy = s.notifications.some((n) => LEGACY_ADVISOR_NOTIFICATION_IDS.includes(n.id))

  if (!weak.length || !s.notificationPrefs.advisorTips) {
    return existing || hadLegacy ? { ...s, notifications: others } : s
  }
  const w = weak[0]
  const more = weak.length - 1
  const body = `${w.name} is at ${w.pct}%, below the ${WEAK_THRESHOLD}% target.${more > 0 ? ` ${more} other subject${more === 1 ? ' is' : 's are'} also below target.` : ''} View your study plan.`
  if (existing && existing.body === body && !hadLegacy) return s
  const alert: AppNotification =
    existing && existing.body === body
      ? existing
      : { id: ADVISOR_NOTIFICATION_ID, title: 'Advisor insight', body, date, read: false, href: '/advisor/recommendations' }
  return { ...s, notifications: [alert, ...others].slice(0, 30) }
}

/** Keeps only usable saved profile fields (strings; avatar string|null); anything else falls back to the default. */
export function migrateProfile(raw: unknown, base: Profile): Profile {
  if (!isObject(raw)) return base
  const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback)
  const name = str(raw.name, base.name).trim()
  return {
    name: name || base.name,
    studentId: str(raw.studentId, base.studentId).trim() || base.studentId,
    email: str(raw.email, base.email),
    phone: str(raw.phone, base.phone),
    department: str(raw.department, base.department),
    program: str(raw.program, base.program),
    semester: str(raw.semester, base.semester),
    batch: str(raw.batch, base.batch),
    avatarUrl: typeof raw.avatarUrl === 'string' ? raw.avatarUrl : null,
  }
}

/* ---- Attendance (local demo): validation of saved data ------------------------------------------- */
const CHECK_IN_METHODS = ['QR scan', 'Backup PIN', 'Simulated']

export function migrateAttendance(list: unknown[]): { records: AttendanceRecord[]; skipped: unknown[] } {
  const records: AttendanceRecord[] = []
  const skipped: unknown[] = []
  for (const r of list) {
    if (
      !isObject(r) ||
      typeof r.id !== 'string' ||
      typeof r.sessionId !== 'string' ||
      typeof r.subjectName !== 'string' ||
      !isValidDate(r.markedAt) ||
      (r.method !== 'QR scan' && r.method !== 'Backup PIN')
    ) {
      skipped.push(r)
      continue
    }
    records.push({ id: r.id, sessionId: r.sessionId, subjectName: r.subjectName, markedAt: r.markedAt, method: r.method, isDemo: r.isDemo === true })
  }
  return { records, skipped }
}

/** Returns a usable session, or null if the saved one is incomplete/corrupt (the caller reports that). */
export function migrateSession(x: Record<string, unknown>): AttendanceSession | null {
  const tokenOk = typeof x.token === 'string' && normalizeToken(x.token).length > 0
  if (
    typeof x.id !== 'string' ||
    typeof x.subjectCode !== 'string' ||
    typeof x.subjectName !== 'string' ||
    typeof x.section !== 'string' ||
    typeof x.room !== 'string' ||
    !tokenOk ||
    typeof x.pin !== 'string' ||
    !/^\d{6}$/.test(x.pin) ||
    !isNum(x.createdAt) ||
    !isNum(x.expiresAt) ||
    !isNum(x.durationMin)
  )
    return null
  const checkIns: AttendanceCheckIn[] = (Array.isArray(x.checkIns) ? x.checkIns : []).flatMap((c): AttendanceCheckIn[] =>
    isObject(c) &&
    typeof c.id === 'string' &&
    typeof c.studentKey === 'string' &&
    typeof c.studentName === 'string' &&
    isValidDate(c.checkedInAt) &&
    CHECK_IN_METHODS.includes(c.method as string)
      ? [{ id: c.id, studentKey: c.studentKey, studentName: c.studentName, checkedInAt: c.checkedInAt, method: c.method as AttendanceCheckIn['method'] }]
      : [],
  )
  return {
    id: x.id,
    subjectCode: x.subjectCode,
    subjectName: x.subjectName,
    section: x.section,
    room: x.room,
    token: x.token as string,
    pin: x.pin,
    createdAt: x.createdAt,
    expiresAt: x.expiresAt,
    durationMin: x.durationMin,
    checkIns,
  }
}

/* ---- Attendance transitions (pure; exported so they can be tested directly) ------------------------ */
export type AttendanceClass = { code: string; name: string; section: string; room: string }
export type CheckInInput = { code: string; pin?: string; method: 'QR scan' | 'Backup PIN' }

/** Teacher: opens a NEW session (replacing any current one and its check-ins). Only 1/2/3/5/10 minutes are allowed. */
export function openSession(s: State, cls: AttendanceClass, durationMin: number, nowMs: number): State {
  if (!(QR_DURATIONS as readonly number[]).includes(durationMin)) return s
  const session: AttendanceSession = {
    id: uid('ses'),
    subjectCode: cls.code,
    subjectName: cls.name,
    section: cls.section,
    room: cls.room,
    token: generateToken(),
    pin: generatePin(),
    createdAt: nowMs,
    expiresAt: nowMs + durationMin * 60_000,
    durationMin,
    checkIns: [],
  }
  return { ...s, session }
}

/** Teacher: new code + PIN + expiry window for the SAME session. Old QR/PIN stop working. Check-ins are kept. */
export function renewSession(s: State, durationMin: number, nowMs: number): State {
  if (!s.session || !(QR_DURATIONS as readonly number[]).includes(durationMin)) return s
  let token = generateToken()
  while (token === s.session.token) token = generateToken()
  let pin = generatePin()
  while (pin === s.session.pin) pin = generatePin()
  return { ...s, session: { ...s.session, token, pin, createdAt: nowMs, expiresAt: nowMs + durationMin * 60_000, durationMin } }
}

/** Teacher: reset. Removes the live session and its check-ins. The student's own attendance history is kept. */
export function closeSession(s: State): State {
  return s.session ? { ...s, session: null } : s
}

/** Teacher, demo only: adds a made-up "Demo Student N" to the roster so a class list can be shown. Not possible after expiry. */
export function addDemoStudentCheckIn(s: State, nowMs: number): State {
  if (!s.session || isExpired(s.session, nowMs)) return s
  const simulated = s.session.checkIns.filter((c) => c.method === 'Simulated').length
  const n = simulated + 2 // "Demo Student" (the logged-in one) is number 1
  const entry: AttendanceCheckIn = {
    id: uid('chk'),
    studentKey: `DEMO-SIM-${n}`,
    studentName: `Demo Student ${n}`,
    checkedInAt: new Date(nowMs).toISOString(),
    method: 'Simulated',
  }
  return { ...s, session: { ...s.session, checkIns: [...s.session.checkIns, entry] } }
}

/**
 * Student: tries to mark attendance. Checks run in this order and the first failure wins:
 * open session -> session code -> not expired -> PIN (manual entry only) -> not already marked.
 */
export function attemptCheckIn(s: State, input: CheckInInput, nowMs: number): { state: State; result: CheckInResult } {
  const session = s.session
  if (!session) return { state: s, result: { kind: 'no-session' } }
  if (normalizeToken(input.code) !== normalizeToken(session.token)) return { state: s, result: { kind: 'invalid-code' } }
  if (isExpired(session, nowMs)) return { state: s, result: { kind: 'expired' } }
  if (input.method === 'Backup PIN' && (input.pin ?? '').trim() !== session.pin) return { state: s, result: { kind: 'invalid-pin' } }
  const studentKey = s.profile.studentId
  if (s.attendance.some((a) => a.sessionId === session.id) || session.checkIns.some((c) => c.studentKey === studentKey))
    return { state: s, result: { kind: 'duplicate' } }

  const markedAt = new Date(nowMs).toISOString()
  const record: AttendanceRecord = { id: uid('att'), sessionId: session.id, subjectName: session.subjectName, markedAt, method: input.method, isDemo: false }
  const checkIn: AttendanceCheckIn = { id: uid('chk'), studentKey, studentName: s.profile.name, checkedInAt: markedAt, method: input.method }
  const notifications = s.notificationPrefs.attendanceAlerts
    ? [
        { id: uid('ntf'), title: 'Attendance recorded', body: `${session.subjectName} attendance marked via ${input.method === 'QR scan' ? 'QR' : 'backup PIN'}.`, date: markedAt, read: false, href: '/attendance/student' },
        ...s.notifications,
      ].slice(0, 30)
    : s.notifications
  return {
    state: {
      ...s,
      session: { ...session, checkIns: [...session.checkIns, checkIn] },
      attendance: [record, ...s.attendance],
      notifications,
      activity: [{ id: uid('act'), kind: 'attendance' as const, title: 'Attendance marked', detail: `${session.subjectName} · ${input.method}`, date: markedAt }, ...s.activity].slice(0, 12),
    },
    result: { kind: 'success', subjectName: session.subjectName, subjectCode: session.subjectCode, markedAt },
  }
}

/* ---- Settings transitions (pure; exported so they can be tested directly) ------------------------- */
const PROFILE_FIELD_LABELS: Record<keyof Profile, string> = {
  name: 'Name',
  studentId: 'Demo ID',
  email: 'Email',
  phone: 'Phone',
  department: 'Department',
  program: 'Program',
  semester: 'Semester',
  batch: 'Batch',
  avatarUrl: 'Photo',
}

/** Saves profile edits (trimmed). Nothing changed -> same state object and no activity entry. */
export function saveProfile(s: State, patch: Partial<Profile>, now: string): State {
  const next: Profile = { ...s.profile }
  const changed: string[] = []
  // Fixed field order, so the activity entry always reads the same way.
  for (const key of Object.keys(PROFILE_FIELD_LABELS) as (keyof Profile)[]) {
    if (!(key in patch)) continue
    const raw = patch[key]
    const value = typeof raw === 'string' ? raw.trim() : raw
    if (value !== undefined && value !== next[key]) {
      ;(next as Record<string, unknown>)[key] = value
      changed.push(PROFILE_FIELD_LABELS[key])
    }
  }
  if (!changed.length) return s
  return {
    ...s,
    profile: next,
    activity: [{ id: uid('act'), kind: 'profile' as const, title: 'Profile updated', detail: changed.join(', '), date: now }, ...s.activity].slice(0, 12),
  }
}

/** Which notification preference a notification belongs to (from where it links), or null if it has none. */
export function notificationCategory(n: Pick<AppNotification, 'href'>): keyof NotificationPrefs | null {
  const href = n.href.toLowerCase()
  if (href.startsWith('/complaints')) return 'complaintUpdates'
  if (href.startsWith('/attendance')) return 'attendanceAlerts'
  if (href.startsWith('/advisor')) return 'advisorTips'
  return null
}
export function isNotificationEnabled(n: Pick<AppNotification, 'href'>, prefs: NotificationPrefs) {
  const category = notificationCategory(n)
  return category ? prefs[category] : true
}
/** Notifications the user should see: those whose category is switched on. Turning a category back on restores them. */
export const visibleNotifications = (s: State) => s.notifications.filter((n) => isNotificationEnabled(n, s.notificationPrefs))

/** "Mark all read" only touches notifications that are currently visible. */
export function markAllRead(s: State): State {
  if (!visibleNotifications(s).some((n) => !n.read)) return s
  return { ...s, notifications: s.notifications.map((n) => (isNotificationEnabled(n, s.notificationPrefs) ? { ...n, read: true } : n)) }
}

/**
 * Reset Demo Data: everything goes back to the clean defaults (default "Demo Student" profile, demo marks,
 * complaints, attendance history, no session, default notifications/preferences, default activity).
 * Kept on purpose: the signed-in state and the theme, so the screen does not change under the user.
 */
export function resetDemo(s: State): State {
  return { ...initialState(), isAuthed: s.isAuthed, theme: s.theme }
}

/** Removes the "set aside" copies of skipped records (complaints, subjects, attendance). */
export function clearQuarantine() {
  for (const key of [QUARANTINE_KEY, SUBJECT_QUARANTINE_KEY, ATTENDANCE_QUARANTINE_KEY]) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Storage unavailable: nothing to clear.
    }
  }
}

export function saveState(state: State) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, state }))
  } catch {
    // Storage full or unavailable — the demo keeps working in memory.
  }
}

function useAppState() {
  // First render (server and client) always uses the deterministic defaults so the
  // markup matches; saved data is loaded after mount, then `hydrated` flips to true.
  const [state, setState] = useState<State>(initialState)
  const [hydrated, setHydrated] = useState(false)
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])
  // How many saved complaint records could not be loaded and were set aside (see quarantineRecords).
  const [skippedComplaints, setSkippedComplaints] = useState(0)

  useEffect(() => {
    const saved = loadSavedState()
    if (saved) setState(saved.state)
    if (saved && saved.skipped.length > 0) {
      setSkippedComplaints(quarantineRecords(saved.skipped))
      console.warn(
        `[Smart Campus demo] ${saved.skipped.length} saved complaint record(s) were unreadable and were set aside under the localStorage key "${QUARANTINE_KEY}".`,
      )
    } else {
      setSkippedComplaints(readQuarantine().length)
    }
    if (saved && saved.skippedSubjects.length > 0) {
      // Unusable saved marks are set aside (not deleted); there is no on-screen message for these.
      quarantineRecords(saved.skippedSubjects, SUBJECT_QUARANTINE_KEY)
      console.warn(
        `[Smart Campus demo] ${saved.skippedSubjects.length} saved subject record(s) had unusable marks and were set aside under the localStorage key "${SUBJECT_QUARANTINE_KEY}".`,
      )
    }
    if (saved && saved.skippedAttendance.length > 0) {
      quarantineRecords(saved.skippedAttendance, ATTENDANCE_QUARANTINE_KEY)
      console.warn(
        `[Smart Campus demo] ${saved.skippedAttendance.length} saved attendance record(s)/session were unusable and were set aside under the localStorage key "${ATTENDANCE_QUARANTINE_KEY}".`,
      )
    }
    setHydrated(true)
  }, [])

  // Only write once the saved data has been read, otherwise defaults would overwrite it.
  useEffect(() => {
    if (hydrated) saveState(state)
  }, [state, hydrated])

  // Simulated login: nothing is checked against any server. It only marks the local session as
  // signed in. The saved profile and all demo data (complaints, marks, attendance, ...) are kept
  // exactly as they are. A browser with no saved data starts with the default "Demo Student" profile.
  const login = useCallback(() => {
    setState((s) => ({ ...s, isAuthed: true }))
  }, [])

  const register = useCallback(
    (data: { name: string; studentId: string; email: string; department: string }) => {
      // Registration only saves the entered details as the demo profile and signs in locally.
      // It never deletes existing demo data (complaints, marks, attendance, ...). Clearing demo
      // data will be an explicit, confirmed "Reset Demo Data" action in Settings.
      setState((s) => ({
        ...s,
        isAuthed: true,
        profile: {
          ...s.profile,
          name: data.name,
          studentId: data.studentId.toUpperCase(),
          email: data.email,
          department: data.department,
          program: `${data.department} (demo)`,
        },
      }))
    },
    [],
  )

  // Logout ends the local session only; demo data stays saved in this browser.
  const logout = useCallback(() => {
    setState((s) => ({ ...s, isAuthed: false }))
  }, [])

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setState((s) => saveProfile(s, patch, new Date().toISOString()))
  }, [])

  const resetDemoData = useCallback(() => {
    clearQuarantine()
    setSkippedComplaints(0)
    setState((s) => resetDemo(s))
  }, [])

  // Marks changes go through the shared store (and so persist and feed the Dashboard).
  const upsertSubject = useCallback((subject: SubjectInput) => {
    setState((s) => saveSubject(s, subject, new Date().toISOString()))
  }, [])

  const removeSubject = useCallback((id: string) => {
    setState((s) => deleteSubject(s, id, new Date().toISOString()))
  }, [])

  const submitAnalysis = useCallback(() => {
    setState((s) => ({ ...s, analysedAt: new Date().toISOString() }))
    setState((s) => ({
      ...s,
      activity: [
        {
          id: uid('act'),
          kind: 'advisor' as const,
          title: 'Marks analysed',
          detail: `${s.subjects.length} subjects reviewed by Academic Advisor`,
          date: new Date().toISOString(),
        },
        ...s.activity,
      ].slice(0, 12),
    }))
  }, [])

  const addComplaint = useCallback((input: NewComplaintInput) => {
    const id = uid('cmp')
    setState((s) => createComplaint(s, input, id, new Date().toISOString()))
    return id
  }, [])

  const advanceComplaintStatus = useCallback((id: string) => {
    setState((s) => advanceComplaint(s, id, new Date().toISOString()))
  }, [])

  const markComplaintAsRead = useCallback((id: string) => {
    setState((s) => markComplaintRead(s, id))
  }, [])

  // Teacher actions (local demo). They only change this browser's saved state.
  const startSession = useCallback((cls: AttendanceClass, durationMin: number) => {
    const now = Date.now()
    setState((s) => openSession(s, cls, durationMin, now))
  }, [])

  const regenerateSession = useCallback((durationMin: number) => {
    const now = Date.now()
    setState((s) => renewSession(s, durationMin, now))
  }, [])

  const endSession = useCallback(() => {
    setState((s) => closeSession(s))
  }, [])

  const addDemoCheckIn = useCallback(() => {
    const now = Date.now()
    setState((s) => addDemoStudentCheckIn(s, now))
  }, [])

  // Student action. The result is computed from the latest known state so the caller can show
  // feedback immediately; the stored state is produced by the functional update (the authority).
  // After a successful check-in the ref is advanced right away so a fast double click is reported
  // as a duplicate instead of a second success.
  const submitAttendance = useCallback((input: CheckInInput): CheckInResult => {
    const now = Date.now()
    const { state: next, result } = attemptCheckIn(stateRef.current, input, now)
    if (result.kind === 'success') stateRef.current = next
    setState((s) => attemptCheckIn(s, input, now).state)
    return result
  }, [])

  const setTheme = useCallback((theme: ThemePreference) => setState((s) => ({ ...s, theme })), [])

  const setNotificationPrefs = useCallback(
    // The advisor alert depends on the "advisor tips" preference, so re-sync it with the new setting.
    (prefs: NotificationPrefs) =>
      setState((s) => syncAdvisorNotification({ ...s, notificationPrefs: prefs }, new Date().toISOString())),
    [],
  )

  const markNotificationRead = useCallback((id: string) => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }))
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setState((s) => markAllRead(s))
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = state.theme === 'dark' || (state.theme === 'system' && media.matches)
      root.classList.toggle('dark', dark)
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [state.theme])

  return useMemo(
    () => ({
      ...state,
      // Only notifications whose category is switched on in Settings are exposed to the UI.
      notifications: visibleNotifications(state),
      hydrated,
      skippedComplaints,
      login,
      register,
      logout,
      updateProfile,
      resetDemoData,
      upsertSubject,
      removeSubject,
      submitAnalysis,
      addComplaint,
      advanceComplaintStatus,
      markComplaintAsRead,
      startSession,
      regenerateSession,
      endSession,
      addDemoCheckIn,
      submitAttendance,
      setTheme,
      setNotificationPrefs,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [
      state,
      hydrated,
      skippedComplaints,
      login,
      register,
      logout,
      updateProfile,
      resetDemoData,
      upsertSubject,
      removeSubject,
      submitAnalysis,
      addComplaint,
      advanceComplaintStatus,
      markComplaintAsRead,
      startSession,
      regenerateSession,
      endSession,
      addDemoCheckIn,
      submitAttendance,
      setTheme,
      setNotificationPrefs,
      markNotificationRead,
      markAllNotificationsRead,
    ],
  )
}

type AppContextValue = ReturnType<typeof useAppState>

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const value = useAppState()
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
