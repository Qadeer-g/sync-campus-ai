'use client'

import { BarChart3, Lightbulb, PencilLine } from 'lucide-react'
import { SubNav } from '@/components/common/page-header'

export function AdvisorNav() {
  return (
    <SubNav
      label="Academic Advisor views"
      items={[
        { label: 'Performance Overview', href: '/advisor', icon: BarChart3 },
        { label: 'Marks Entry', href: '/advisor/marks', icon: PencilLine },
        { label: 'Study Recommendations', href: '/advisor/recommendations', icon: Lightbulb },
      ]}
    />
  )
}
