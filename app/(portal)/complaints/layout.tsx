import { ComplaintsNav } from '@/components/complaints/complaints-nav'
import { PageHeader } from '@/components/common/page-header'
import { DemoBadge } from '@/components/common/badge'
import { Notice } from '@/components/common/page-header'

export default function ComplaintsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader
        title="Complaint Center"
        description="Create a demo complaint, get a demo ticket ID and follow its status from Submitted to Resolved."
        badge={<DemoBadge />}
      />
      <Notice tone="warning" title="Local Demo — Not submitted to SSUET." className="mb-4">
        Complaints and their status updates exist only in this browser. No university office receives them.
      </Notice>
      <ComplaintsNav />
      {children}
    </>
  )
}
