import type { Metadata } from 'next'
import { ComplaintList } from '@/components/complaints/complaint-list'

export const metadata: Metadata = { title: 'My Complaints · Complaint Center' }

export default function ComplaintsPage() {
  return <ComplaintList />
}
