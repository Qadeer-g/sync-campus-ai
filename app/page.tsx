import Link from 'next/link'
import { ArrowRight, GraduationCap, MessageSquareWarning, QrCode, ShieldCheck } from 'lucide-react'
import { SiteFooter, SiteHeader } from '@/components/public/site-chrome'
import { HeroPreview } from '@/components/public/hero-preview'
import { Button } from '@/components/ui/button'

const modules = [
  {
    icon: GraduationCap,
    title: 'AI Academic Advisor',
    body: 'Enter your marks, see subject-wise performance, and get a rule-based weekly study plan that targets weak subjects first.',
    href: '/advisor',
  },
  {
    icon: MessageSquareWarning,
    title: 'Complaint Center',
    body: 'Raise issues with a ticket ID and track each one from Submitted through to Resolved.',
    href: '/complaints',
  },
  {
    icon: QrCode,
    title: 'QR Attendance',
    body: 'Teachers generate time-limited QR codes. Students scan to check in, with a backup PIN option.',
    href: '/attendance/student',
  },
]

const steps = [
  { n: '01', title: 'Create your account', body: 'Create a local demo account. No university records are used.' },
  { n: '02', title: 'Open your dashboard', body: 'See your profile, recent activity and quick access to attendance and complaints.' },
  { n: '03', title: 'Use the modules', body: 'Analyse marks, find your way, file complaints and mark attendance in one place.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main id="main">
        <section className="border-b bg-card">
          <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:py-24">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
                <ShieldCheck className="size-3.5 text-brand" aria-hidden="true" />
                Student-built academic prototype
              </p>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-foreground text-balance sm:text-5xl lg:text-[56px] lg:leading-[1.05]">
                The Future of Campus Experience.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg text-pretty">
                SSUET Smart Campus AI brings academic guidance, complaint tracking and QR attendance into
                one calm, consistent student portal — inspired by Sir Syed University of Engineering &amp; Technology, Karachi.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/register">
                    Create student account
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">Log in</Link>
                </Button>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                Prototype only · Uses local demo data · Not connected to official university records.
              </p>
            </div>
            <HeroPreview />
          </div>
        </section>

        <section id="modules" className="scroll-mt-16">
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:py-20 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-bold text-brand">Core modules</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-balance">Three tools, one portal.</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Every module shares the same layout, navigation and design language, so moving between them feels natural.
              </p>
            </div>
            <ul className="mt-10 grid gap-4 sm:grid-cols-3">
              {modules.map((m) => (
                <li key={m.title}>
                  <Link
                    href={m.href}
                    className="group flex h-full flex-col rounded-xl border bg-card p-6 shadow-xs transition-colors hover:border-brand/40"
                  >
                    <span className="flex size-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <m.icon className="size-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 text-base font-bold">{m.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{m.body}</p>
                    <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                      Open module
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-16 border-y bg-card">
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:py-20 lg:px-8">
            <p className="text-sm font-bold text-brand">How it works</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Get started in three steps.</h2>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {steps.map((s) => (
                <li key={s.n} className="rounded-xl border bg-background p-6">
                  <span className="text-sm font-extrabold text-brand">{s.n}</span>
                  <h3 className="mt-3 text-base font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="about" className="scroll-mt-16">
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:py-20 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-8 rounded-2xl bg-primary p-8 text-primary-foreground md:flex-row md:items-center md:p-12">
              <div className="max-w-xl">
                <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl text-balance">About this prototype</h2>
                <p className="mt-3 text-sm leading-relaxed text-primary-foreground/75 sm:text-base">
                  Built as a student project to explore how a modern campus portal could work. Recommendations use simple,
                  transparent rules — not machine learning — and all records shown are sample data.
                </p>
              </div>
              <Button asChild size="lg" variant="secondary">
                <Link href="/login">
                  Try the demo
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
