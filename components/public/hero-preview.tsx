import { GraduationCap, MessageSquareWarning, QrCode } from 'lucide-react'

const bars = [
  { label: 'Subject 5', pct: 85 },
  { label: 'Subject 1', pct: 78 },
  { label: 'Subject 4', pct: 66 },
  { label: 'Subject 2', pct: 52 },
  { label: 'Subject 3', pct: 44 },
]

export function HeroPreview() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-lg">
      <div className="rounded-2xl border bg-background p-3 shadow-lg">
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <GraduationCap className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold">Performance overview</p>
                <p className="text-xs text-muted-foreground">Sample semester</p>
              </div>
            </div>
            <span className="rounded border border-warning/40 bg-warning/10 px-1.5 text-[10px] font-bold tracking-wider text-warning">
              DEMO DATA
            </span>
          </div>
          <ul className="flex flex-col gap-3.5 px-5 py-5">
            {bars.map((b) => (
              <li key={b.label} className="grid grid-cols-[88px_1fr_40px] items-center gap-3 text-xs">
                <span className="truncate font-semibold text-muted-foreground">{b.label}</span>
                <span className="h-2 overflow-hidden rounded-full bg-muted">
                  <span
                    className={b.pct < 60 ? 'block h-full rounded-full bg-destructive/80' : 'block h-full rounded-full bg-brand'}
                    style={{ width: `${b.pct}%` }}
                  />
                </span>
                <span className="text-right font-bold">{b.pct}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-card p-4">
            <QrCode className="size-5 text-brand" />
            <p className="mt-3 text-sm font-bold">QR Attendance</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Expires in 02:48</p>
          </div>
          <div className="rounded-xl bg-primary p-4 text-primary-foreground">
            <MessageSquareWarning className="size-5" />
            <p className="mt-3 text-sm font-bold">Complaint Center</p>
            <p className="mt-0.5 text-xs text-primary-foreground/70">Submitted → Resolved</p>
          </div>
        </div>
      </div>
    </div>
  )
}
