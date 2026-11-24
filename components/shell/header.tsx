'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, ChevronDown, ChevronRight, LogOut, QrCode, Settings, User } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { Avatar } from '@/components/common/avatar'
import { Popover } from '@/components/common/popover'
import { formatDateTime } from '@/lib/format'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import { sectionTitle } from './nav-config'

export function Header() {
  const pathname = usePathname()
  const title = sectionTitle(pathname)

  return (
    <header className="fixed inset-x-0 top-0 z-30 h-16 border-b bg-card lg:left-64">
      <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="lg:hidden">
          <Logo href="/dashboard" />
        </div>
        <nav aria-label="Breadcrumb" className="hidden min-w-0 lg:block">
          <ol className="flex items-center gap-1.5 text-sm">
            <li className="font-medium text-muted-foreground">Student Portal</li>
            <li aria-hidden="true">
              <ChevronRight className="size-4 text-muted-foreground" />
            </li>
            <li aria-current="page" className="truncate font-bold text-foreground">
              {title}
            </li>
          </ol>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <NotificationsMenu />
          <ProfileMenu />
        </div>
      </div>
    </header>
  )
}

function NotificationsMenu() {
  const router = useRouter()
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp()
  const unread = notifications.filter((n) => !n.read).length

  return (
    <Popover
      triggerLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
      triggerClassName="relative size-10 justify-center text-muted-foreground hover:text-foreground"
      panelClassName="w-[min(20rem,calc(100vw-2rem))]"
      trigger={
        <>
          <Bell className="size-5" />
          {unread ? (
            <span className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {unread}
            </span>
          ) : null}
        </>
      }
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-bold">Notifications</p>
            <button
              type="button"
              onClick={markAllNotificationsRead}
              disabled={!unread}
              className="cursor-pointer text-xs font-semibold text-brand hover:underline disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications to show.</li>
            ) : null}
            {notifications.map((n) => (
              <li key={n.id} className="border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => {
                    markNotificationRead(n.id)
                    close()
                    router.push(n.href)
                  }}
                  className="flex w-full cursor-pointer gap-3 px-4 py-3 text-left transition-colors hover:bg-muted"
                >
                  <span
                    aria-hidden="true"
                    className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-brand')}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                      {n.title}
                      {!n.read ? <span className="sr-only"> (unread)</span> : null}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-muted-foreground">{n.body}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{formatDateTime(n.date)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="border-t bg-muted/50 px-4 py-2 text-[11px] font-semibold tracking-wide text-muted-foreground">
            DEMO DATA · Sample notifications
          </p>
        </div>
      )}
    </Popover>
  )
}

function ProfileMenu() {
  const router = useRouter()
  const { profile, logout } = useApp()
  const firstName = profile.name.split(' ')[0]

  const items = [
    { label: 'My profile', href: '/settings', icon: User },
    { label: 'QR Attendance', href: '/attendance/student', icon: QrCode },
    { label: 'Settings', href: '/settings#preferences', icon: Settings },
  ]

  return (
    <Popover
      triggerLabel="Open profile menu"
      triggerClassName="h-10 gap-2 px-1 sm:pr-2"
      trigger={
        <>
          <Avatar name={profile.name} src={profile.avatarUrl} />
          <span className="hidden text-left sm:block">
            <span className="block max-w-32 truncate text-sm font-bold text-foreground">{firstName}</span>
            <span className="block text-[11px] font-medium text-muted-foreground">{profile.studentId}</span>
          </span>
          <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
        </>
      }
      panelClassName="w-64"
    >
      {(close) => (
        <div>
          <div className="border-b px-4 py-3">
            <p className="truncate text-sm font-bold">{profile.name}</p>
            <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
          </div>
          <ul className="p-1.5">
            {items.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={close}
                  className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <item.icon className="size-4 text-muted-foreground" />
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-1 border-t pt-1">
              <button
                type="button"
                onClick={() => {
                  close()
                  logout()
                  router.push('/')
                }}
                className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/8"
              >
                <LogOut className="size-4" />
                Log out
              </button>
            </li>
          </ul>
        </div>
      )}
    </Popover>
  )
}
