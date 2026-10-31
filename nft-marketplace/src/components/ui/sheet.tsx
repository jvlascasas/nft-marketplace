import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function Sheet({ title, description, trigger, children, className }: { title: string; description: string; trigger: ReactNode; children: ReactNode; className?: string }) {
  return <Dialog.Root>
    <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="sheet-overlay" />
      <Dialog.Content className={cn('sheet-content', className)}>
        <div className="flex items-start justify-between gap-4">
          <div><Dialog.Title className="text-xl font-semibold">{title}</Dialog.Title><Dialog.Description className="mt-2 text-sm text-muted-foreground">{description}</Dialog.Description></div>
          <Dialog.Close className="icon-button shrink-0" aria-label="Fechar painel"><X size={20} /></Dialog.Close>
        </div>
        {children}
        <Dialog.Close className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded bg-primary px-4 text-sm font-semibold text-primary-foreground">Concluir</Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}

export function SheetClose({ children }: { children: ReactNode }) {
  return <Dialog.Close asChild>{children}</Dialog.Close>
}
