import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

export function Avatar({ name, src, className }: { name: string; src: string | null; className?: string }) {
  return (
    <span
      className={cn(
        'relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-xs font-bold text-accent-foreground',
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`${name} profile picture`} className="size-full object-cover" />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  )
}
