'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FieldError, FieldHint, Input, Label, Select } from '@/components/common/field'
import { Notice } from '@/components/common/page-header'
import { PasswordInput } from '@/components/common/password-input'
import { DemoFillPanel } from '@/components/public/demo-fill'
import { Button } from '@/components/ui/button'
import { DEPARTMENTS, demoRegisterFill } from '@/lib/demo-data'
import { useApp } from '@/lib/store'

type Form = {
  name: string
  studentId: string
  email: string
  department: string
  password: string
  confirm: string
}
type Errors = Partial<Record<keyof Form, string>>

// Demo IDs are free-form labels (e.g. DEMO-0001); no official ID format is enforced or implied.
const DEMO_ID = /^[A-Z0-9][A-Z0-9-]{2,19}$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(f: Form): Errors {
  const e: Errors = {}
  if (f.name.trim().length < 3) e.name = 'Please enter your full name.'
  if (!DEMO_ID.test(f.studentId.trim())) e.studentId = 'Use 3–20 letters, numbers or hyphens, e.g. DEMO-0001.'
  if (!EMAIL.test(f.email.trim())) e.email = 'Please enter a valid email address.'
  if (!f.department) e.department = 'Please select your department.'
  if (f.password.length < 8) e.password = 'Use at least 8 characters.'
  else if (!/\d/.test(f.password) || !/[A-Za-z]/.test(f.password)) e.password = 'Include at least one letter and one number.'
  if (!f.confirm) e.confirm = 'Please confirm your password.'
  else if (f.confirm !== f.password) e.confirm = 'Passwords do not match.'
  return e
}

export function RegisterForm() {
  const router = useRouter()
  const { register } = useApp()
  const [form, setForm] = useState<Form>({ name: '', studentId: '', email: '', department: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }))
  }

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    const e = validate(form)
    setErrors(e)
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0]
      document.getElementById(`reg-${first}`)?.focus()
      return
    }
    setLoading(true)
    register({ name: form.name.trim(), studentId: form.studentId.trim(), email: form.email.trim(), department: form.department })
    router.push('/dashboard')
  }

  const field = (k: keyof Form) => ({
    id: `reg-${k}`,
    name: k,
    value: form[k],
    onChange: set(k),
    'aria-invalid': !!errors[k],
    'aria-describedby': errors[k] ? `reg-${k}-error` : undefined,
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <Notice title="Local demo registration">
        This saves the details you enter as the demo profile in this browser only. Demo data already saved here (complaints,
        marks, attendance) is kept. Nothing is sent to SSUET or any server, and your password is never saved.
      </Notice>

      <DemoFillPanel
        submitLabel="Create account"
        onFill={() => {
          setForm({ ...demoRegisterFill })
          setErrors({})
        }}
      />

      <div>
        <Label htmlFor="reg-name">Full name</Label>
        <Input {...field('name')} autoComplete="name" placeholder="Demo Student" />
        <FieldError id="reg-name-error">{errors.name}</FieldError>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="reg-studentId">Demo student ID</Label>
          <Input {...field('studentId')} placeholder="DEMO-0001" autoCapitalize="characters" />
          {errors.studentId ? (
            <FieldError id="reg-studentId-error">{errors.studentId}</FieldError>
          ) : (
            <FieldHint>Any demo label works. No official ID is checked.</FieldHint>
          )}
        </div>
        <div>
          <Label htmlFor="reg-department">Department</Label>
          <Select {...field('department')}>
            <option value="">Select department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
          <FieldError id="reg-department-error">{errors.department}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor="reg-email">Email</Label>
        <Input {...field('email')} type="email" autoComplete="email" placeholder="demo.student@example.com" />
        <FieldError id="reg-email-error">{errors.email}</FieldError>
      </div>

      <div>
        <Label htmlFor="reg-password">Password</Label>
        <PasswordInput {...field('password')} autoComplete="new-password" placeholder="At least 8 characters" />
        {errors.password ? (
          <FieldError id="reg-password-error">{errors.password}</FieldError>
        ) : (
          <FieldHint>Use 8+ characters with at least one letter and one number.</FieldHint>
        )}
      </div>

      <div>
        <Label htmlFor="reg-confirm">Confirm password</Label>
        <PasswordInput {...field('confirm')} autoComplete="new-password" placeholder="Re-enter your password" />
        <FieldError id="reg-confirm-error">{errors.confirm}</FieldError>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already registered?{' '}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Log in
        </Link>
      </p>
      <p className="text-center text-xs text-muted-foreground">
        Local demo · Details are saved in this browser only and are not sent anywhere.
      </p>
    </form>
  )
}
