import type { ComponentProps } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
  { variants: { variant: {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-border bg-background hover:bg-muted',
  } }, defaultVariants: { variant: 'default' } },
)

// shadcn/ui composition: Radix Slot + CVA + Tailwind, adapted to this theme.
export function Button({ className, variant, asChild = false, ...props }: ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button'
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, className }))} {...props} />
}
