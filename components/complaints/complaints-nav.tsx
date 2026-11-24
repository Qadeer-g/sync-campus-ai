'use client'

import { ListChecks, PlusCircle } from 'lucide-react'
import { SubNav } from '@/components/common/page-header'

export function ComplaintsNav() {
  return (
    <SubNav
      label="Complaint Center views"
      items={[
        { label: 'My Complaints', href: '/complaints', icon: ListChecks },
        { label: 'New Complaint', href: '/complaints/new', icon: PlusCircle },
      ]}
    />
  )
}
