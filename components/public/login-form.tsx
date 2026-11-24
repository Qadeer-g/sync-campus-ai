'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FieldError, Input, Label } from '@/components/common/field'
import { Notice } from '@/components/common/page-header'
import { PasswordInput } from '@/components/common/password-input'
import { DemoFillPanel } from '@/components/public/demo-fill'
import { Button } from '@/components/ui/button'
import { demoLoginFill } from '@/lib/demo-data'
import { useApp } from '@/lib/store'

type Errors = { identifier?: string; password?: string }

// Demo IDs are free-form labels (e.g. DEMO-0001); no official ID format is enforced or implied.
const DEMO_ID = /^[A-Z0-9][A-Z0-9-]{2,19}$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginForm() {
  const router = useRouter()
  const { login } = useApp()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [forgotOpen, setForgotOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const validate = (): Errors => {
    const e: Errors = {}
    const id = identifier.trim()
    if (!id) e.identifier = 'Please enter your email or demo ID.'
    else if (!EMAIL.test(id) && !DEMO_ID.test(id))
      e.identifier = 'Enter a valid email or a demo ID like DEMO-0001.'
    if (!password) e.password = 'Please enter your password.'
    else if (password.length < 6) e.password = 'Your password should be at least 6 characters.'
    return e
  }

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    setLoading(true)
    login()
    router.push('/dashboard')
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <Notice title="Local demo login">
        Any valid-looking email or demo ID with a 6+ character password opens the demo portal. Your saved demo profile is kept;
        a fresh browser starts as &quot;Demo Student&quot;. No real account is checked and nothing is sent to SSUET.
      </Notice>

      <DemoFillPanel
        submitLabel="Log in"
        onFill={() => {
          setIdentifier(demoLoginFill.identifier)
          setPassword(demoLoginFill.password)
          setErrors({})
        }}
      />

      <div>
        <Label htmlFor="identifier">Email or demo ID</Label>
        <Input
          id="identifier"
          name="identifier"
          autoComplete="username"
          placeholder="demo.student@example.com or DEMO-0001"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          aria-invalid={!!errors.identifier}
          aria-describedby={errors.identifier ? 'identifier-error' : undefined}
        />
        <FieldError id="identifier-error">{errors.identifier}</FieldError>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label htmlFor="password" className="mb-0">
            Password
          </Label>
          <button
            type="button"
            onClick={() => setForgotOpen((o) => !o)}
            aria-expanded={forgotOpen}
            className="cursor-pointer text-sm font-semibold text-brand hover:underline"
          >
            Forgot password?
          </button>
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
        />
        <FieldError id="password-error">{errors.password}</FieldError>
        {forgotOpen ? (
          <Notice tone="warning" className="mt-3" title="Password reset is simulated">
            In the real system a reset link would be emailed to you. In this prototype, simply enter any password with 6 or more characters.
          </Notice>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? 'Logging in…' : 'Log in'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        New to Smart Campus?{' '}
        <Link href="/register" className="font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  )
}
