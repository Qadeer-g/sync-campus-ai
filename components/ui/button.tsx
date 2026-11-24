import * as React from 'react'
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent text-sm font-semibold whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        brand: 'bg-brand text-brand-foreground hover:bg-brand/90',
        outline: 'border-border bg-card text-foreground hover:bg-muted',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        ghost: 'text-foreground hover:bg-muted',
        destructive: 'bg-destructive/10 text-destructive hover:bg-destructive/15',
        link: 'h-auto px-0 text-brand underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-9 px-3 text-[13px]',
        lg: 'h-11 px-5',
        icon: 'size-10',
        'icon-sm': 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /**
     * Render the single child element (e.g. a next/link <Link>) with the button's styling
     * instead of a <button>. Implemented with React.cloneElement only, so it does not rely on
     * any Base UI prop (`render` / `nativeButton` could not be verified against
     * @base-ui/react@1.5.0 because the package source was unavailable). The child stays a
     * normal link, so no role="button" is added.
     */
    asChild?: boolean
  }

// Only these attributes are forwarded onto an `asChild` element. Base UI-specific props
// (render, nativeButton, focusableWhenDisabled, ...) are deliberately not forwarded to the DOM.
const FORWARDED_ATTR = /^(aria-|data-)/
const FORWARDED_KEYS = new Set(['id', 'title', 'style', 'onClick'])

function Button({ className, variant = 'default', size = 'default', asChild = false, children, ...props }: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, className }))

  if (asChild && React.isValidElement<{ className?: string }>(children)) {
    const forwarded = Object.fromEntries(
      Object.entries(props).filter(([key]) => FORWARDED_KEYS.has(key) || FORWARDED_ATTR.test(key)),
    )
    return React.cloneElement(children, {
      ...forwarded,
      'data-slot': 'button',
      className: cn(classes, children.props.className),
    } as React.HTMLAttributes<HTMLElement>)
  }

  return (
    <ButtonPrimitive data-slot="button" className={classes} {...props}>
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
