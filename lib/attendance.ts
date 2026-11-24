import type { AttendanceSession } from './types'

/* ----------------------------------------------------------------------------------------------
 * QR Attendance helpers: pure functions only (no React, no storage, no network).
 * This is a LOCAL DEMO. Sessions live in this browser's localStorage; nothing is sent to SSUET.
 *
 *  session code   8 characters from an alphabet without look-alikes (no 0/O, 1/I/L), shown as ABCD-EFGH
 *  PIN            6 digits (100000-999999)
 *  QR content     "SMARTCAMPUS-DEMO-ATT:" + session code. The PIN is NOT in the QR, so the PIN stays a
 *                 separate fallback for typing the code by hand.
 * -------------------------------------------------------------------------------------------- */

const TOKEN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const TOKEN_LENGTH = 8
export const QR_PREFIX = 'SMARTCAMPUS-DEMO-ATT:'

function randomInt(max: number) {
  const c = (globalThis as { crypto?: Crypto }).crypto
  if (c?.getRandomValues) {
    const a = new Uint32Array(1)
    c.getRandomValues(a)
    return a[0] % max
  }
  return Math.floor(Math.random() * max)
}

export function generateToken() {
  let t = ''
  for (let i = 0; i < TOKEN_LENGTH; i++) t += TOKEN_ALPHABET[randomInt(TOKEN_ALPHABET.length)]
  return t
}

export function generatePin() {
  return String(100000 + randomInt(900000))
}

/** "abcd-efgh", " ABCD EFGH " and "ABCDEFGH" all normalise to "ABCDEFGH". */
export const normalizeToken = (input: string) => input.replace(/[^a-z0-9]/gi, '').toUpperCase()

export const formatToken = (token: string) => (token.length === TOKEN_LENGTH ? `${token.slice(0, 4)}-${token.slice(4)}` : token)

export const qrPayload = (token: string) => `${QR_PREFIX}${token}`

/** Returns the session code inside a scanned QR text, or null if it is not one of our demo QR codes. */
export function parseQrPayload(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed.startsWith(QR_PREFIX)) return null
  const token = normalizeToken(trimmed.slice(QR_PREFIX.length))
  return token.length === TOKEN_LENGTH ? token : null
}

export const isExpired = (session: Pick<AttendanceSession, 'expiresAt'>, nowMs: number) => nowMs >= session.expiresAt
export const remainingMs = (session: Pick<AttendanceSession, 'expiresAt'>, nowMs: number) => Math.max(0, session.expiresAt - nowMs)

export type CheckInResult =
  | { kind: 'success'; subjectName: string; subjectCode: string; markedAt: string }
  | { kind: 'no-session' | 'invalid-code' | 'invalid-qr' | 'expired' | 'invalid-pin' | 'duplicate' }

export function resultMessage(r: CheckInResult): string {
  switch (r.kind) {
    case 'success':
      return `Attendance marked for ${r.subjectName} (${r.subjectCode}).`
    case 'duplicate':
      return 'You have already marked attendance for this session.'
    case 'expired':
      return 'This session has expired. Ask the teacher to regenerate the QR code.'
    case 'invalid-code':
      return 'That session code does not match the open session. It may be mistyped, or the QR code may have been regenerated.'
    case 'invalid-pin':
      return 'The PIN is incorrect. Check the 6-digit PIN shown on the teacher screen.'
    case 'invalid-qr':
      return 'This QR code is not a Smart Campus demo attendance code.'
    case 'no-session':
      return 'No attendance session is open. Start one in the Teacher QR session tab first.'
  }
}
