'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ChevronRight, Paperclip, Plus, Search } from 'lucide-react'
import { DemoBadge, StatusBadge } from '@/components/common/badge'
import { Card } from '@/components/common/card'
import { Input, Select } from '@/components/common/field'
import { Notice } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { useApp } from '@/lib/store'
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES, type ComplaintStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

export function ComplaintList() {
  const { complaints, skippedComplaints } = useApp()
  const [hideSkippedNote, setHideSkippedNote] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ComplaintStatus | 'All'>('All')
  const [category, setCategory] = useState('All')

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: complaints.length }
    for (const s of COMPLAINT_STATUSES) c[s] = complaints.filter((x) => x.status === s).length
    return c
  }, [complaints])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    // Newest first (by creation date), regardless of the order the data is stored in.
    const newestFirst = [...complaints].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    return newestFirst.filter((c) => {
      if (status !== 'All' && c.status !== status) return false
      if (category !== 'All' && c.category !== category) return false
      if (!q) return true
      return (
        c.title.toLowerCase().includes(q) ||
        c.ticketId.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      )
    })
  }, [complaints, query, status, category])

  return (
    <div className="flex flex-col gap-6">
      {skippedComplaints > 0 && !hideSkippedNote ? (
        <Notice tone="warning" title="Some saved complaints could not be shown">
          {skippedComplaints === 1 ? '1 saved complaint was' : `${skippedComplaints} saved complaints were`} in an unreadable format and{' '}
          {skippedComplaints === 1 ? 'was' : 'were'} set aside so this page keeps working.
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setHideSkippedNote(true)}>
            Dismiss
          </Button>
        </Notice>
      ) : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="Filter by status">
        {(['All', ...COMPLAINT_STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => setStatus(s)}
            className={cn(
              'cursor-pointer rounded-xl border bg-card px-4 py-3 text-left shadow-xs transition-colors',
              status === s ? 'border-primary ring-1 ring-primary' : 'hover:border-brand/40',
              s === 'All' && 'col-span-2 sm:col-span-1',
            )}
          >
            <span className="block text-xs font-semibold text-muted-foreground">{s === 'All' ? 'All complaints' : s}</span>
            <span className="mt-1 block text-2xl font-extrabold">{counts[s]}</span>
          </button>
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="relative flex-1">
            <label htmlFor="cmp-search" className="sr-only">Search complaints</label>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="cmp-search" type="search" placeholder="Search by ticket ID, title or location" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
          <label htmlFor="cmp-cat" className="sr-only">Filter by category</label>
          <Select id="cmp-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-56">
            <option value="All">All categories</option>
            {COMPLAINT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Button asChild className="sm:w-auto">
            <Link href="/complaints/new"><Plus /> New complaint</Link>
          </Button>
        </div>

        <p className="border-b px-5 py-2 text-xs font-semibold text-muted-foreground sm:px-6" aria-live="polite">
          Showing {filtered.length} of {complaints.length}
        </p>

        {filtered.length ? (
          <ul className="divide-y">
            {filtered.map((c) => (
              <li key={c.id}>
                <Link href={`/complaints/${c.ticketId}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/60 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-mono text-xs font-semibold text-muted-foreground">{c.ticketId}</span>
                      {c.isDemo ? <DemoBadge /> : null}
                      {c.unreadCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">
                          <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
                          {c.unreadCount === 1 ? 'New update' : `${c.unreadCount} new updates`}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-sm font-bold">{c.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {c.category}{c.location ? ` · ${c.location}` : ''} · Updated {formatDate(c.updatedAt)}
                      {c.attachmentName ? <Paperclip className="size-3" aria-label="Has attachment" /> : null}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-bold">No complaints found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search or filter.</p>
            <Button variant="outline" className="mt-4" onClick={() => { setQuery(''); setStatus('All'); setCategory('All') }}>Clear filters</Button>
          </div>
        )}
      </Card>
    </div>
  )
}
