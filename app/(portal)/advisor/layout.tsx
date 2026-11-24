import { AdvisorNav } from '@/components/advisor/advisor-nav'
import { PageHeader } from '@/components/common/page-header'
import { PrototypeBadge } from '@/components/common/badge'

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader
        title="AI Academic Advisor"
        description="Track subject-wise performance, update your marks and get rule-based study recommendations. This prototype uses transparent scoring rules, not machine learning."
        badge={<PrototypeBadge />}
      />
      <AdvisorNav />
      {children}
    </>
  )
}
