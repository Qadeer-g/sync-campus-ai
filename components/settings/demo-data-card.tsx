'use client'

import { useState } from 'react'
import { DemoBadge } from '@/components/common/badge'
import { Card, CardContent, CardHeader } from '@/components/common/card'
import { Notice } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/store'
import { ConfirmDialog } from './confirm-dialog'

export function DemoDataCard() {
  const { resetDemoData } = useApp()
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)

  return (
    <Card id="demo-data" className="scroll-mt-24">
      <CardHeader title="Demo data" description="Start again from the default demo state." action={<DemoBadge />} />
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Resetting puts marks, complaints, attendance sessions and history, notifications, activity, notification preferences and your
          profile (back to “Demo Student”) back to their defaults. It only affects data stored in this browser. Your theme and login are kept.
        </p>
        {done ? <Notice tone="success" title="Demo data was reset">Everything is back to the default Demo Student state.</Notice> : null}
        <div>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setDone(false)
              setConfirming(true)
            }}
          >
            Reset Demo Data
          </Button>
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirming}
        title="Reset all demo data?"
        confirmLabel="Reset Demo Data"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          resetDemoData()
          setConfirming(false)
          setDone(true)
        }}
      >
        <p>This clears your marks, complaints, attendance sessions and history, notifications, activity and any saved-record backups, and restores the default “Demo Student” profile. It cannot be undone.</p>
        <p className="mt-2">Only data in this browser is affected. No project files or university systems are touched.</p>
      </ConfirmDialog>
    </Card>
  )
}
