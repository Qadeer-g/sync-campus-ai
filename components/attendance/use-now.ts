'use client'

import { useEffect, useState } from 'react'

/** Current time in ms, refreshed every `intervalMs` (default 1 s). Used for countdowns and expiry checks. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
