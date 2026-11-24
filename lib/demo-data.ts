import type {
  ActivityItem,
  AppNotification,
  AttendanceRecord,
  Complaint,
  NotificationPrefs,
  Profile,
  Subject,
} from './types'

export const DEPARTMENTS = [
  'Computer Engineering',
  'Software Engineering',
  'Electrical Engineering',
  'Electronic Engineering',
  'Civil Engineering',
  'Biomedical Engineering',
  'Telecommunication Engineering',
  'Computer Science',
] as const

/**
 * Neutral, clearly fictional identity used for every demo login.
 * Not an SSUET record: the ID is a demo label and example.com is a reserved
 * documentation domain that can never belong to a real person.
 */
export const demoProfile: Profile = {
  name: 'Demo Student',
  studentId: 'DEMO-0001',
  email: 'demo.student@example.com',
  phone: '',
  department: 'Computer Engineering',
  program: 'Demo Program',
  semester: 'Demo Semester',
  batch: 'Demo Batch',
  avatarUrl: null,
}

export const demoSubjects: Subject[] = [
  { id: 'sub-1', code: 'SUB-01', name: 'Subject 1', creditHours: 3, obtained: 78, total: 100 },
  { id: 'sub-2', code: 'SUB-02', name: 'Subject 2', creditHours: 3, obtained: 52, total: 100 },
  { id: 'sub-3', code: 'SUB-03', name: 'Subject 3', creditHours: 3, obtained: 44, total: 100 },
  { id: 'sub-4', code: 'SUB-04', name: 'Subject 4', creditHours: 3, obtained: 66, total: 100 },
  { id: 'sub-5', code: 'SUB-05', name: 'Subject 5', creditHours: 3, obtained: 85, total: 100 },
  { id: 'sub-6', code: 'SUB-06', name: 'Subject 6', creditHours: 2, obtained: 41, total: 50 },
]

export const demoComplaints: Complaint[] = [
  {
    id: 'cmp-1',
    ticketId: 'DEMO-0141',
    category: 'IT & Network',
    title: 'Wi-Fi disconnects frequently in Computer Lab 2',
    description:
      'The campus Wi-Fi in Computer Lab 2 drops every few minutes during practical sessions, making it difficult to submit lab work online.',
    status: 'Under Review',
    createdAt: '2026-10-28T09:20:00+05:00',
    updatedAt: '2026-11-03T14:10:00+05:00',
    attachmentName: 'lab2-wifi-screenshot.png',
    location: 'Computer Lab 2',
    unreadCount: 1,
    isDemo: true,
    history: [
      { status: 'Submitted', date: '2026-10-28T09:20:00+05:00', note: 'Complaint received.' },
      { status: 'Under Review', date: '2026-10-29T11:00:00+05:00', note: 'Assigned to the IT services desk.' },
      { status: 'Under Review', date: '2026-11-03T14:10:00+05:00', note: 'Access point replacement scheduled.' },
    ],
  },
  {
    id: 'cmp-2',
    ticketId: 'DEMO-0128',
    category: 'Facilities & Maintenance',
    title: 'Air conditioner not working in Demo Room 204',
    description: 'The air conditioner in Demo Room 204 has not been working for a week. Afternoon lectures are very uncomfortable.',
    status: 'Resolved',
    createdAt: '2026-10-14T10:05:00+05:00',
    updatedAt: '2026-10-20T16:30:00+05:00',
    attachmentName: null,
    location: 'Demo Room 204',
    unreadCount: 0,
    isDemo: true,
    history: [
      { status: 'Submitted', date: '2026-10-14T10:05:00+05:00', note: 'Complaint received.' },
      { status: 'Under Review', date: '2026-10-15T09:30:00+05:00', note: 'Forwarded to maintenance department.' },
      { status: 'Under Review', date: '2026-10-17T12:00:00+05:00', note: 'Technician visit completed, part ordered.' },
      { status: 'Resolved', date: '2026-10-20T16:30:00+05:00', note: 'Compressor replaced. Unit working normally.' },
    ],
  },
  {
    id: 'cmp-3',
    ticketId: 'DEMO-0152',
    category: 'Examination',
    title: 'Mid-term result not visible for Subject 3',
    description: 'My mid-term marks for SUB-03 are not showing on the result notice board while other subjects are visible.',
    status: 'Under Review',
    createdAt: '2026-11-05T13:45:00+05:00',
    updatedAt: '2026-11-06T10:00:00+05:00',
    attachmentName: null,
    location: 'Examination Office',
    unreadCount: 0,
    isDemo: true,
    history: [
      { status: 'Submitted', date: '2026-11-05T13:45:00+05:00', note: 'Complaint received.' },
      { status: 'Under Review', date: '2026-11-06T10:00:00+05:00', note: 'Examination office is verifying records.' },
    ],
  },
  {
    id: 'cmp-4',
    ticketId: 'DEMO-0157',
    category: 'Cafeteria',
    title: 'Long queues at the cafeteria during lunch break',
    description: 'Only one counter is open between 1:00 PM and 1:30 PM, which causes students to miss the start of afternoon classes.',
    status: 'Submitted',
    createdAt: '2026-11-08T13:15:00+05:00',
    updatedAt: '2026-11-08T13:15:00+05:00',
    attachmentName: null,
    location: 'Cafeteria',
    unreadCount: 0,
    isDemo: true,
    history: [{ status: 'Submitted', date: '2026-11-08T13:15:00+05:00', note: 'Complaint received.' }],
  },
]

