import type { Metadata } from 'next'
import { AuthLayout } from '@/components/public/auth-layout'
import { LoginForm } from '@/components/public/login-form'

export const metadata: Metadata = { title: 'Student Login' }

export default function LoginPage() {
  return (
    <AuthLayout title="Welcome back" description="Log in to open the local Smart Campus demo portal. No real SSUET account is used.">
      <LoginForm />
    </AuthLayout>
  )
}
