import type { Metadata } from 'next'
import { StudentCheckIn } from '@/components/attendance/student-checkin'

export const metadata: Metadata = { title: 'Student check-in · QR Attendance' }

export default function StudentAttendancePage() {
  return <StudentCheckIn />
}
