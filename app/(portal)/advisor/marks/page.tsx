import type { Metadata } from 'next'
import { MarksEntry } from '@/components/advisor/marks-entry'

export const metadata: Metadata = { title: 'Marks Entry · Academic Advisor' }

export default function MarksPage() {
  return <MarksEntry />
}