export const demoAttendance: AttendanceRecord[] = [
  { id: 'att-1', sessionId: 'demo-1', subjectName: 'Subject 5', markedAt: '2026-11-06T09:04:00+05:00', method: 'QR scan', isDemo: true },
  { id: 'att-2', sessionId: 'demo-2', subjectName: 'Subject 4', markedAt: '2026-11-05T11:02:00+05:00', method: 'QR scan', isDemo: true },
  { id: 'att-3', sessionId: 'demo-3', subjectName: 'Subject 2', markedAt: '2026-11-04T08:35:00+05:00', method: 'Backup PIN', isDemo: true },
]

export const demoNotifications: AppNotification[] = [
  {
    id: 'ntf-1',
    title: 'Complaint update',
    body: 'DEMO-0141 has a new update (Under Review).',
    date: '2026-11-03T14:10:00+05:00',
    read: false,
    href: '/complaints/DEMO-0141',
  },
  {
    id: 'ntf-3',
    title: 'Attendance recorded',
    body: 'Subject 5 attendance marked via QR.',
    date: '2026-11-06T09:04:00+05:00',
    read: true,
    href: '/attendance/student',
  },
]

export const demoActivity: ActivityItem[] = [
  { id: 'act-1', kind: 'complaint', title: 'Complaint submitted', detail: 'DEMO-0157 · Cafeteria', date: '2026-11-08T13:15:00+05:00' },
  { id: 'act-2', kind: 'advisor', title: 'Marks analysed', detail: '6 subjects reviewed by Academic Advisor', date: '2026-11-07T08:00:00+05:00' },
  { id: 'act-3', kind: 'attendance', title: 'Attendance marked', detail: 'Subject 5 · QR scan', date: '2026-11-06T09:04:00+05:00' },
]

export const defaultNotificationPrefs: NotificationPrefs = {
  complaintUpdates: true,
  attendanceAlerts: true,
  advisorTips: true,
  emailDigest: false,
}

export const teacherClasses = [
  { code: 'SUB-05', name: 'Subject 5', section: 'Section A', room: 'Room 1', time: '09:00 – 10:30', students: 42 },
  { code: 'SUB-04', name: 'Subject 4', section: 'Section B', room: 'Room 2', time: '11:00 – 12:30', students: 38 },
  { code: 'SUB-01', name: 'Subject 1', section: 'Section C', room: 'Room 3', time: '14:00 – 15:30', students: 45 },
]

/** Values inserted by the "Demo Fill Data" button on the Login and Create Account forms. */
export const DEMO_PASSWORD = 'Demo1234'
export const demoLoginFill = {
  identifier: demoProfile.email,
  password: DEMO_PASSWORD,
}
export const demoRegisterFill = {
  name: demoProfile.name,
  studentId: demoProfile.studentId,
  email: demoProfile.email,
  department: demoProfile.department,
  password: DEMO_PASSWORD,
  confirm: DEMO_PASSWORD,
}

export const QR_DURATIONS = [1, 2, 3, 5, 10] as const
