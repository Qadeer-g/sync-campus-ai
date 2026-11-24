'use client'

import { useState } from 'react'
import { User } from 'lucide-react'
import { DemoBadge } from '@/components/common/badge'
import { Button } from '@/components/ui/button'

/**
 * "Demo Fill Data" control shown on the Login and Create Account forms.
 * It only calls `onFill` to populate the form fields; it never submits the form.
 */
export function DemoFillPanel({ onFill, submitLabel }: { onFill: () => void; submitLabel: string }) {
  const [filled, setFilled] = useState(false)

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-warning/40 bg-warning/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <DemoBadge />
          <p className="text-sm font-semibold">Local Demo</p>
        </div>
        <p role="status" className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {filled
            ? `Demo details filled in. Click "${submitLabel}" to continue.`
            : 'Fills this form with a neutral "Demo Student". Nothing is sent to SSUET or any server.'}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => {
          onFill()
          setFilled(true)
        }}
      >
        <User />
        Demo Fill Data
      </Button>
    </div>
  )
}
