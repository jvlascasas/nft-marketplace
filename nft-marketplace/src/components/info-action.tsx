import type { ReactNode } from 'react'
import { Sheet } from './ui/sheet'

export function InfoAction({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return <Sheet title={title} description="Conteúdo complementar." trigger={<button type="button" className={className}>{children}</button>}>
    <p className="mt-8 leading-relaxed text-muted-foreground">Esta área não faz parte da demonstração do marketplace. Nenhuma ação externa foi realizada.</p>
  </Sheet>
}
