import { cn } from '@/lib/utils'
import type { ComplaintStatus } from '@/lib/types'

const tones = {
  neutral: 'bg-muted text-muted-foreground',
  brand: 'bg-accent text-accent-foreground',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-destructive/10 text-destructive',
  navy: 'bg-primary text-primary-foreground',
} as const

export type BadgeTone = keyof typeof tones

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.ComponentProps<'span'> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-semibold whitespace-nowrap',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}

export function DemoBadge({ className, label = 'DEMO DATA' }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded border border-warning/40 bg-warning/10 px-1.5 text-[10px] font-bold tracking-wider text-warning',
        className,
      )}
    >
      {label}
    </span>
  )
}

export function PrototypeBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded border border-brand/30 bg-accent px-1.5 text-[10px] font-bold tracking-wider text-accent-foreground',
        className,
      )}
    >
      PROTOTYPE
    </span>
  )
}

const statusTone: Record<ComplaintStatus, BadgeTone> = {
  Submitted: 'neutral',
  'Under Review': 'warning',
  Resolved: 'success',
}

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  return <Badge tone={statusTone[status]}>{status}</Badge>
}
