import Link from 'next/link'
import { cn } from '@/lib/utils'

type LogoProps = {
  href?: string
  inverted?: boolean
  className?: string
}

export function Logo({ href = '/', inverted = false, className }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn('flex h-10 shrink-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40', className)}
      aria-label="SSUET Smart Campus AI home"
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-9 items-center justify-center rounded-lg text-[13px] font-extrabold tracking-tight',
          inverted ? 'bg-white text-[#13294b]' : 'bg-primary text-primary-foreground',
        )}
      >
        SS
      </span>
      <span className="flex flex-col leading-none">
        <span className={cn('text-[15px] font-extrabold tracking-tight', inverted ? 'text-white' : 'text-foreground')}>
          SSUET
        </span>
        <span className={cn('mt-1 text-[11px] font-semibold', inverted ? 'text-white/70' : 'text-muted-foreground')}>
          Smart Campus AI
        </span>
      </span>
    </Link>
  )
}
