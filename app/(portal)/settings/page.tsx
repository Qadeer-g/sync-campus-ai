import type { Metadata } from 'next'
import { DemoBadge } from '@/components/common/badge'
import { Notice, PageHeader } from '@/components/common/page-header'
import { SettingsView } from '@/components/settings/settings-view'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Edit the demo profile, choose your theme and notifications, or reset the demo data."
        badge={<DemoBadge label="LOCAL DEMO" />}
      />
      <Notice tone="warning" title="Local Demo — settings are saved only in this browser." className="mb-6">
        No real SSUET account, server or email is involved. Nothing on this page is sent anywhere.
      </Notice>
      <SettingsView />
    </>
  )
}
