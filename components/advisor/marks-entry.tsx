'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { Badge, DemoBadge } from '@/components/common/badge'
import { Card, CardContent, CardHeader } from '@/components/common/card'
import { FieldError, Input, Label, Select } from '@/components/common/field'
import { Notice } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { bandFor, bandLabel } from '@/lib/advisor'
import { percent } from '@/lib/format'
import { useApp } from '@/lib/store'
import type { Subject } from '@/lib/types'
import { bandTone } from './performance-overview'

type Draft = { id?: string; code: string; name: string; creditHours: string; obtained: string; total: string }
type Errors = Partial<Record<keyof Draft, string>>

const empty: Draft = { code: '', name: '', creditHours: '3', obtained: '', total: '100' }

function validate(d: Draft, existing: Subject[]): Errors {
  const e: Errors = {}
  if (d.name.trim().length < 2) e.name = 'Enter the subject name.'
  else if (existing.some((s) => s.id !== d.id && s.name.trim().toLowerCase() === d.name.trim().toLowerCase()))
    e.name = 'A subject with this name already exists. Edit it from the list instead.'
  const total = Number(d.total)
  const obtained = Number(d.obtained)
  if (!d.total || !Number.isFinite(total) || total <= 0) e.total = 'Total must be greater than 0.'
  if (d.obtained === '' || !Number.isFinite(obtained) || obtained < 0) e.obtained = 'Enter obtained marks (0 or more).'
  else if (!e.total && obtained > total) e.obtained = 'Obtained marks cannot exceed total marks.'
  return e
}

export function MarksEntry() {
  const router = useRouter()
  const { subjects, upsertSubject, removeSubject, submitAnalysis } = useApp()
  const [draft, setDraft] = useState<Draft>(empty)
  const [errors, setErrors] = useState<Errors>({})
  const [saved, setSaved] = useState<string | null>(null)

  const editing = Boolean(draft.id)
  const livePct =
    draft.obtained !== '' && Number(draft.total) > 0 && Number(draft.obtained) <= Number(draft.total)
      ? percent(Number(draft.obtained), Number(draft.total))
      : null

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setDraft((d) => ({ ...d, [k]: e.target.value }))
    setErrors((er) => ({ ...er, [k]: undefined }))
    setSaved(null)
  }

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    const e = validate(draft, subjects)
    setErrors(e)
    if (Object.keys(e).length) return
    const subject: Omit<Subject, 'id'> & { id?: string } = {
      id: draft.id,
      code: draft.code.trim().toUpperCase() || 'N/A',
      name: draft.name.trim(),
      creditHours: Number(draft.creditHours),
      obtained: Number(draft.obtained),
      total: Number(draft.total),
    }
    upsertSubject(subject)
    setSaved(editing ? `Updated ${subject.name}.` : `Added ${subject.name}.`)
    setDraft(empty)
  }

  const startEdit = (s: Subject) => {
    setDraft({
      id: s.id,
      code: s.code,
      name: s.name,
      creditHours: String(s.creditHours),
      obtained: String(s.obtained),
      total: String(s.total),
    })
    setErrors({})
    setSaved(null)
    document.getElementById('mk-name')?.focus()
  }

  const analyseNow = () => {
    submitAnalysis()
    router.push('/advisor')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <Card className="self-start">
        <CardHeader
          title={editing ? 'Edit subject' : 'Add subject'}
          description="Percentage is calculated automatically."
          action={
            editing ? (
              <Button variant="ghost" size="sm" onClick={() => { setDraft(empty); setErrors({}) }}>
                <X />
                Cancel
              </Button>
            ) : null
          }
        />
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <div>
              <Label htmlFor="mk-name">Subject name</Label>
              <Input id="mk-name" value={draft.name} onChange={set('name')} placeholder="e.g. Subject 7" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'mk-name-err' : undefined} />
              <FieldError id="mk-name-err">{errors.name}</FieldError>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mk-code">Subject code (optional)</Label>
                <Input id="mk-code" value={draft.code} onChange={set('code')} placeholder="SUB-07" />
              </div>
              <div>
                <Label htmlFor="mk-credits">Credit hours</Label>
                <Select id="mk-credits" value={draft.creditHours} onChange={set('creditHours')}>
                  {[1, 2, 3, 4].map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mk-obtained">Obtained marks</Label>
                <Input id="mk-obtained" type="number" inputMode="decimal" min={0} step="any" value={draft.obtained} onChange={set('obtained')} placeholder="72" aria-invalid={!!errors.obtained} aria-describedby={errors.obtained ? 'mk-ob-err' : undefined} />
              </div>
              <div>
                <Label htmlFor="mk-total">Total marks</Label>
                <Input id="mk-total" type="number" inputMode="decimal" min={1} step="any" value={draft.total} onChange={set('total')} aria-invalid={!!errors.total} aria-describedby={errors.total ? 'mk-tot-err' : undefined} />
              </div>
            </div>
            <FieldError id="mk-ob-err">{errors.obtained}</FieldError>
            <FieldError id="mk-tot-err">{errors.total}</FieldError>

            <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3" aria-live="polite">
              <span className="text-sm font-semibold text-muted-foreground">Calculated percentage</span>
              <span className="text-lg font-extrabold">{livePct === null ? '—' : `${livePct}%`}</span>
            </div>

            <Button type="submit" className="w-full">
              {editing ? <Pencil /> : <Plus />}
              {editing ? 'Save changes' : 'Add subject'}
            </Button>
            {saved ? <Notice tone="success" title={saved} /> : null}
          </form>
        </CardContent>
      </Card>

      <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader title="Subject records" description={`${subjects.length} subjects`} action={<DemoBadge />} />
          {subjects.length ? (
            <ul className="divide-y">
              {subjects.map((s) => {
                const pct = percent(s.obtained, s.total)
                const band = bandFor(pct)
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 sm:px-6">
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="truncate text-sm font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.code} · {s.creditHours} credit hours · {s.obtained}/{s.total}</p>
                    </div>
                    <span className="w-14 text-right text-sm font-bold">{pct}%</span>
                    <Badge tone={bandTone[band]} className="hidden sm:inline-flex">{bandLabel[band]}</Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" aria-label={`Edit ${s.name}`} onClick={() => startEdit(s)}>
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${s.name}`}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          removeSubject(s.id)
                          if (draft.id === s.id) setDraft(empty)
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <CardContent>
              <p className="text-sm text-muted-foreground">No subjects yet. Add your first subject using the form.</p>
            </CardContent>
          )}
        </Card>

        <Card className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <p className="text-base font-bold">Ready for analysis?</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Results update as soon as you save a change. Submit to review them in the performance overview.</p>
          </div>
          <Button onClick={analyseNow} disabled={!subjects.length} className="w-full sm:w-auto">
            Submit for analysis
          </Button>
        </Card>
      </div>
    </div>
  )
}
