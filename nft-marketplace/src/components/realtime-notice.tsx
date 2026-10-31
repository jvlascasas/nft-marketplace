import { useMarketplaceRealtime } from '../features/checkout/realtime'

export function RealtimeNotice() {
  const { connected, notice } = useMarketplaceRealtime()
  return <aside aria-label="Atualizações do marketplace"><span className="sr-only" data-testid="realtime-connection">{connected ? 'Conexão do marketplace ativa.' : 'Conectando às atualizações em tempo real.'}</span><div role="status" aria-live="polite" aria-atomic="true" className={notice ? 'realtime-notice' : 'sr-only'}>{notice}</div></aside>
}
