import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.ComponentProps<'section'>) {
  return <section className={cn('rounded-xl border bg-card text-card-foreground shadow-xs', className)} {...props} />
}

type CardHeaderProps = {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
  as?: 'h2' | 'h3'
}

export function CardHeader({ title, description, action, className, as: Heading = 'h2' }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6', className)}>
      <div className="min-w-0">
        <Heading className="text-base font-bold text-foreground">{title}</Heading>
        {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  )
}

export function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('px-5 py-5 sm:px-6', className)} {...props} />
}
