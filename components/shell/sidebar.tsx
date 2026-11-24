'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import { isActive, sidebarNav } from './nav-config'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useApp()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r bg-card lg:flex">
      <div className="flex h-16 shrink-0 items-center border-b px-6">
        <Logo href="/dashboard" />
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-4 py-6">
        <p className="mb-2 px-3 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Student Portal</p>
        <ul className="flex flex-col gap-1">
          {sidebarNav.map((item) => {
            const active = isActive(pathname, item.match)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
                    active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="size-[18px] shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t p-4">
        <div className="mb-3 rounded-lg bg-muted px-3 py-3">
          <p className="text-xs font-bold text-foreground">Academic prototype</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Student-built concept. Not an official SSUET system.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            logout()
            router.push('/')
          }}
          className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-semibold text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <LogOut className="size-[18px]" />
          Log out
        </button>
      </div>
    </aside>
  )
}
