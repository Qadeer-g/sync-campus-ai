export type Profile = {
  name: string
  studentId: string
  email: string
  phone: string
  department: string
  program: string
  semester: string
  batch: string
  avatarUrl: string | null
}

export type Subject = {
  id: string
  code: string
  name: string
  creditHours: number
  obtained: number
  total: number
}

export const COMPLAINT_STATUSES = ['Submitted', 'Under Review', 'Resolved'] as const
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number]

/** The next stage in the demo flow (Submitted → Under Review → Resolved), or null once Resolved. */
export function nextComplaintStatus(status: ComplaintStatus): ComplaintStatus | null {
  const i = COMPLAINT_STATUSES.indexOf(status)
  return i < 0 ? null : (COMPLAINT_STATUSES[i + 1] ?? null)
}

export const COMPLAINT_CATEGORIES = [
  'Academic',
  'Examination',
  'Facilities & Maintenance',
  'IT & Network',
  'Transport',
  'Cafeteria',
  'Administration',
  'Other',
] as const
export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number]

export type ComplaintEvent = {
  status: ComplaintStatus
  date: string
  note: string
}

export type Complaint = {
  id: string
  ticketId: string
  category: ComplaintCategory
  title: string
  description: string
  status: ComplaintStatus
  createdAt: string
  updatedAt: string
  attachmentName: string | null
  /** Where the issue is (free text), e.g. "Computer Lab 2". Empty for complaints saved before this field existed. */
  location: string
  /** Number of status updates the user has not opened yet. Opening the complaint resets it to 0. */
  unreadCount: number
  history: ComplaintEvent[]
  isDemo: boolean
}

export type AttendanceCheckIn = {
  id: string
  /** Stable key of the student (the demo student ID); used to block duplicates. */
  studentKey: string
  studentName: string
  checkedInAt: string
  /** 'Simulated' = added with the teacher view's demo button (no real student involved). */
  method: 'QR scan' | 'Backup PIN' | 'Simulated'
}

export type AttendanceSession = {
  id: string
  subjectCode: string
  subjectName: string
  section: string
  room: string
  token: string
  pin: string
  createdAt: number
  expiresAt: number
  durationMin: number
  /** Students checked in to this session, oldest first. Cleared when the session is reset. */
  checkIns: AttendanceCheckIn[]
}

export type AttendanceRecord = {
  id: string
  sessionId: string
  subjectName: string
  markedAt: string
  method: 'QR scan' | 'Backup PIN'
  isDemo: boolean
}

export type ThemePreference = 'light' | 'dark' | 'system'

export type NotificationPrefs = {
  complaintUpdates: boolean
  attendanceAlerts: boolean
  advisorTips: boolean
  emailDigest: boolean
}

export type AppNotification = {
  id: string
  title: string
  body: string
  date: string
  read: boolean
  href: string
}

export type ActivityItem = {
  id: string
  kind: 'attendance' | 'complaint' | 'advisor' | 'profile'
  title: string
  detail: string
  date: string
}
