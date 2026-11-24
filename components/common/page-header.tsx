'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  actions,
  badge,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  badge?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground text-balance sm:text-[28px]">{title}</h1>
          {badge}
        </div>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export type SubNavItem = { label: string; href: string; icon?: React.ComponentType<{ className?: string }> }

export function SubNav({ items, label }: { items: SubNavItem[]; label: string }) {
  const pathname = usePathname()
  return (
    <nav aria-label={label} className="mb-6 -mt-2 border-b">
      <ul className="flex gap-1 overflow-x-auto">
        {items.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-11 items-center gap-2 px-3 text-sm font-semibold transition-colors outline-none focus-visible:text-foreground',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {Icon ? <Icon className="size-4" /> : null}
                {item.label}
                <span
                  aria-hidden="true"
                  className={cn('absolute inset-x-2 -bottom-px h-0.5 rounded-full', active ? 'bg-brand' : 'bg-transparent')}
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

const noticeTones = {
  info: { cls: 'border-brand/25 bg-accent text-accent-foreground', Icon: Info },
  success: { cls: 'border-success/30 bg-success/10 text-success', Icon: CheckCircle2 },
  danger: { cls: 'border-destructive/30 bg-destructive/8 text-destructive', Icon: AlertCircle },
  warning: { cls: 'border-warning/35 bg-warning/10 text-warning', Icon: AlertCircle },
}

export function Notice({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: keyof typeof noticeTones
  title?: string
  children?: React.ReactNode
  className?: string
}) {
  const { cls, Icon } = noticeTones[tone]
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-lg border px-4 py-3 text-sm', cls, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn('leading-relaxed', title && 'mt-0.5', 'text-foreground/80')}>{children}</div> : null}
      </div>
    </div>
  )
}
