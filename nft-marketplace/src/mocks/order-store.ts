import type { CheckoutInput, Order } from '../features/checkout/contracts'
import { CartError, cartResponse, readCart, saveCart, validateItems } from './cart-store'
import { requireUser, readConnection, walletsFor } from './session-store'
import { getNfts, updateInventory, applyMarketScenario } from './inventory-state'
import { emitNft, emitOrder } from './checkout-events'
import { getScenario } from './scenarios'

const KEY = 'kurio:mock-orders:v1'
interface RecordOrder { order: Order; key: string; fingerprint: string; resolveAt: number; outcome: 'confirmed' | 'declined' }
function records(): RecordOrder[] { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as RecordOrder[] }
function save(records: RecordOrder[]) { localStorage.setItem(KEY, JSON.stringify(records)) }
export function withOrderLock<T>(action: () => T): Promise<T> {
  return navigator.locks ? navigator.locks.request('kurio:mock-order-write', action) : Promise.resolve().then(action)
}
function fingerprint(input: CheckoutInput) {
  return JSON.stringify([input.cartVersion, input.total, input.walletId, input.network, input.provider, input.connectionId,
    ...Object.entries(input.collector).sort(([a], [b]) => a.localeCompare(b)), ...(input.quoteRevision ? [input.quoteRevision] : [])])
}
function settle(id: string): Order {
  const entries = records()
  const entry = entries.find(entry => entry.order.id === id)
  if (!entry) throw new CartError('NOT_FOUND', 'Pedido não encontrado.', 404)
  const order = entry.order
  if (order.status !== 'pending' || Date.now() < entry.resolveAt) return order
  const inventory = getNfts()
  const stock = new Map<string, number>()
  for (const item of order.items) stock.set(item.nft.id, (stock.get(item.nft.id) ?? 0) + item.quantity)
  const unavailable = [...stock].some(([id, quantity]) => (inventory.find(nft => nft.id === id)?.available ?? 0) < quantity)
  order.status = entry.outcome === 'declined' || unavailable ? 'declined' : 'confirmed'
  order.version++
  if (order.status === 'declined') order.declineReason = unavailable ? 'A edição ficou indisponível antes da confirmação. Seus itens foram preservados.' : 'A carteira recusou o pagamento. Seus itens continuam no carrinho.'
  if (order.status === 'confirmed') {
    const cart = readCart(order.userId)
    for (const purchased of order.items) {
      const line = cart.items.find(line => line.nftId + ':' + line.editionId === purchased.id)
      if (line) line.quantity = Math.max(0, line.quantity - purchased.quantity)
    }
    cart.items = cart.items.filter(line => line.quantity > 0)
    cart.version++
    if (!cart.items.length) cart.coupon = null
    saveCart(cart, order.userId)
    for (const [id, quantity] of stock) {
      const nft = inventory.find(nft => nft.id === id)!
      emitNft(updateInventory(id, { available: nft.available - quantity }))
    }
  }
  save(entries)
  emitOrder({ eventId: 'order:' + order.id + ':' + order.version, orderId: order.id, userId: order.userId, version: order.version })
  return order
}
export function getOrder(id: string) {
  const user = requireUser()
  const entry = records().find(entry => entry.order.id === id && entry.order.userId === user.id)
  if (!entry) throw new CartError('NOT_FOUND', 'Pedido não encontrado para esta conta.', 404)
  return structuredClone(settle(id))
}
export function getOrderByAttempt(key: string) {
  const user = requireUser()
  const entry = records().find(entry => entry.key === key && entry.order.userId === user.id)
  if (!entry) throw new CartError('NOT_FOUND', 'Nenhum pedido foi criado para esta tentativa.', 404)
  return getOrder(entry.order.id)
}
export function createOrder(key: string, input: CheckoutInput) {
  const user = requireUser()
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(key)) throw new CartError('VALIDATION', 'Chave de idempotência inválida.')
  const previous = records().find(entry => entry.key === key && entry.order.userId === user.id)
  if (previous) {
    if (previous.fingerprint !== fingerprint(input)) throw new CartError('IDEMPOTENCY_CONFLICT', 'Esta tentativa já foi enviada com outros dados. Recupere o pedido original.', 409)
    return getOrder(previous.order.id)
  }
  const changed = applyMarketScenario(getScenario())
  if (changed) emitNft(changed)
  const cart = readCart()
  const quote = cartResponse(cart)
  if (!cart.items.length) throw new CartError('EMPTY_CART', 'Seu carrinho está vazio.')
  validateItems(cart)
  if (cart.version !== input.cartVersion || quote.quote.total !== input.total || quote.quote.revision !== input.quoteRevision) throw new CartError('QUOTE_CHANGED', 'A cotação mudou. Revise os valores atualizados antes de confirmar novamente.', 409)
  const wallet = walletsFor(user.id).find(wallet => wallet.id === input.walletId)
  if (!wallet || wallet.address.toLowerCase() !== input.collector.walletAddress.toLowerCase()) throw new CartError('WALLET_MISMATCH', 'Selecione o endereço de uma carteira cadastrada nesta conta.')
  if (!wallet.networks.includes(input.network)) throw new CartError('NETWORK_MISMATCH', 'Esta carteira não está cadastrada para a rede selecionada.')
  const connection = readConnection()
  if (!connection || connection.id !== input.connectionId || connection.walletId !== input.walletId || connection.network !== input.network || connection.provider !== input.provider) throw new CartError('WALLET_DISCONNECTED', 'Conecte novamente a carteira antes de confirmar.', 409)
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const order: Order = {
    id: 'KUR-' + crypto.randomUUID().slice(0, 8).toUpperCase(), userId: user.id, version: 1, status: 'pending',
    createdAt: new Date().toISOString(), transactionId: '0x' + [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join(''),
    network: input.network, provider: input.provider, wallet: structuredClone(wallet), collector: structuredClone(input.collector),
    items: structuredClone(quote.items), quote: structuredClone(quote.quote), declineReason: null,
  }
  const scenario = getScenario()
  const entry: RecordOrder = { order, key, fingerprint: fingerprint(input), resolveAt: Date.now() + (scenario === 'order-pending' ? 60_000 : 1800), outcome: scenario === 'payment-declined' ? 'declined' : 'confirmed' }
  save([...records(), entry])
  setTimeout(() => { void withOrderLock(() => settle(order.id)) }, Math.max(0, entry.resolveAt - Date.now()))
  return structuredClone(order)
}
