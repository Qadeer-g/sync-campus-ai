'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { ArrowLeft, Check, Paperclip } from 'lucide-react'
import { DemoBadge, StatusBadge } from '@/components/common/badge'
import { Card, CardContent, CardHeader } from '@/components/common/card'
import { Button } from '@/components/ui/button'
import { formatDate, formatDateTime } from '@/lib/format'
import { useApp } from '@/lib/store'
import { COMPLAINT_STATUSES, nextComplaintStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

export function ComplaintDetail({ ticketId }: { ticketId: string }) {
  const { complaints, markComplaintAsRead, advanceComplaintStatus } = useApp()
  const key = decodeURIComponent(ticketId).toLowerCase()
  // Match the ticket ID (used in links) or the internal id, so older links keep working.
  const c = complaints.find((x) => x.ticketId.toLowerCase() === key || x.id.toLowerCase() === key)

  // Opening a complaint marks its updates as read (shared store, persisted). It also re-runs when a
  // new update arrives while the page is open, because the user is looking at it.
  const openedId = c?.id
  const unreadCount = c?.unreadCount ?? 0
  useEffect(() => {
    if (openedId) markComplaintAsRead(openedId)
  }, [openedId, unreadCount, markComplaintAsRead])

  if (!c) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-base font-bold">Complaint not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No complaint with ticket ID {decodeURIComponent(ticketId)} exists in this browser&apos;s local demo data.
          </p>
          <Button asChild className="mt-5"><Link href="/complaints">Back to my complaints</Link></Button>
        </CardContent>
      </Card>
    )
  }

  const stepIndex = COMPLAINT_STATUSES.indexOf(c.status)
  const nextStatus = nextComplaintStatus(c.status)

  return (
    <div className="flex flex-col gap-6">
      <Link href="/complaints" className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="size-4" /> All complaints
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader
            title={c.title}
            description={`${c.ticketId} · ${c.category}`}
            action={<div className="flex items-center gap-2">{c.isDemo ? <DemoBadge /> : null}<StatusBadge status={c.status} /></div>}
          />
          <CardContent className="flex flex-col gap-6">
            <ol className="grid grid-cols-3 gap-2" aria-label="Progress">
              {COMPLAINT_STATUSES.map((s, i) => {
                const done = i <= stepIndex
                return (
                  <li key={s} className="flex flex-col gap-2" aria-current={i === stepIndex ? 'step' : undefined}>
                    <span className={cn('h-1.5 rounded-full', done ? 'bg-brand' : 'bg-muted')} />
                    <span className={cn('text-[11px] font-semibold sm:text-xs', done ? 'text-foreground' : 'text-muted-foreground')}>{s}</span>
                  </li>
                )
              })}
            </ol>
            <div>
              <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Description</h3>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">{c.description}</p>
            </div>
            {c.attachmentName ? (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3 text-sm">
                <Paperclip className="size-4 text-muted-foreground" />
                <span className="truncate font-medium">{c.attachmentName}</span>
                <span className="ml-auto text-xs text-muted-foreground">Prototype · file not stored</span>
              </div>
            ) : null}
            <dl className="grid grid-cols-2 gap-4 border-t pt-5 text-sm">
              <div className="col-span-2"><dt className="text-xs font-semibold text-muted-foreground">Location</dt><dd className="mt-0.5 font-semibold">{c.location || 'Not provided'}</dd></div>
              <div><dt className="text-xs font-semibold text-muted-foreground">Submitted</dt><dd className="mt-0.5 font-semibold">{formatDate(c.createdAt)}</dd></div>
              <div><dt className="text-xs font-semibold text-muted-foreground">Last updated</dt><dd className="mt-0.5 font-semibold">{formatDate(c.updatedAt)}</dd></div>
            </dl>
            <div className="flex flex-col gap-3 rounded-lg border border-dashed border-warning/40 bg-warning/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <DemoBadge />
                  <p className="text-sm font-semibold">Demo control</p>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {nextStatus
                    ? `Local Demo — Not submitted to SSUET. Moves this ticket to "${nextStatus}" and adds a history entry.`
                    : 'Resolved — this ticket is at the final stage and cannot move further.'}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={!nextStatus} onClick={() => advanceComplaintStatus(c.id)}>
                Move to next status
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader title="Status history" />
          <CardContent>
            <ol className="flex flex-col">
              {[...c.history].reverse().map((h, i, arr) => (
                <li key={`${h.status}-${h.date}-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < arr.length - 1 ? <span aria-hidden="true" className="absolute top-6 bottom-0 left-[11px] w-px bg-border" /> : null}
                  <span className={cn('relative flex size-6 shrink-0 items-center justify-center rounded-full', i === 0 ? 'bg-brand text-white' : 'bg-muted text-muted-foreground')}>
                    <Check className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{h.status}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(h.date)}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{h.note}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
