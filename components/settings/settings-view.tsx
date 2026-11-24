'use client'

import { DemoDataCard } from './demo-data-card'
import { PreferencesCard } from './preferences-card'
import { ProfileForm } from './profile-form'

export function SettingsView() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:items-start">
      <ProfileForm />
      <div className="flex flex-col gap-6">
        <PreferencesCard />
        <DemoDataCard />
      </div>
    </div>
  )
}
