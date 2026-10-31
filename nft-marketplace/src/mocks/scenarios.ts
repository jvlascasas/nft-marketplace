import { delay, HttpResponse } from 'msw'
import type { MockScenario } from '../features/catalog/contracts'

const scenarios: MockScenario[] = ['default', 'slow', 'variable-delay', 'http-error', 'network-error', 'empty', 'cart-empty', 'cart-error', 'session-expired', 'wallet-rejected', 'payment-declined', 'order-timeout', 'order-pending', 'price-changed', 'stock-changed', 'registration-conflict', 'profile-error', 'wallets-error']

export function getScenario(): MockScenario {
  try {
    const value = localStorage.getItem('nft-marketplace:scenario') as MockScenario | null
    return value && scenarios.includes(value) ? value : 'default'
  } catch { return 'default' }
}

export async function simulateNetwork(request: Request) {
  const scenario = getScenario()
  const url = new URL(request.url)
  await delay(scenario === 'slow' ? 2500 : scenario === 'variable-delay' ? ((url.searchParams.get('q')?.length ?? 0) < 3 ? 1500 : 150) : 250)
  if (scenario === 'network-error') return HttpResponse.error()
  if (scenario === 'http-error') return HttpResponse.json({ code: 'UNAVAILABLE', message: 'O serviço está temporariamente indisponível.' }, { status: 503 })
  return undefined
}
