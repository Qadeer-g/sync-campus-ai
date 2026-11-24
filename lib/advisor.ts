import { percent } from './format'
import type { Subject } from './types'

/* ----------------------------------------------------------------------------------------------
 * Academic Advisor rules. Everything here is plain, deterministic arithmetic on the marks the
 * student entered. No AI service, no machine learning and no university system is involved.
 *
 *  percentage        = obtained ÷ total × 100, rounded to 1 decimal. Every label, weak check and
 *                      recommendation below uses this same rounded value, so what you see on
 *                      screen always matches the classification.
 *  overall score     = Σ obtained ÷ Σ total × 100 (all marks entered, across all subjects).
 *  estimated GPA     = Σ(grade point × credit hours) ÷ Σ credit hours, using the demo scale in
 *                      `gradePoint`. It is NOT an official SSUET grading scale.
 *  weak subject      = percentage below WEAK_THRESHOLD (60%). One rule used everywhere.
 *  priority          = High if weak, Medium if 60–69.9%, Low if 70% or more.
 *  study hours / wk  = credit hours × (HOURS_BASE + HOURS_PER_POINT × points below 70%),
 *                      rounded to the nearest half hour and kept between MIN_HOURS and MAX_HOURS.
 * -------------------------------------------------------------------------------------------- */

export type PerformanceBand = 'critical' | 'weak' | 'average' | 'good' | 'excellent'

export const WEAK_THRESHOLD = 60
export const CRITICAL_THRESHOLD = 50
export const COMFORT_LEVEL = 70
export const HOURS_BASE = 0.75
export const HOURS_PER_POINT = 0.06
export const MIN_HOURS = 1
export const MAX_HOURS = 12

export const isWeak = (pct: number) => pct < WEAK_THRESHOLD

export function bandFor(pct: number): PerformanceBand {
  if (pct < CRITICAL_THRESHOLD) return 'critical'
  if (pct < WEAK_THRESHOLD) return 'weak'
  if (pct < COMFORT_LEVEL) return 'average'
  if (pct < 80) return 'good'
  return 'excellent'
}

export const bandLabel: Record<PerformanceBand, string> = {
  critical: 'Critical',
  weak: 'Needs improvement',
  average: 'Average',
  good: 'Good',
  excellent: 'Excellent',
}

/** Demo grade-point scale for the "Estimated GPA" figure. Not an official SSUET scale. */
export function gradePoint(pct: number) {
  if (pct >= 85) return 4.0
  if (pct >= 80) return 3.7
  if (pct >= 75) return 3.3
  if (pct >= 70) return 3.0
  if (pct >= 65) return 2.7
  if (pct >= 60) return 2.3
  if (pct >= 55) return 2.0
  if (pct >= 50) return 1.7
  return 0
}

const round1 = (n: number) => Math.round(n * 10) / 10
const round2 = (n: number) => Math.round(n * 100) / 100
const marksText = (n: number) => `${n} mark${n === 1 ? '' : 's'}`

export type SubjectRow = Subject & { pct: number; band: PerformanceBand }

function gpaOf(rows: { pct: number; creditHours: number }[]) {
  const credits = rows.reduce((a, r) => a + r.creditHours, 0)
  return credits ? round2(rows.reduce((a, r) => a + gradePoint(r.pct) * r.creditHours, 0) / credits) : 0
}

/** Lowest percentage first; ties go to the subject with more credit hours, then by name. */
const byWeakestFirst = (a: SubjectRow, b: SubjectRow) =>
  a.pct - b.pct || b.creditHours - a.creditHours || a.name.localeCompare(b.name)

export function analyse(subjects: Subject[]) {
  const rows: SubjectRow[] = subjects.map((s) => {
    const pct = percent(s.obtained, s.total)
    return { ...s, pct, band: bandFor(pct) }
  })
  const totalObtained = round2(rows.reduce((a, r) => a + r.obtained, 0))
  const totalMarks = round2(rows.reduce((a, r) => a + r.total, 0))
  const overallPct = totalMarks ? round1((totalObtained / totalMarks) * 100) : 0
  const sorted = [...rows].sort(byWeakestFirst)
  return {
    rows,
    totalObtained,
    totalMarks,
    overallPct,
    estimatedGpa: gpaOf(rows),
    weak: sorted.filter((r) => isWeak(r.pct)),
    strongest: sorted.at(-1) ?? null,
    weakest: sorted[0] ?? null,
  }
}

/** Suggested study hours per week for one subject (see the rule at the top of this file). */
export function studyHours(pct: number, creditHours: number) {
  const pointsBelowComfort = Math.max(0, COMFORT_LEVEL - pct)
  const raw = creditHours * (HOURS_BASE + HOURS_PER_POINT * pointsBelowComfort)
  return Math.min(MAX_HOURS, Math.max(MIN_HOURS, Math.round(raw * 2) / 2))
}

/** Marks needed (rounded up) to reach `levelPct` in this subject; 0 if already there. */
export function marksToReach(s: Pick<Subject, 'obtained' | 'total'>, levelPct: number) {
  return Math.max(0, Math.ceil((s.total * levelPct) / 100 - s.obtained - 1e-9))
}

