'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { Notice } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'

/* Camera QR scanning uses the browser's built-in BarcodeDetector together with getUserMedia. No
 * scanning library is installed. Support varies by browser/OS, and the camera needs HTTPS or
 * localhost plus the user's permission, so this component checks for support first and shows a
 * plain message (pointing to the code + PIN fallback) whenever scanning cannot be used. */

type Detection = { rawValue: string }
type DetectorLike = { detect: (source: HTMLVideoElement) => Promise<Detection[]> }
type DetectorCtor = new (options?: { formats?: string[] }) => DetectorLike

const getDetectorCtor = (): DetectorCtor | null =>
  (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector ?? null

type Phase = 'checking' | 'unsupported' | 'idle' | 'starting' | 'scanning' | 'denied' | 'nocamera' | 'error'

const PROBLEM_TEXT: Partial<Record<Phase, string>> = {
  unsupported:
    "Camera scanning isn't available here. It needs a browser with QR detection support and a secure connection (HTTPS or localhost). Use the session code and PIN instead.",
  denied: 'Camera permission was blocked. Allow camera access in your browser settings, or use the session code and PIN instead.',
  nocamera: 'No camera was found on this device. Use the session code and PIN instead.',
  error: "The camera couldn't be started. Use the session code and PIN instead.",
}

export function QrScanner({ onDetect }: { onDetect: (rawValue: string) => void }) {
  const [phase, setPhase] = useState<Phase>('checking')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const busyRef = useRef(false)
  const aliveRef = useRef(true)
  const onDetectRef = useRef(onDetect)
  useEffect(() => {
    onDetectRef.current = onDetect
  }, [onDetect])

  const release = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current)
    timerRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  useEffect(() => {
    aliveRef.current = true
    const supported = !!getDetectorCtor() && !!navigator.mediaDevices?.getUserMedia
    setPhase(supported ? 'idle' : 'unsupported')
    return () => {
      aliveRef.current = false
      release() // never leave the camera running when leaving the page
    }
  }, [release])

  const start = async () => {
    setPhase('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      if (!aliveRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      streamRef.current = stream
      const video = videoRef.current
      if (!video) throw new Error('no video element')
      video.srcObject = stream
      await video.play()
      const Detector = getDetectorCtor()!
      let detector: DetectorLike
      try {
        detector = new Detector({ formats: ['qr_code'] })
      } catch {
        detector = new Detector()
      }
      setPhase('scanning')
      timerRef.current = window.setInterval(async () => {
        if (busyRef.current || !videoRef.current) return
        busyRef.current = true
        try {
          const found = await detector.detect(videoRef.current)
          if (found.length > 0 && aliveRef.current) {
            release()
            setPhase('idle')
            onDetectRef.current(found[0].rawValue)
          }
        } catch {
          // A single failed frame is fine; keep scanning.
        } finally {
          busyRef.current = false
        }
      }, 350)
    } catch (err) {
      release()
      if (!aliveRef.current) return
      const name = err instanceof DOMException ? err.name : ''
      setPhase(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'nocamera' : 'error')
    }
  }

  const stop = () => {
    release()
    setPhase('idle')
  }

  const showVideo = phase === 'starting' || phase === 'scanning'
  const problem = PROBLEM_TEXT[phase]

  return (
    <div className="flex flex-col gap-4">
      {showVideo ? (
        <div className="relative overflow-hidden rounded-lg bg-black">
          <video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" aria-label="Camera preview" />
          <p className="absolute inset-x-0 bottom-0 bg-black/55 px-3 py-2 text-center text-xs font-medium text-white">
            {phase === 'starting' ? 'Starting camera…' : 'Point the camera at the teacher’s QR code'}
          </p>
        </div>
      ) : (
        // Keep a (hidden) element mounted so the ref exists before the camera starts.
        <video ref={videoRef} muted playsInline className="hidden" aria-hidden="true" />
      )}

      {problem ? <Notice tone="warning">{problem}</Notice> : null}

      {phase === 'scanning' || phase === 'starting' ? (
        <Button type="button" variant="outline" onClick={stop}>
          Stop camera
        </Button>
      ) : (
        <Button type="button" onClick={start} disabled={phase === 'checking' || phase === 'unsupported'}>
          <Camera />
          Scan QR code with camera
        </Button>
      )}
      <p className="text-[13px] text-muted-foreground">
        Camera scanning depends on your browser and device, and asks for camera permission. If it doesn’t work, use the session code and PIN.
      </p>
    </div>
  )
}
