'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/common/card'
import { Switch } from '@/components/common/field'
import { useApp } from '@/lib/store'
import type { NotificationPrefs, ThemePreference } from '@/lib/types'
import { cn } from '@/lib/utils'

const THEMES: { value: ThemePreference; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

const NOTIFICATIONS: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  { key: 'complaintUpdates', label: 'Complaint updates', description: 'Show a notification when a complaint changes status.' },
  { key: 'attendanceAlerts', label: 'Attendance alerts', description: 'Show a notification when attendance is recorded.' },
  { key: 'advisorTips', label: 'Advisor alerts', description: 'Show an alert when a subject is below the 60% target.' },
]

export function PreferencesCard() {
  const { theme, setTheme, notificationPrefs, setNotificationPrefs } = useApp()

  return (
    <Card id="preferences" className="scroll-mt-24">
      <CardHeader title="Preferences" description="Appearance and notifications." />
      <CardContent className="flex flex-col gap-6">
        <div>
          <p id="theme-label" className="text-sm font-semibold">
            Theme
          </p>
          <div role="radiogroup" aria-labelledby="theme-label" className="mt-2 grid grid-cols-3 gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => {
              const active = theme === value
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTheme(value)}
                  className={cn(
                    'flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
                    active ? 'border-brand bg-accent text-accent-foreground' : 'bg-card text-foreground hover:bg-muted',
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="border-t pt-6">
          <p className="text-sm font-semibold">Notifications</p>
          <ul className="mt-3 flex flex-col gap-4">
            {NOTIFICATIONS.map(({ key, label, description }) => (
              <li key={key} className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <label htmlFor={`pref-${key}`} className="text-sm font-medium">
                    {label}
                  </label>
                  <p className="text-[13px] text-muted-foreground">{description}</p>
                </div>
                <Switch id={`pref-${key}`} label={label} checked={notificationPrefs[key]} onCheckedChange={(v) => setNotificationPrefs({ ...notificationPrefs, [key]: v })} />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] text-muted-foreground">
            These only control the notifications in the bell menu. A switched-off type is hidden and comes back when you switch it on. No
            email or push message is ever sent.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
