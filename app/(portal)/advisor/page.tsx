import type { Metadata } from 'next'
import { PerformanceOverview } from '@/components/advisor/performance-overview'

export const metadata: Metadata = { title: 'Performance Overview · Academic Advisor' }

export default function AdvisorPage() {
  return <PerformanceOverview />
}
