import Link from 'next/link'
import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 h-16 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo href="/" />
        <nav aria-label="Primary" className="hidden items-center gap-8 text-sm font-semibold text-muted-foreground md:flex">
          <a href="#modules" className="hover:text-foreground">Modules</a>
          <a href="#how-it-works" className="hover:text-foreground">How it works</a>
          <a href="#about" className="hover:text-foreground">About</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Register</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div>
          <Logo href="/" inverted />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-primary-foreground/70">
            A student-built academic prototype inspired by Sir Syed University of Engineering &amp; Technology, Karachi.
            Not an officially deployed university system and not connected to live student records.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-bold">Modules</h2>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm text-primary-foreground/70">
            <li><Link href="/advisor" className="hover:text-primary-foreground">AI Academic Advisor</Link></li>
            <li><Link href="/complaints" className="hover:text-primary-foreground">Complaint Center</Link></li>
            <li><Link href="/attendance/student" className="hover:text-primary-foreground">QR Attendance</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-bold">Account</h2>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm text-primary-foreground/70">
            <li><Link href="/login" className="hover:text-primary-foreground">Student login</Link></li>
            <li><Link href="/register" className="hover:text-primary-foreground">Create account</Link></li>
            <li><Link href="/attendance/teacher" className="hover:text-primary-foreground">Teacher QR generator</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10">
        <p className="mx-auto max-w-[1200px] px-4 py-5 text-xs text-primary-foreground/60 sm:px-6 lg:px-8">
          © 2026 SSUET Smart Campus AI · Academic prototype for demonstration purposes.
        </p>
      </div>
    </footer>
  )
}
