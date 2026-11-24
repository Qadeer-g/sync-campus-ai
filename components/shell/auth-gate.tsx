'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/store'

/**
 * Client-side guard for the portal routes (simulated local login only).
 *
 * - Waits for saved state to load (`hydrated`) so a refresh on a portal page doesn't bounce a
 *   signed-in user to /login.
 * - Sends visitors who are not signed in to /login.
 * - Does NOT redirect when the user logs out from inside the portal: the logout buttons
 *   navigate on their own, and a second redirect here would race with them.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { hydrated, isAuthed } = useApp()
  const wasAuthed = useRef(false)

  useEffect(() => {
    if (isAuthed) wasAuthed.current = true
  }, [isAuthed])

  useEffect(() => {
    if (hydrated && !isAuthed && !wasAuthed.current) router.replace('/login')
  }, [hydrated, isAuthed, router])

  if (!hydrated || !isAuthed) {
    return <div className="min-h-dvh bg-background" aria-hidden="true" />
  }
  return <>{children}</>
}
