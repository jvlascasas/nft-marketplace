import { useQuery } from '@tanstack/react-query'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { systemStatusOptions } from './api'

export function SetupPage() {
  const status = useQuery(systemStatusOptions)
  return <section className="mx-auto max-w-3xl py-10 sm:py-20">
    <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-primary">Etapa 01 · Estrutura técnica</p>
    <h1 className="text-4xl font-semibold leading-tight sm:text-6xl">O começo da sua<br />coleção digital.</h1>
    <p className="mt-6 max-w-xl leading-relaxed text-muted-foreground">A base do marketplace está pronta para receber o catálogo. Esta é uma tela provisória de desenvolvimento; a reprodução do Figma será feita na próxima etapa.</p>
    <div className="mt-10 rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Conexão com a API simulada</h2>
      <div className="mt-4 min-h-20" role="status" aria-live="polite" aria-busy={status.isPending}>
        {status.isPending ? <><span className="sr-only">Verificando conexão…</span><Skeleton className="mb-3 h-5 w-60 max-w-full" /><Skeleton className="h-5 w-40" /></> : status.isError ? <>
          <p className="mb-4">Não foi possível acessar a API.</p>
          <Button variant="outline" onClick={() => void status.refetch()} disabled={status.isFetching}>Tentar novamente</Button>
        </> : <><p className="font-medium text-primary">API simulada conectada</p><p className="mt-2 text-sm text-muted-foreground">Requisição via Axios, interceptada pelo MSW e gerenciada pelo TanStack Query.</p></>}
      </div>
    </div>
  </section>
}
