'use client'

import { useEffect, useState } from 'react'
import { DemoBadge } from '@/components/common/badge'
import { Card, CardContent, CardHeader } from '@/components/common/card'
import { FieldError, FieldHint, Input, Label, Select } from '@/components/common/field'
import { Notice } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { DEPARTMENTS } from '@/lib/demo-data'
import { initials } from '@/lib/format'
import { useApp } from '@/lib/store'
import type { Profile } from '@/lib/types'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Demo IDs are free-form labels (e.g. DEMO-0001); no official ID format is enforced or implied.
const DEMO_ID = /^[A-Z0-9][A-Z0-9-]{2,19}$/i
const PHONE = /^\+?[\d\s\-()]{6,20}$/

type Draft = Pick<Profile, 'name' | 'studentId' | 'email' | 'phone' | 'department' | 'program' | 'semester' | 'batch'>
type Errors = Partial<Record<keyof Draft, string>>

const fromProfile = (p: Profile): Draft => ({
  name: p.name,
  studentId: p.studentId,
  email: p.email,
  phone: p.phone,
  department: p.department,
  program: p.program,
  semester: p.semester,
  batch: p.batch,
})

const trimmed = (d: Draft): Draft => ({
  name: d.name.trim(),
  studentId: d.studentId.trim().toUpperCase(),
  email: d.email.trim(),
  phone: d.phone.trim(),
  department: d.department,
  program: d.program.trim(),
  semester: d.semester.trim(),
  batch: d.batch.trim(),
})

function validate(raw: Draft): Errors {
  const d = trimmed(raw)
  const e: Errors = {}
  if (d.name.length < 2 || d.name.length > 60) e.name = 'Enter a name between 2 and 60 characters.'
  if (!DEMO_ID.test(d.studentId)) e.studentId = 'Use 3–20 letters, numbers or hyphens, e.g. DEMO-0001.'
  if (!EMAIL.test(d.email)) e.email = 'Enter a valid email address.'
  if (d.phone && !PHONE.test(d.phone)) e.phone = 'Use digits, spaces, + - ( ) only (6–20 characters), or leave it empty.'
  if (!d.department) e.department = 'Choose a department.'
  for (const k of ['program', 'semester', 'batch'] as const) if (d[k].length < 1 || d[k].length > 40) e[k] = 'Enter 1–40 characters.'
  return e
}

export function ProfileForm() {
  const { profile, updateProfile } = useApp()
  const [draft, setDraft] = useState<Draft>(() => fromProfile(profile))
  const [errors, setErrors] = useState<Errors>({})
  const [saved, setSaved] = useState(false)

  // Whenever the stored profile changes (save, reset, first load) the form shows it.
  useEffect(() => {
    setDraft(fromProfile(profile))
    setErrors({})
  }, [profile])

  const current = fromProfile(profile)
  const t = trimmed(draft)
  const dirty = (Object.keys(t) as (keyof Draft)[]).some((k) => t[k] !== current[k])

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setDraft((d) => ({ ...d, [k]: e.target.value }))
    setErrors((x) => ({ ...x, [k]: undefined }))
    setSaved(false)
  }
  const field = (k: keyof Draft) => ({
    id: `pf-${k}`,
    value: draft[k],
    onChange: set(k),
    'aria-invalid': !!errors[k],
    'aria-describedby': errors[k] ? `pf-${k}-err` : undefined,
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const found = validate(draft)
    setErrors(found)
    if (Object.keys(found).length) return
    updateProfile(trimmed(draft))
    setSaved(true)
  }

  const departments = DEPARTMENTS.includes(draft.department as (typeof DEPARTMENTS)[number]) || !draft.department ? [...DEPARTMENTS] : [draft.department, ...DEPARTMENTS]

  return (
    <Card id="profile" className="scroll-mt-24">
      <CardHeader title="Profile" description="The demo student shown across the portal." action={<DemoBadge />} />
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground"
          >
            {initials(profile.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold">{profile.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {profile.studentId} · {profile.email}
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="pf-name">Full name</Label>
              <Input {...field('name')} autoComplete="off" maxLength={80} />
              <FieldError id="pf-name-err">{errors.name}</FieldError>
            </div>
            <div>
              <Label htmlFor="pf-studentId">Demo student ID</Label>
              <Input {...field('studentId')} autoCapitalize="characters" autoComplete="off" />
              {errors.studentId ? <FieldError id="pf-studentId-err">{errors.studentId}</FieldError> : <FieldHint>A demo label, not an official ID.</FieldHint>}
            </div>
            <div>
              <Label htmlFor="pf-email">Email</Label>
              <Input {...field('email')} type="email" autoComplete="off" />
              <FieldError id="pf-email-err">{errors.email}</FieldError>
            </div>
            <div>
              <Label htmlFor="pf-phone">Phone (optional)</Label>
              <Input {...field('phone')} type="tel" autoComplete="off" />
              <FieldError id="pf-phone-err">{errors.phone}</FieldError>
            </div>
            <div>
              <Label htmlFor="pf-department">Department</Label>
              <Select {...field('department')}>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
              <FieldError id="pf-department-err">{errors.department}</FieldError>
            </div>
            <div>
              <Label htmlFor="pf-program">Program</Label>
              <Input {...field('program')} autoComplete="off" maxLength={40} />
              <FieldError id="pf-program-err">{errors.program}</FieldError>
            </div>
            <div>
              <Label htmlFor="pf-semester">Semester</Label>
              <Input {...field('semester')} autoComplete="off" maxLength={40} />
              <FieldError id="pf-semester-err">{errors.semester}</FieldError>
            </div>
            <div>
              <Label htmlFor="pf-batch">Batch</Label>
              <Input {...field('batch')} autoComplete="off" maxLength={40} />
              <FieldError id="pf-batch-err">{errors.batch}</FieldError>
            </div>
          </div>

          {saved && !dirty ? <Notice tone="success" title="Profile saved">Your changes are stored in this browser and are kept after you log out or refresh.</Notice> : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={!dirty}>
              Save changes
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!dirty}
              onClick={() => {
                setDraft(fromProfile(profile))
                setErrors({})
              }}
            >
              Discard changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
