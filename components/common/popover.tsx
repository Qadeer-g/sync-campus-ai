'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export function Popover({
  trigger,
  triggerLabel,
  triggerClassName,
  children,
  align = 'end',
  panelClassName,
}: {
  trigger: React.ReactNode
  triggerLabel: string
  triggerClassName?: string
  children: (close: () => void) => React.ReactNode
  align?: 'start' | 'end'
  panelClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={triggerLabel}
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex cursor-pointer items-center rounded-lg outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40',
          open && 'bg-muted',
          triggerClassName,
        )}
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={id}
          className={cn(
            'absolute top-[calc(100%+8px)] z-50 w-72 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg',
            align === 'end' ? 'right-0' : 'left-0',
            panelClassName,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  )
}
