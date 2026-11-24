'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight, Award, TrendingDown } from 'lucide-react'
import { Badge, DemoBadge, type BadgeTone } from '@/components/common/badge'
import { Card, CardContent, CardHeader } from '@/components/common/card'
import { Button } from '@/components/ui/button'
import { analyse, bandLabel, WEAK_THRESHOLD, type PerformanceBand } from '@/lib/advisor'
import { formatDateTime } from '@/lib/format'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'

export const bandTone: Record<PerformanceBand, BadgeTone> = {
  critical: 'danger',
  weak: 'warning',
  average: 'neutral',
  good: 'brand',
  excellent: 'success',
}

const barColor: Record<PerformanceBand, string> = {
  critical: 'bg-destructive',
  weak: 'bg-warning',
  average: 'bg-muted-foreground/60',
  good: 'bg-brand',
  excellent: 'bg-success',
}

export function PerformanceOverview() {
  const { subjects, analysedAt } = useApp()
  const { rows, overallPct, totalObtained, totalMarks, estimatedGpa, weak, strongest, weakest } = analyse(subjects)

  if (!rows.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-base font-bold">No subjects yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add your marks to see a performance overview.</p>
          <Button asChild className="mt-5">
            <Link href="/advisor/marks">Go to Marks Entry</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Overall score" value={`${overallPct}%`} hint={`${totalObtained} of ${totalMarks} marks`} />
        <Kpi label="Estimated GPA" value={estimatedGpa.toFixed(2)} hint="Credit-weighted · demo 4.0 scale" />
        <Kpi
          label="Strongest subject"
          value={strongest ? `${strongest.pct}%` : '—'}
          hint={strongest?.name ?? ''}
          icon={<Award className="size-4 text-success" />}
        />
        <Kpi
          label="Weak subjects"
          value={String(weak.length)}
          hint={`Below ${WEAK_THRESHOLD}% target`}
          icon={<TrendingDown className="size-4 text-destructive" />}
          danger={weak.length > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Subject-wise performance"
            description={analysedAt ? `Last analysed ${formatDateTime(analysedAt)}` : 'Not yet analysed'}
            action={<DemoBadge />}
          />
          <CardContent>
            <div className="relative">
              <ul className="flex flex-col gap-4" aria-label="Subject percentages">
                {rows.map((r) => (
                  <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_56px] gap-x-3 gap-y-1.5 sm:grid-cols-[180px_minmax(0,1fr)_56px] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.code}</p>
                    </div>
                    <p className="text-right text-sm font-bold sm:order-last">{r.pct}%</p>
                    <div className="relative col-span-2 h-2.5 rounded-full bg-muted sm:col-span-1">
                      <div className={cn('h-full rounded-full', barColor[r.band])} style={{ width: `${Math.min(100, r.pct)}%` }} />
                      <span
                        aria-hidden="true"
                        className="absolute -top-1 h-4.5 w-px bg-foreground/40"
                        style={{ left: `${WEAK_THRESHOLD}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-3 w-px bg-foreground/40" /> {WEAK_THRESHOLD}% target line</span>
              {(['critical', 'weak', 'average', 'good', 'excellent'] as const).map((b) => (
                <span key={b} className="flex items-center gap-1.5">
                  <span className={cn('size-2.5 rounded-sm', barColor[b])} />
                  {bandLabel[b]}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Weak subject identification" />
          <CardContent>
            {weak.length ? (
              <ul className="flex flex-col gap-3">
                {weak.map((w) => (
                  <li key={w.id} className="rounded-lg border border-destructive/25 bg-destructive/5 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold">{w.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {w.obtained}/{w.total} · {(WEAK_THRESHOLD - w.pct).toFixed(1)} pts below target
                        </p>
                      </div>
                      <Badge tone={bandTone[w.band]}>{w.pct}%</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex gap-3 rounded-lg bg-success/10 p-4 text-sm">
                <Award className="mt-0.5 size-4 shrink-0 text-success" />
                <p>All subjects are at or above the {WEAK_THRESHOLD}% target. Keep it up.</p>
              </div>
            )}
            {weakest && weak.length ? (
              <p className="mt-4 flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                Focus first on {weakest.name} — it has the largest gap to the target.
              </p>
            ) : null}
            <Button asChild className="mt-5 w-full">
              <Link href="/advisor/recommendations">
                View study recommendations
                <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Marks overview"
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/advisor/marks">Edit marks</Link>
            </Button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                <th scope="col" className="px-5 py-3 sm:px-6">Subject</th>
                <th scope="col" className="px-3 py-3">Credits</th>
                <th scope="col" className="px-3 py-3">Obtained</th>
                <th scope="col" className="px-3 py-3">Total</th>
                <th scope="col" className="px-3 py-3">Percentage</th>
                <th scope="col" className="px-5 py-3 sm:px-6">Indicator</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3 sm:px-6">
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.code}</p>
                  </td>
                  <td className="px-3 py-3">{r.creditHours}</td>
                  <td className="px-3 py-3">{r.obtained}</td>
                  <td className="px-3 py-3">{r.total}</td>
                  <td className="px-3 py-3 font-bold">{r.pct}%</td>
                  <td className="px-5 py-3 sm:px-6"><Badge tone={bandTone[r.band]}>{bandLabel[r.band]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function Kpi({
  label,
  value,
  hint,
  icon,
  danger,
}: {
  label: string
  value: string
  hint: string
  icon?: React.ReactNode
  danger?: boolean
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className={cn('mt-2 text-2xl font-extrabold sm:text-[28px]', danger && 'text-destructive')}>{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
    </Card>
  )
}
