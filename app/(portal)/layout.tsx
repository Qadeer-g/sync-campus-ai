import { CampusAgent } from '@/components/agent/campus-agent'
import { AuthGate } from '@/components/shell/auth-gate'
import { Header } from '@/components/shell/header'
import { MobileNav } from '@/components/shell/mobile-nav'
import { Sidebar } from '@/components/shell/sidebar'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-dvh bg-background">
        <Sidebar />
        <Header />
        <main id="main" className="pt-16 pb-[calc(4rem+env(safe-area-inset-bottom)+1.5rem)] lg:pb-0 lg:pl-64">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:p-8">{children}</div>
        </main>
      </div>
      <CampusAgent />
    </AuthGate>
  )
}
