# SSUET Smart Campus AI — Demo Status

> **BUILD NOT VERIFIED.** Nothing in this project has been built, type-checked against its
> installed dependencies, or run in a browser by the person editing it (no `node_modules` and no
> network access were available). `typescript.ignoreBuildErrors` is still `true` in
> `next_config.mjs` (original v0 setting), so a successful `next build` does **not** prove the code
> is type-correct. After installing dependencies, run `pnpm exec tsc --noEmit` and fix what it reports.

## Known unverified items
- `@base-ui/react@1.5.0` (from `pnpm-lock.yaml`): its package source was not available, so none of its
  props were checked. `components/ui/button.tsx` therefore implements `asChild` with plain
  `React.cloneElement` and uses no Base UI-specific prop for it. The normal (non-`asChild`) button path
  is the original `ButtonPrimitive` usage.
- The four files that were renamed on upload (`.gitignore`, `next.config.mjs`, `postcss.config.mjs`, `next-env.d.ts`) already have
  their correct names in this ZIP.
- Camera QR scanning (later step) cannot be tested without a physical device.

## Local demo rules
- Authentication is simulated and local. No SSUET account, server, or external service is used.
- Login always opens the default **Demo Student** profile. Registration saves the name entered.
- Demo data (complaints, marks, attendance) is kept in browser `localStorage` (key
  `ssuet-smart-campus-demo`, version 1) and survives logout and refresh. Passwords are never saved.

## Complaint Center (Step 4)
- Statuses are exactly: **Submitted, Under Review, Resolved**.
- Saved data containing the retired "In Progress" status is migrated on load (`lib/store.tsx`,
  `migrateComplaints`): "In Progress" becomes "Under Review" for the complaint and for every history event.
  History events, dates, notes and timestamps are all kept. Unknown/corrupt statuses fall back to
  "Submitted"; complaints missing required fields or valid dates are skipped. The migration is idempotent.
- Ticket IDs are demo IDs (`DEMO-0160`, ...), unique within the saved data.
- Every Complaint Center page shows: "Local Demo — Not submitted to SSUET."
- The list is sorted newest-first by creation date.

## Account behaviour
- Login keeps the saved profile and all demo data. A browser with no saved data starts as "Demo Student".
- Registration saves the entered details as the demo profile and signs in. It does **not** delete any
  demo data. A confirmed "Reset Demo Data" action will be added in Settings.

## Complaint Center, part 2 (Step 4b)
- Complaints have a **Location** (required in the form, shown in the list and detail page, and searched
  together with ticket ID, title and description). Complaints saved before this existed get an empty location.
- **Unread updates:** each complaint has `unreadCount`. The list shows a "New update" marker; opening a
  complaint resets the counter and marks that complaint's notifications as read (shared store, persisted).
- **Demo-only "Move to next status"** (detail page): Submitted → Under Review → Resolved. Each move adds a
  timestamped history event, bumps `updatedAt` and the unread counter, adds an unread notification
  (only if the "complaint updates" preference is on) and an activity entry. Resolved never advances.
- All of this lives in pure functions in `lib/store.tsx` (`createComplaint`, `advanceComplaint`,
  `markComplaintRead`) used by the shared store, so it persists like the rest of the demo data.
- **Skipped records:** saved complaints that cannot be loaded safely are not shown, but are copied (max 20,
  duplicates ignored) to localStorage key `ssuet-smart-campus-demo:skipped`, logged once to the browser
  console, and counted in a plain-language note on the Complaint list (dismissible per visit). The future
  "Reset Demo Data" action should clear this key too.

## Academic Advisor rules (Step 5)
All figures are plain arithmetic on the marks entered. No AI service, no university system. See the header
comment in `lib/advisor.ts`.
- **Percentage** = obtained ÷ total × 100, rounded to 1 decimal. Labels, the weak check and the
  recommendations all use this same rounded value.
- **Overall score** = Σ obtained ÷ Σ total × 100 (e.g. demo data: 366 of 550 marks = 66.5%).
- **Estimated GPA** = Σ(grade point × credit hours) ÷ Σ credit hours on a *demo* 4.0 scale
  (≥85→4.0, ≥80→3.7, ≥75→3.3, ≥70→3.0, ≥65→2.7, ≥60→2.3, ≥55→2.0, ≥50→1.7, else 0). Not an official SSUET scale.
- **Weak subject** = percentage below 60%. Bands: Critical <50, Needs improvement 50–59.9, Average 60–69.9,
  Good 70–79.9, Excellent 80+.
- **Priority**: High if weak, Medium if 60–69.9%, Low if 70%+. Subjects are listed weakest first
  (ties: more credit hours first, then name).
- **Study hours / week** = credit hours × (0.75 + 0.06 × points below 70%), rounded to the nearest 0.5 h,
  between 1 and 12 h. The weekly plan splits these hours into blocks of up to 2 h.
- **Reasons and tips** are built per subject from its own numbers: marks short of 60%, points above/below
  the target and the overall score, marks needed to reach 70%, its rank, its credit weight and the GPA effect
  of reaching 60%. There is also a "what if every weak subject reached 60%" projection.
- Marks changes (add / edit / remove) go through the shared store: they persist, refresh "Last analysed",
  log an activity entry and update the Dashboard stats (they use the same `analyse()` function).
- Saved subjects with unusable marks are skipped on load and copied to localStorage key
  `ssuet-smart-campus-demo:skipped-subjects` (console warning only, no on-screen message). Reset Demo Data
  (Settings, later) should clear it.

