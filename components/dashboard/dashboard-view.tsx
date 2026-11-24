'use client'

import Link from 'next/link'
import {
  ArrowRight,
  ClipboardCheck,
  GraduationCap,
  MessageSquareWarning,
  QrCode,
  User,
} from 'lucide-react'
import { Avatar } from '@/components/common/avatar'
import { Badge, DemoBadge } from '@/components/common/badge'
import { Card, CardContent, CardHeader } from '@/components/common/card'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { analyse } from '@/lib/advisor'
import { formatDateTime } from '@/lib/format'
import { useApp } from '@/lib/store'
import type { ActivityItem } from '@/lib/types'

const activityIcon: Record<ActivityItem['kind'], React.ComponentType<{ className?: string }>> = {
  attendance: ClipboardCheck,
  complaint: MessageSquareWarning,
  advisor: GraduationCap,
  profile: User,
}

export function DashboardView() {
  const { profile, subjects, complaints, attendance, activity } = useApp()
  const { overallPct, estimatedGpa, weak } = analyse(subjects)
  const openComplaints = complaints.filter((c) => c.status !== 'Resolved').length
  const firstName = profile.name.split(' ')[0]

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here is an overview of your academic profile and recent activity."
        badge={<DemoBadge />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Student profile" action={<DemoBadge />} />
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar name={profile.name} src={profile.avatarUrl} className="size-14 text-base" />
              <div className="min-w-0">
                <p className="truncate text-base font-bold">{profile.name}</p>
                <p className="truncate text-sm text-muted-foreground">{profile.studentId}</p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
              <div className="col-span-2">
                <dt className="text-xs font-semibold text-muted-foreground">Program</dt>
                <dd className="mt-0.5 font-semibold">{profile.program}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted-foreground">Semester</dt>
                <dd className="mt-0.5 font-semibold">{profile.semester}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted-foreground">Batch</dt>
                <dd className="mt-0.5 font-semibold">{profile.batch}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-semibold text-muted-foreground">Email</dt>
                <dd className="mt-0.5 truncate font-semibold">{profile.email}</dd>
              </div>
            </dl>
            <Button asChild variant="outline" className="mt-5 w-full">
              <Link href="/settings">Edit profile</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <QuickCard
              href="/attendance/student"
              icon={QrCode}
              title="QR Attendance"
              body="Scan your class QR code or enter a backup PIN to check in."
              cta="Mark attendance"
              variant="navy"
            />
            <QuickCard
              href="/complaints"
              icon={MessageSquareWarning}
              title="Complaint Center"
              body="Raise an issue and track it from Submitted through to Resolved."
              cta="Open Complaint Center"
            />
          </div>

          <Card>
            <CardHeader title="At a glance" description="Calculated from your current records" action={<DemoBadge />} />
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat label="Overall score" value={`${overallPct}%`} href="/advisor" />
                <Stat label="Est. GPA" value={estimatedGpa.toFixed(2)} href="/advisor" />
                <Stat label="Weak subjects" value={String(weak.length)} href="/advisor/recommendations" tone={weak.length ? 'danger' : undefined} />
                <Stat label="Open complaints" value={String(openComplaints)} href="/complaints" />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Recent activity" action={<DemoBadge />} />
          <ul className="divide-y">
            {activity.slice(0, 6).map((a) => {
              const Icon = activityIcon[a.kind]
              return (
                <li key={a.id} className="flex items-center gap-4 px-5 py-3.5 sm:px-6">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.title}</p>
                    <p className="truncate text-[13px] text-muted-foreground">{a.detail}</p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground" dateTime={a.date}>
                    {formatDateTime(a.date)}
                  </time>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Recent attendance"
            description={`${attendance.length} total check-in${attendance.length === 1 ? '' : 's'}`}
            action={<DemoBadge />}
          />
          <ul className="divide-y">
            {attendance.slice(0, 4).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{r.subjectName}</p>
                  <p className="text-[13px] text-muted-foreground">{formatDateTime(r.markedAt)}</p>
                </div>
                <Badge tone="success">Present</Badge>
              </li>
            ))}
          </ul>
          <div className="border-t px-5 py-3 sm:px-6">
            <Link href="/attendance/student" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
              Open QR Attendance
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </Card>
      </div>
    </>
  )
}

function QuickCard({
  href,
  icon: Icon,
  title,
  body,
  cta,
  variant = 'light',
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
  cta: string
  variant?: 'light' | 'navy'
}) {
  const navy = variant === 'navy'
  return (
    <Link
      href={href}
      className={
        navy
          ? 'group flex flex-col rounded-xl bg-primary p-6 text-primary-foreground shadow-xs outline-none transition-opacity hover:opacity-95 focus-visible:ring-3 focus-visible:ring-ring/40'
          : 'group flex flex-col rounded-xl border bg-card p-6 shadow-xs outline-none transition-colors hover:border-brand/40 focus-visible:ring-3 focus-visible:ring-ring/40'
      }
    >
      <span
        className={
          navy
            ? 'flex size-12 items-center justify-center rounded-lg bg-primary-foreground/12'
            : 'flex size-12 items-center justify-center rounded-lg bg-accent text-accent-foreground'
        }
      >
        <Icon className="size-6" />
      </span>
      <h2 className="mt-5 text-lg font-bold">{title}</h2>
      <p className={navy ? 'mt-1.5 text-sm leading-relaxed text-primary-foreground/75' : 'mt-1.5 text-sm leading-relaxed text-muted-foreground'}>
        {body}
      </p>
      <span className={navy ? 'mt-5 inline-flex items-center gap-1 text-sm font-semibold' : 'mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand'}>
        {cta}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

function Stat({ label, value, href, tone }: { label: string; value: string; href: string; tone?: 'danger' }) {
  return (
    <Link href={href} className="rounded-lg border bg-background px-4 py-3.5 transition-colors hover:border-brand/40">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className={tone === 'danger' ? 'mt-1 text-2xl font-extrabold text-destructive' : 'mt-1 text-2xl font-extrabold'}>{value}</dd>
    </Link>
  )
}