/** What the overall score and GPA would be if every weak subject just reached the target. */
export function projectionIfWeakReachTarget(subjects: Subject[]) {
  const a = analyse(subjects)
  if (!a.weak.length) return null
  const weakIds = new Set(a.weak.map((w) => w.id))
  const improved = subjects.map((s) =>
    weakIds.has(s.id) ? { ...s, obtained: Math.min(s.total, s.obtained + marksToReach(s, WEAK_THRESHOLD)) } : s,
  )
  const after = analyse(improved)
  return {
    from: { overallPct: a.overallPct, estimatedGpa: a.estimatedGpa },
    to: { overallPct: after.overallPct, estimatedGpa: after.estimatedGpa },
  }
}

export type Recommendation = {
  subject: SubjectRow
  priority: 'High' | 'Medium' | 'Low'
  hoursPerWeek: number
  reason: string
  tips: string[]
}

/**
 * Builds one recommendation per subject from that subject's actual marks, its credit hours and
 * how it compares with the other subjects. Order: weakest first.
 */
export function recommend(subjects: Subject[]): Recommendation[] {
  const a = analyse(subjects)
  const ordered = [...a.rows].sort(byWeakestFirst)
  const n = ordered.length
  const hours = ordered.map((s) => studyHours(s.pct, s.creditHours))
  const totalHours = hours.reduce((x, y) => x + y, 0)

  return ordered.map((s, idx) => {
    const h = hours[idx]
    const share = totalHours ? Math.round((h / totalHours) * 100) : 0
    const gap = Math.max(0, round1(WEAK_THRESHOLD - s.pct))
    const above = Math.max(0, round1(s.pct - WEAK_THRESHOLD))
    const vsOverall = round1(s.pct - a.overallPct)
    const short = marksToReach(s, WEAK_THRESHOLD)
    const hoursTip = `Plan about ${h} h/week for ${s.name} (${share}% of your suggested study time).`

    if (isWeak(s.pct)) {
      const after = round1(percent(Math.min(s.total, s.obtained + short), s.total))
      const gpaAfter = gpaOf(a.rows.map((r) => (r.id === s.id ? { ...r, pct: after } : r)))
      const gpaGain = round2(gpaAfter - a.estimatedGpa)
      let reason = `Scored ${s.pct}% (${s.obtained}/${s.total}), ${gap} points below the ${WEAK_THRESHOLD}% target. At least ${marksText(short)} more out of ${s.total} would reach it.`
      if (idx === 0 && n > 1) reason += ' It is your lowest-scoring subject.'
      else if (vsOverall < 0) reason += ` It is ${Math.abs(vsOverall)} points below your overall score of ${a.overallPct}%.`
      const tips = [hoursTip]
      if (gap > 15) tips.push('The gap is large, so rebuild fundamentals first: revisit the earliest topics before new material.')
      else if (gap > 5) tips.push('Find the topics where you lost the most marks and practise those first.')
      else tips.push(`You are close: about ${marksText(short)} would reach the target, so focus on careful revision of topics already covered.`)
      if (gpaGain >= 0.01) tips.push(`Reaching ${WEAK_THRESHOLD}% here would lift your estimated GPA from ${a.estimatedGpa.toFixed(2)} to ${gpaAfter.toFixed(2)} (demo scale).`)
      if (idx === 0 && n > 1) tips.push('This is your weakest subject, so study it first in each week.')
      return { subject: s, priority: 'High' as const, hoursPerWeek: h, reason, tips }
    }

    if (s.pct < COMFORT_LEVEL) {
      const buffer = round1(s.obtained - (s.total * WEAK_THRESHOLD) / 100)
      const toComfort = marksToReach(s, COMFORT_LEVEL)
      const tips = [hoursTip, `Raising this to ${COMFORT_LEVEL}% would need ${marksText(toComfort)} more out of ${s.total}.`]
      if (a.weak.length) tips.push('Your weak subjects need the extra time first, so protect this one with short, regular revision.')
      return {
        subject: s,
        priority: 'Medium' as const,
        hoursPerWeek: h,
        reason: `Scored ${s.pct}%, ${above} points above the ${WEAK_THRESHOLD}% target. That is a buffer of ${marksText(buffer)}, so a small drop could make it weak.`,
        tips,
      }
    }

    const strongest = idx === n - 1 && n > 1
    const tips = [`${h} h/week is enough to maintain this subject (${share}% of your suggested study time).`]
    if (strongest) {
      tips.push(
        a.weak.length
          ? 'This is your strongest subject, so it can give up some time to weaker subjects when your week gets busy.'
          : 'This is your strongest subject. A short weekly revision session is enough to keep it there.',
      )
    }
    if (tips.length < 2) tips.push('A short weekly revision session is enough to hold this score.')
    return {
      subject: s,
      priority: 'Low' as const,
      hoursPerWeek: h,
      reason: `Scored ${s.pct}%, ${above} points above the target${vsOverall > 0 ? ` and ${vsOverall} above your overall score of ${a.overallPct}%` : ''}.`,
      tips,
    }
  })
}

export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export function weeklyPlan(recs: Recommendation[]) {
  const plan: Record<(typeof WEEK_DAYS)[number], { subject: string; code: string; hours: number }[]> = {
    Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [],
  }
  let dayIndex = 0
  for (const rec of recs) {
    let remaining = rec.hoursPerWeek
    while (remaining > 0) {
      const block = Math.min(2, remaining)
      const day = WEEK_DAYS[dayIndex % WEEK_DAYS.length]
      plan[day].push({ subject: rec.subject.name, code: rec.subject.code, hours: block })
      remaining -= block
      dayIndex++
    }
  }
  return plan
}
