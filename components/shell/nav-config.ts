import { GraduationCap, LayoutDashboard, MessageSquareWarning, Settings } from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  match: string[]
}

export const sidebarNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, match: ['/dashboard', '/attendance'] },
  { label: 'Academic Advisor', href: '/advisor', icon: GraduationCap, match: ['/advisor'] },
  { label: 'Complaint Center', href: '/complaints', icon: MessageSquareWarning, match: ['/complaints'] },
  { label: 'Settings', href: '/settings', icon: Settings, match: ['/settings'] },
]

export const mobileNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, match: ['/dashboard', '/attendance'] },
  { label: 'Advisor', href: '/advisor', icon: GraduationCap, match: ['/advisor'] },
  { label: 'Complaints', href: '/complaints', icon: MessageSquareWarning, match: ['/complaints'] },
]

export function isActive(pathname: string, match: string[]) {
  return match.some((m) => pathname === m || pathname.startsWith(`${m}/`))
}

const titles: [string, string][] = [
  ['/attendance', 'QR Attendance'],
  ['/dashboard', 'Dashboard'],
  ['/advisor', 'Academic Advisor'],
  ['/complaints', 'Complaint Center'],
  ['/settings', 'Settings'],
]

export function sectionTitle(pathname: string) {
  return titles.find(([p]) => pathname === p || pathname.startsWith(`${p}/`))?.[1] ?? 'Student Portal'
}
