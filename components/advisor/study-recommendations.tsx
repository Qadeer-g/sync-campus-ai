'use client'

import Link from 'next/link'
import { CheckCircle2, Clock, Info } from 'lucide-react'
import { Badge, DemoBadge, type BadgeTone } from '@/components/common/badge'
import { Card, CardContent, CardHeader } from '@/components/common/card'
import { Notice } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import {
  COMFORT_LEVEL,
  HOURS_BASE,
  HOURS_PER_POINT,
  isWeak,
  MAX_HOURS,
  MIN_HOURS,
  projectionIfWeakReachTarget,
  recommend,
  WEAK_THRESHOLD,
  WEEK_DAYS,
  weeklyPlan,
} from '@/lib/advisor'
import { useApp } from '@/lib/store'

const priorityTone: Record<'High' | 'Medium' | 'Low', BadgeTone> = { High: 'danger', Medium: 'warning', Low: 'success' }

export function StudyRecommendations() {
  const { subjects } = useApp()
  const recs = recommend(subjects)
  const weak = recs.filter((r) => isWeak(r.subject.pct))
  const projection = projectionIfWeakReachTarget(subjects)
  const plan = weeklyPlan(recs)
  const totalHours = recs.reduce((a, r) => a + r.hoursPerWeek, 0)

  if (!recs.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-base font-bold">No recommendations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add your marks to generate a study plan.</p>
          <Button asChild className="mt-5"><Link href="/advisor/marks">Go to Marks Entry</Link></Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Notice title="How these recommendations work">
        Subjects below {WEAK_THRESHOLD}% are marked weak and get high priority; {WEAK_THRESHOLD}–{COMFORT_LEVEL - 0.1}% is medium and{' '}
        {COMFORT_LEVEL}%+ is low. Suggested study hours = credit hours × ({HOURS_BASE} + {HOURS_PER_POINT} × points below{' '}
        {COMFORT_LEVEL}%), rounded to the nearest half hour and kept between {MIN_HOURS} and {MAX_HOURS} hours. The reasons and tips
        use your own marks. These are simple rules for this prototype, not machine-learning predictions.
      </Notice>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Identified weak subjects" action={<DemoBadge />} />
          <CardContent>
            {weak.length ? (
              <ul className="flex flex-col gap-3">
                {weak.map((r) => (
                  <li key={r.subject.id} className="flex items-center justify-between gap-3 rounded-lg border px-3.5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{r.subject.name}</p>
                      <p className="text-xs text-muted-foreground">{r.subject.code}</p>
                    </div>
                    <Badge tone="danger">{r.subject.pct}%</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex gap-2 text-sm"><CheckCircle2 className="size-4 shrink-0 text-success" /> No weak subjects detected.</p>
            )}
            {projection ? (
              <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
                If every weak subject reached {WEAK_THRESHOLD}%, your overall score would go from {projection.from.overallPct}% to{' '}
                {projection.to.overallPct}% and your estimated GPA from {projection.from.estimatedGpa.toFixed(2)} to{' '}
                {projection.to.estimatedGpa.toFixed(2)} (demo scale).
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Suggested study priorities" description={`${totalHours} hours of focused study per week`} />
          <ol className="divide-y">
            {recs.map((r, i) => (
              <li key={r.subject.id} className="flex items-center gap-4 px-5 py-3.5 sm:px-6">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.subject.name}</p>
                  <p className="text-xs text-muted-foreground">{r.subject.pct}% current score</p>
                </div>
                <span className="hidden items-center gap-1 text-xs font-semibold text-muted-foreground sm:flex">
                  <Clock className="size-3.5" /> {r.hoursPerWeek} h/week
                </span>
                <Badge tone={priorityTone[r.priority]}>{r.priority}</Badge>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card>
        <CardHeader title="Personalised study suggestions" description="Why each subject needs attention and what to do next" />
        <div className="grid gap-px bg-border md:grid-cols-2">
          {recs.map((r) => (
            <article key={r.subject.id} className="bg-card px-5 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-bold">{r.subject.name}</h3>
                <Badge tone={priorityTone[r.priority]}>{r.priority} priority</Badge>
              </div>
              <p className="mt-2 flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <span><span className="font-semibold text-foreground">Why: </span>{r.reason}</span>
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {r.tips.map((t) => (
                  <li key={t} className="flex gap-2 text-sm leading-relaxed">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" />
                    {t}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Weekly study recommendation" description="Sessions are split into blocks of up to 2 hours, highest priority first" action={<DemoBadge />} />
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {WEEK_DAYS.map((day) => {
              const blocks = plan[day]
              const hours = blocks.reduce((a, b) => a + b.hours, 0)
              return (
                <li key={day} className="flex flex-col rounded-lg border bg-background p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">{day}</p>
                    <p className="text-xs font-semibold text-muted-foreground">{hours} h</p>
                  </div>
                  <ul className="mt-2.5 flex flex-col gap-2">
                    {blocks.length ? (
                      blocks.map((b, i) => (
                        <li key={`${b.code}-${i}`} className="rounded-md bg-accent px-2.5 py-2">
                          <p className="text-xs leading-snug font-semibold text-accent-foreground">{b.subject}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{b.hours} h</p>
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-muted-foreground">Rest day</li>
                    )}
                  </ul>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
