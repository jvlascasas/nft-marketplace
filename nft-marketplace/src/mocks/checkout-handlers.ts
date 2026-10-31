import { delay, http, HttpResponse } from 'msw'
import { CartError } from './cart-store'
import { currentSession, demoUsers, readConnection, requireUser, saveConnection, walletsFor } from './session-store'
import { createOrder, getOrder, getOrderByAttempt, withOrderLock } from './order-store'
import { getScenario, simulateNetwork } from './scenarios'
import { validateCollector, type CheckoutInput, type Collector, type PaymentNetwork, type WalletProvider } from '../features/checkout/contracts'

async function bodyOf(request: Request): Promise<Record<string, unknown>> {
  try { const data: unknown = await request.json(); if (data && typeof data === 'object' && !Array.isArray(data)) return data as Record<string, unknown> } catch { /* Return a structured validation error. */ }
  throw new CartError('VALIDATION', 'Solicitação inválida.')
}
async function respond(request: Request, action: () => object | null | Promise<object | null>) {
  const owner = currentSession().user?.id ?? null
  const failure = await simulateNetwork(request)
  if (failure) return failure
  try {
    if (owner !== (currentSession().user?.id ?? null)) throw new CartError('SESSION_CHANGED', 'A sessão mudou. Tente novamente.', 401)
    return HttpResponse.json(await action())
  } catch (error) {
    if (error instanceof CartError) return HttpResponse.json({ code: error.code, message: error.message }, { status: error.status })
    return HttpResponse.json({ code: 'UNAVAILABLE', message: 'Não foi possível completar esta operação. Tente novamente.' }, { status: 503 })
  }
}
function checkoutInput(body: Record<string, unknown>): CheckoutInput {
  const keys: (keyof Collector)[] = ['displayName', 'username', 'profileName', 'email', 'walletAddress', 'secondaryAddress', 'referralCode', 'ensName', 'note']
  if (!body.collector || typeof body.collector !== 'object' || !keys.every(key => typeof (body.collector as Record<string, unknown>)[key] === 'string')) throw new CartError('VALIDATION', 'Preencha os dados do colecionador.')
  const collector = Object.fromEntries(keys.map(key => [key, String((body.collector as Record<string, unknown>)[key]).trim()])) as unknown as Collector
  if (Object.keys(validateCollector(collector, String(body.walletId ?? ''), String(body.network ?? ''))).length) throw new CartError('VALIDATION', 'Revise os campos obrigatórios do colecionador.')
  if (!['Ethereum', 'Polygon'].includes(String(body.network)) || !['WalletConnect', 'MetaMask', 'Coinbase Wallet'].includes(String(body.provider)) || typeof body.connectionId !== 'string' || typeof body.quoteRevision !== 'string' || typeof body.total !== 'string' || !Number.isSafeInteger(body.cartVersion)) throw new CartError('VALIDATION', 'Revise a carteira, a rede e a cotação.')
  return { collector, walletId: String(body.walletId), network: body.network as PaymentNetwork, provider: body.provider as WalletProvider, connectionId: body.connectionId, cartVersion: Number(body.cartVersion), total: body.total, quoteRevision: body.quoteRevision as string }
}
export const checkoutHandlers = [
  http.get('/api/demo-accounts', ({ request }) => respond(request, () => ({ items: demoUsers }))),
  http.get('/api/session', ({ request }) => respond(request, () => currentSession())),
  http.get('/api/wallet-connection', ({ request }) => respond(request, () => readConnection())),
  http.post('/api/wallets/:walletId/connect', ({ request, params }) => respond(request, async () => {
    const user = requireUser()
    const body = await bodyOf(request)
    const wallet = walletsFor(user.id).find(wallet => wallet.id === params.walletId)
    if (!wallet) throw new CartError('NOT_FOUND', 'Carteira não encontrada.', 404)
    if (!body.approved || getScenario() === 'wallet-rejected') throw new CartError('CONNECTION_REJECTED', 'Conexão recusada. Nenhum pedido foi enviado.', 422)
    if (!wallet.networks.includes(body.network as PaymentNetwork)) throw new CartError('NETWORK_MISMATCH', 'Escolha uma rede compatível com esta carteira.')
    if (!['WalletConnect', 'MetaMask', 'Coinbase Wallet'].includes(String(body.provider))) throw new CartError('VALIDATION', 'Selecione o provedor da carteira.')
    const connection = { id: crypto.randomUUID(), walletId: wallet.id, network: body.network as PaymentNetwork, provider: body.provider as WalletProvider }
    saveConnection(connection)
    return connection
  })),
  http.delete('/api/wallet-connection', ({ request }) => respond(request, () => { saveConnection(null); return { connected: false } })),
  http.post('/api/orders', ({ request }) => respond(request, async () => {
    const input = checkoutInput(await bodyOf(request))
    const order = await withOrderLock(() => createOrder(request.headers.get('Idempotency-Key') ?? '', input))
    if (getScenario() === 'order-timeout') await delay(11_000)
    return order
  })),
  http.get('/api/orders/by-attempt/:key', ({ request, params }) => respond(request, () => withOrderLock(() => getOrderByAttempt(String(params.key))))),
  http.get('/api/orders/:orderId', ({ request, params }) => respond(request, () => withOrderLock(() => getOrder(String(params.orderId))))),
]
