'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Badge, DemoBadge } from '@/components/common/badge'
import { Card, CardContent, CardHeader } from '@/components/common/card'
import { FieldError, Input, Label } from '@/components/common/field'
import { Notice } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { formatCountdown, formatDateTime, formatTime } from '@/lib/format'
import { isExpired, normalizeToken, parseQrPayload, remainingMs, resultMessage, TOKEN_LENGTH, type CheckInResult } from '@/lib/attendance'
import { useApp } from '@/lib/store'
import { QrScanner } from './qr-scanner'
import { useNow } from './use-now'

const feedbackStyle: Record<CheckInResult['kind'], { tone: 'success' | 'warning' | 'danger' | 'info'; title: string }> = {
  success: { tone: 'success', title: 'Attendance marked' },
  duplicate: { tone: 'warning', title: 'Already marked' },
  expired: { tone: 'warning', title: 'Session expired' },
  'invalid-code': { tone: 'danger', title: 'Code not recognised' },
  'invalid-pin': { tone: 'danger', title: 'Incorrect PIN' },
  'invalid-qr': { tone: 'danger', title: 'Not an attendance QR code' },
  'no-session': { tone: 'info', title: 'No open session' },
}

export function StudentCheckIn() {
  const { session, attendance, submitAttendance } = useApp()
  const now = useNow()
  const [code, setCode] = useState('')
  const [pin, setPin] = useState('')
  const [errors, setErrors] = useState<{ code?: string; pin?: string }>({})
  const [feedback, setFeedback] = useState<CheckInResult | null>(null)

  const onScan = (raw: string) => {
    const token = parseQrPayload(raw)
    setFeedback(token ? submitAttendance({ code: token, method: 'QR scan' }) : { kind: 'invalid-qr' })
  }

  const onManual = (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (normalizeToken(code).length !== TOKEN_LENGTH) next.code = 'Enter the 8-character session code, for example ABCD-EFGH.'
    if (!/^\d{6}$/.test(pin)) next.pin = 'Enter the 6-digit PIN.'
    setErrors(next)
    if (Object.keys(next).length) return
    const result = submitAttendance({ code, pin, method: 'Backup PIN' })
    setFeedback(result)
    if (result.kind === 'success') {
      setCode('')
      setPin('')
    }
  }

  const style = feedback ? feedbackStyle[feedback.kind] : null
  const expired = session ? isExpired(session, now) : false

  return (
    <div className="flex flex-col gap-6">
      {session ? (
        <Notice tone="info" title={`A demo session is open: ${session.subjectName} · ${session.section}`}>
          {expired ? 'It has expired. Ask the teacher view to regenerate the QR code.' : `Active, ${formatCountdown(remainingMs(session, now))} left.`}
        </Notice>
      ) : (
        <Notice tone="info" title="No demo session is open">
          Start one in the{' '}
          <Link href="/attendance/teacher" className="font-semibold underline">
            Teacher QR session
          </Link>{' '}
          tab, then come back here to check in.
        </Notice>
      )}

      {feedback && style ? (
        <Notice tone={style.tone} title={style.title}>
          {resultMessage(feedback)}
          {feedback.kind === 'success' ? ` Marked at ${formatTime(feedback.markedAt)}.` : ''}
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader title="Scan the QR code" description="Use your camera where your browser supports it." />
          <CardContent>
            <QrScanner onDetect={onScan} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Enter code and PIN" description="Backup option if scanning isn’t available." />
          <CardContent>
            <form onSubmit={onManual} noValidate className="flex flex-col gap-5">
              <div>
                <Label htmlFor="att-code">Session code</Label>
                <Input
                  id="att-code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value)
                    setErrors((x) => ({ ...x, code: undefined }))
                  }}
                  placeholder="ABCD-EFGH"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={12}
                  aria-invalid={!!errors.code}
                  aria-describedby={errors.code ? 'att-code-err' : undefined}
                />
                <FieldError id="att-code-err">{errors.code}</FieldError>
              </div>
              <div>
                <Label htmlFor="att-pin">6-digit PIN</Label>
                <Input
                  id="att-pin"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                    setErrors((x) => ({ ...x, pin: undefined }))
                  }}
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  aria-invalid={!!errors.pin}
                  aria-describedby={errors.pin ? 'att-pin-err' : undefined}
                />
                <FieldError id="att-pin-err">{errors.pin}</FieldError>
              </div>
              <Button type="submit">Mark attendance</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader title="Your recent attendance" action={<DemoBadge />} />
        {attendance.length === 0 ? (
          <CardContent>
            <p className="text-sm text-muted-foreground">No attendance recorded yet.</p>
          </CardContent>
        ) : (
          <ul className="divide-y">
            {attendance.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{r.subjectName}</p>
                  <p className="text-[13px] text-muted-foreground">{formatDateTime(r.markedAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {r.isDemo ? <DemoBadge /> : null}
                  <Badge tone={r.method === 'QR scan' ? 'brand' : 'neutral'}>{r.method}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
