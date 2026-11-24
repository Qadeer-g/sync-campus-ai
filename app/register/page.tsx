import type { Metadata } from 'next'
import { AuthLayout } from '@/components/public/auth-layout'
import { RegisterForm } from '@/components/public/register-form'

export const metadata: Metadata = { title: 'Student Registration' }

export default function RegisterPage() {
  return (
    <AuthLayout title="Create your account" description="Create a local demo account for the SSUET Smart Campus AI prototype. Nothing is sent to SSUET.">
      <RegisterForm />
    </AuthLayout>
  )
}
