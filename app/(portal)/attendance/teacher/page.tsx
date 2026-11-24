import type { Metadata } from 'next'
import { TeacherSession } from '@/components/attendance/teacher-session'

export const metadata: Metadata = { title: 'Teacher QR session · QR Attendance' }

export default function TeacherAttendancePage() {
  return <TeacherSession />
}
