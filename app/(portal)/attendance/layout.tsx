import { AttendanceNav } from '@/components/attendance/attendance-nav'
import { DemoBadge } from '@/components/common/badge'
import { Notice, PageHeader } from '@/components/common/page-header'

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader
        title="QR Attendance"
        description="Try the full attendance flow: a teacher view that creates a time-limited QR session, and a student view that checks in with the QR code or a backup PIN."
        badge={<DemoBadge />}
      />
      <Notice tone="warning" title="Local Demo — no real SSUET attendance records." className="mb-4">
        Sessions and check-ins are saved only in this browser, and both views work here so you can try everything on one device.
        Nothing is sent to SSUET or any server.
      </Notice>
      <AttendanceNav />
      {children}
    </>
  )
}
