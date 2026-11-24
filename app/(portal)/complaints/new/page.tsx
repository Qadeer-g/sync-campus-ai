import type { Metadata } from 'next'
import { ComplaintForm } from '@/components/complaints/complaint-form'

export const metadata: Metadata = { title: 'New Complaint · Complaint Center' }

export default function NewComplaintPage() {
  return <ComplaintForm />
}
