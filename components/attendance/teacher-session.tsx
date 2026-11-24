'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { RefreshCw, RotateCcw, UserPlus } from 'lucide-react'
import { Badge } from '@/components/common/badge'
import { Card, CardContent, CardHeader } from '@/components/common/card'
import { FieldHint, Label, Select } from '@/components/common/field'
import { Button } from '@/components/ui/button'
import { formatCountdown, formatTime } from '@/lib/format'
import { formatToken, isExpired, qrPayload, remainingMs } from '@/lib/attendance'
import { QR_DURATIONS, teacherClasses } from '@/lib/demo-data'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useNow } from './use-now'

export function TeacherSession() {
  const { session, startSession, regenerateSession, endSession, addDemoCheckIn } = useApp()
  const now = useNow()
  const [classCode, setClassCode] = useState<string>(teacherClasses[0].code)
  const [duration, setDuration] = useState<number>(5)

  const cls = teacherClasses.find((c) => c.code === classCode) ?? teacherClasses[0]
  const expired = session ? isExpired(session, now) : false
  const remaining = session ? remainingMs(session, now) : 0

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start">
      <Card>
        <CardHeader title="Start a session" description="Pick a demo subject and how long the QR code stays valid." />
        <CardContent className="flex flex-col gap-5">
          <div>
            <Label htmlFor="att-class">Subject</Label>
            <Select id="att-class" value={classCode} onChange={(e) => setClassCode(e.target.value)}>
              {teacherClasses.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} · {c.section} · {c.room}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="att-duration">QR code expires after</Label>
            <Select id="att-duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {QR_DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} {d === 1 ? 'minute' : 'minutes'}
                </option>
              ))}
            </Select>
          </div>
          <Button type="button" onClick={() => startSession(cls, duration)}>
            {session ? 'Start new session' : 'Generate QR code'}
          </Button>
          {session ? <FieldHint>Starting a new session replaces the current one and its check-in list.</FieldHint> : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        {!session ? (
          <Card>
            <CardContent className="py-14 text-center">
              <p className="text-base font-bold">No session is running</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
                Choose a subject and an expiry time, then generate a QR code. The Student check-in tab can use it straight away.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader
                title={`${session.subjectName} · ${session.subjectCode}`}
                description={`${session.section} · ${session.room}`}
                action={<Badge tone={expired ? 'danger' : 'success'}>{expired ? 'Expired' : 'Active'}</Badge>}
              />
              <CardContent className="flex flex-col gap-6">
                <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
                  <div className="relative mx-auto w-fit rounded-xl border bg-white p-3" role="img" aria-label="QR code for the attendance session">
                    <div className={cn(expired && 'opacity-20')}>
                      <QRCodeSVG value={qrPayload(session.token)} size={176} level="M" />
                    </div>
                    {expired ? (
                      <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold text-destructive">Expired</span>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Time remaining</p>
                      <p role="timer" className={cn('font-mono text-4xl font-extrabold tabular-nums', expired && 'text-destructive')}>
                        {expired ? '00:00' : formatCountdown(remaining)}
                      </p>
                      <p className="text-[13px] text-muted-foreground">
                        {expired ? 'Expired at' : 'Expires at'} {formatTime(session.expiresAt)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Session code</p>
                        <p className="mt-0.5 font-mono text-xl font-bold tracking-widest">{formatToken(session.token)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">6-digit PIN</p>
                        <p className="mt-0.5 font-mono text-xl font-bold tracking-[0.3em]">{session.pin}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center">
                  <Button type="button" variant={expired ? 'default' : 'outline'} onClick={() => regenerateSession(duration)}>
                    <RefreshCw />
                    Regenerate QR
                  </Button>
                  <Button type="button" variant="outline" onClick={endSession}>
                    <RotateCcw />
                    Reset session
                  </Button>
                  <p className="text-[13px] text-muted-foreground sm:ml-1">
                    Regenerate makes a new code and PIN valid for {duration} {duration === 1 ? 'minute' : 'minutes'}. Reset ends the session and clears its list.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader
                title="Checked-in students"
                description={`${session.checkIns.length} checked in`}
                action={
                  <Button type="button" variant="outline" size="sm" disabled={expired} onClick={addDemoCheckIn}>
                    <UserPlus />
                    Add demo check-in
                  </Button>
                }
              />
              {session.checkIns.length === 0 ? (
                <CardContent>
                  <p className="text-sm text-muted-foreground">No students have checked in yet.</p>
                </CardContent>
              ) : (
                <ul className="divide-y">
                  {session.checkIns.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{c.studentName}</p>
                        <p className="text-[13px] text-muted-foreground">{formatTime(c.checkedInAt)}</p>
                      </div>
                      <Badge tone={c.method === 'QR scan' ? 'brand' : 'neutral'}>{c.method === 'Simulated' ? 'Demo simulation' : c.method}</Badge>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t px-5 py-3 sm:px-6">
                <p className="text-[13px] text-muted-foreground">
                  Demo only: &quot;Add demo check-in&quot; adds made-up students (Demo Student 2, 3, …) so you can see a class list. Checking in from the
                  Student check-in tab adds &quot;Demo Student&quot;.
                </p>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
