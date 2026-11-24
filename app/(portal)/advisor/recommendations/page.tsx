import type { Metadata } from 'next'
import { StudyRecommendations } from '@/components/advisor/study-recommendations'

export const metadata: Metadata = { title: 'Study Recommendations · Academic Advisor' }

export default function RecommendationsPage() {
  return <StudyRecommendations />
}
