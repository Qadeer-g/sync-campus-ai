'use client'

import { GraduationCap, QrCode } from 'lucide-react'
import { SubNav } from '@/components/common/page-header'

export function AttendanceNav() {
  return (
    <SubNav
      label="QR Attendance views"
      items={[
        { label: 'Student check-in', href: '/attendance/student', icon: QrCode },
        { label: 'Teacher QR session', href: '/attendance/teacher', icon: GraduationCap },
      ]}
    />
  )
}