## Advisor alert notification (derived, never stale)
There is one advisor alert (`ntf-advisor`). It is rebuilt from the CURRENT marks whenever marks change, when
the "advisor tips" preference changes, and when saved data loads. It names the weakest subject at its current
percentage, disappears when no subject is below 60%, and returns as unread only when its text changes. The old
fixed-text seed alert ("Subject 3 is below 50%") was removed; a saved copy of it is dropped on load.

## QR Attendance (Step 6): local demo
- **Teacher** (`/attendance/teacher`): pick a generic demo subject, expiry 1/2/3/5/10 min, generate. Shows the
  QR code, a countdown, Active/Expired, the session code (e.g. ABCD-EFGH) and a 6-digit PIN, plus the
  checked-in list. Regenerate = new code + PIN + fresh window for the SAME session (roster kept, old QR/PIN
  stop working). Reset = ends the session and clears its roster (the student's own history is kept).
  "Add demo check-in" adds made-up "Demo Student N" entries so a class list can be shown (not possible after expiry).
- **Student** (`/attendance/student`): camera scan (where supported) or session code + PIN. Messages for no open
  session, wrong code, expired, wrong PIN, not-our-QR and already-marked.
- **Rules** (first failure wins): open session -> code matches -> not expired -> PIN (manual only) -> not already
  marked. QR content is `SMARTCAMPUS-DEMO-ATT:<code>`; the PIN is never in the QR. Duplicates are blocked per
  session (also after Regenerate); a Reset + new session lets the student mark again.
- State (session, roster, attendance history) lives in the shared store and survives refresh and logout/login.
  The countdown is derived from the saved expiry timestamp. Unusable saved records are set aside under
  `ssuet-smart-campus-demo:skipped-attendance`.
- **Camera scanning is UNVERIFIED.** It uses the browser's `BarcodeDetector` + `getUserMedia`, which needs
  browser support, HTTPS or localhost, and camera permission. It has not been run on a real camera. The QR image
  itself (`qrcode.react`) has also not been rendered or decoded in this environment. Use code + PIN as the fallback.

## Settings (Step 7): local demo
- **Profile**: edit name, demo student ID, email, phone (optional), department, program, semester, batch.
  Validated, trimmed, saved through the shared store (`saveProfile`), logged to activity only when something
  actually changed, and kept across refresh and logout/login (login never touches the profile). No photo upload.
- **Theme**: Light / Dark / System (existing theme system; the saved value is applied to `<html>`).
- **Notifications**: Complaint updates, Attendance alerts, Advisor alerts. A switched-off type creates no new
  notifications AND is hidden from the bell menu (nothing is deleted; switching it back on restores it;
  "Mark all read" only touches visible ones). The advisor alert is also removed/re-derived on change.
  The old `emailDigest` preference is not shown (no email is ever sent); it is unused.
- **Reset Demo Data** (confirmation dialog first): restores marks, complaints, attendance session + history,
  notifications, activity, notification preferences and the profile (default "Demo Student"), and deletes the
  three skipped-record backup keys. Kept: the login state and the theme. Only browser localStorage is affected.
- Dashboard "Recent attendance" keeps the last 4 records and now shows the total check-in count.

## AI Campus Agent (Step 8): local, rule-based
- A floating "AI Campus Agent" button (bottom-right, every portal page) opens a chat panel. It is **not an AI
  model**: no network, no server, no external service. A question is normalised, matched against keyword rules
  in `lib/agent.ts` (English + Roman Urdu) and answered from predefined text plus the demo data in this browser.
  It says so when asked ("are you ChatGPT?").
- Covers Dashboard, Academic Advisor, Complaint Center, QR Attendance and Settings: where things are, how to do
  things (using the real button/tab names), and data answers (weak subjects, overall score/GPA on the demo scale,
  study plan, complaint counts and ticket lookup like "DEMO-0141", attendance count, theme/notification state).
  It never reveals a session code or PIN. Fees and campus navigation are politely declined (not in this demo).
- Language: auto-detects English vs Roman Urdu per question; "Roman Urdu" / "English" switches it. Urdu script is
  not understood (it says so, in Roman Urdu).
- Navigation: reply buttons open the page; explicit commands ("open settings", "settings kholo") also navigate.
- Unknown questions get a helpful fallback with clickable example questions.
- The chat is kept in memory only (survives page changes, not refresh/logout) and is not part of Reset Demo Data.
- Copy / like / dislike controls were NOT added: the brief only asked for them "if already present in the design",
  and no such controls exist anywhere in the project.

## Honest status summary
Tested (logic only, with Node against the real modules): store, complaints, advisor rules, attendance rules,
settings, agent intent matching. NOT tested: any screen in a browser, camera scanning, the QR image, theme
switching, the native dialog, responsive layout, `next build`, `next dev`, a real type-check, Next 16 behaviour
(its docs were not available here; only standard App Router patterns were used).

## Run it locally
```bash
pnpm install
pnpm exec tsc --noEmit      # real type-check (ignoreBuildErrors is still true, so `next build` would not catch these)
pnpm build                  # production build
pnpm dev                    # then open http://localhost:3000
# optional: re-run the logic tests (Node + tsx, no browser)
for t in complaints advisor attendance settings agent; do pnpm dlx tsx tests/$t.test.ts; done
```
`package.json` says `pnpm@12.3.4` and Next `16.4.3`; if corepack/pnpm complains about the version, use the pnpm you have installed.
`AGENTS.md` warns that this Next version has breaking changes; this code was written with standard App Router
patterns and was NOT checked against `node_modules/next/dist/docs/` (not available when it was written).
`tests/` is excluded from `tsconfig.json` so it does not add noise to the app's type-check.
