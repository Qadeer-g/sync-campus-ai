import type { Metadata } from 'next'
import { ComplaintDetail } from '@/components/complaints/complaint-detail'

export async function generateMetadata({ params }: { params: Promise<{ ticketId: string }> }): Promise<Metadata> {
  const { ticketId } = await params
  return { title: `${ticketId} · Complaint Center` }
}

export default async function ComplaintDetailPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params
  return <ComplaintDetail ticketId={ticketId} />
}
