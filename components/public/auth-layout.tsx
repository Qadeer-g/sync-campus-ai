import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/brand/logo'

const points = [
  'Rule-based academic advisor with weekly study plans',
  'Ticketed complaint tracking',
  'Time-limited QR attendance with backup PIN',
]

export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_480px] xl:grid-cols-[minmax(0,1fr)_560px]">
      <div className="flex flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6 lg:border-b-0 lg:bg-transparent lg:px-10">
          <Logo href="/" />
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Home
          </Link>
        </header>
        <main id="main" className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6 sm:py-14 lg:items-center">
          <div className="w-full max-w-md">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            <div className="mt-8">{children}</div>
          </div>
        </main>
      </div>
      <aside className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex xl:p-14">
        <p className="text-xs font-bold tracking-wider text-primary-foreground/60 uppercase">SSUET Smart Campus AI</p>
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-balance">The Future of Campus Experience.</h2>
          <ul className="mt-8 flex flex-col gap-4">
            {points.map((p) => (
              <li key={p} className="flex gap-3 text-sm text-primary-foreground/80">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary-foreground" aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs leading-relaxed text-primary-foreground/60">
          Student-built academic prototype. Not an official SSUET system. No live student records are accessed.
        </p>
      </aside>
    </div>
  )
}
