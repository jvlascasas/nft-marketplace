import { delay, http, HttpResponse } from 'msw'
import { getNfts } from './inventory-state'
import { couponFor } from './coupons'
import { applyMarketScenario } from './inventory-state'
import { emitNft } from './checkout-events'
import { currentSession } from './session-store'
import { cartResponse, CartError, commitCart, readCart, requireVersion } from './cart-store'
import { getScenario, simulateNetwork } from './scenarios'

type Body = Record<string, unknown>
async function readBody(request: Request): Promise<Body> {
  try {
    const value: unknown = await request.json()
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Body
  } catch { /* Structured validation below. */ }
  throw new CartError('VALIDATION', 'Dados da solicitação inválidos.')
}
async function handle(request: Request, mutation: boolean, action: () => object | Promise<object>) {
  const owner = currentSession().user?.id ?? null
  const failure = await simulateNetwork(request)
  if (failure) return failure
  try {
    if (owner !== (currentSession().user?.id ?? null)) throw new CartError('SESSION_CHANGED', 'A sessão mudou. Consulte novamente o carrinho.', 401)
    if (mutation && getScenario() === 'cart-error') { await delay(500); throw new CartError('UNAVAILABLE', 'Não foi possível atualizar o carrinho. Tente novamente.', 503) }
    return HttpResponse.json(await action())
  } catch (error) {
    if (error instanceof CartError) return HttpResponse.json({ code: error.code, message: error.message }, { status: error.status })
    return HttpResponse.json({ code: 'STORAGE_UNAVAILABLE', message: 'Não foi possível salvar o carrinho neste navegador.' }, { status: 503 })
  }
}

export const cartHandlers = [
  http.get('/api/cart', ({ request }) => handle(request, false, () => cartResponse(readCart()))),
  http.post('/api/cart/items', ({ request }) => handle(request, true, async () => {
    const body = await readBody(request)
    if (typeof body.nftId !== 'string' || typeof body.editionId !== 'string' || !Number.isSafeInteger(body.quantity) || Number(body.quantity) < 1) throw new CartError('VALIDATION', 'Selecione um NFT, uma edição e uma quantidade válida.')
    const cart = readCart()
    const existing = cart.items.find(item => item.nftId === body.nftId && item.editionId === body.editionId)
    if (existing) existing.quantity = Math.max(existing.quantity, Number(body.quantity))
    else cart.items.push({ nftId: body.nftId, editionId: body.editionId, quantity: Number(body.quantity) })
    return commitCart(cart)
  })),
  http.patch('/api/cart/items/:itemId', ({ request, params }) => handle(request, true, async () => {
    const body = await readBody(request)
    const cart = readCart()
    requireVersion(cart, body.version)
    const item = cart.items.find(item => item.nftId + ':' + item.editionId === params.itemId)
    if (!item) throw new CartError('NOT_FOUND', 'Este item não está no carrinho.', 404)
    if (!Number.isSafeInteger(body.quantity) || Number(body.quantity) < 1) throw new CartError('VALIDATION', 'A quantidade deve ser um inteiro positivo.')
    item.quantity = Number(body.quantity)
    return commitCart(cart)
  })),
  http.delete('/api/cart/items/:itemId', ({ request, params }) => handle(request, true, async () => {
    const body = await readBody(request)
    const cart = readCart()
    requireVersion(cart, body.version)
    if (!cart.items.some(item => item.nftId + ':' + item.editionId === params.itemId)) throw new CartError('NOT_FOUND', 'Este item não está no carrinho.', 404)
    cart.items = cart.items.filter(item => item.nftId + ':' + item.editionId !== params.itemId)
    return commitCart(cart)
  })),
  http.post('/api/cart/coupon', ({ request }) => handle(request, true, async () => {
    const body = await readBody(request)
    const cart = readCart()
    requireVersion(cart, body.version)
    if (!cart.items.length) throw new CartError('EMPTY_CART', 'Adicione um NFT antes de aplicar um cupom.')
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
    if (code === 'EXPIRADO' || code === 'KURIO2025') throw new CartError('COUPON_EXPIRED', 'Este código promocional expirou.')
    const coupon = couponFor(code)
    if (!coupon) throw new CartError('INVALID_COUPON', 'Código promocional inválido.')
    cart.coupon = coupon.code
    return commitCart(cart)
  })),
  http.delete('/api/cart/coupon', ({ request }) => handle(request, true, async () => {
    const body = await readBody(request)
    const cart = readCart()
    requireVersion(cart, body.version)
    cart.coupon = null
    return commitCart(cart)
  })),
  http.post('/api/quote', ({ request }) => handle(request, false, () => {
    const event = applyMarketScenario(getScenario())
    if (event) emitNft(event)
    return cartResponse(readCart())
  })),
  http.get('/api/cart/recommendations', ({ request }) => handle(request, false, () => ({
    pages: [[1, 2, 3, 4, 5], [3, 4, 5, 6, 8], [9, 10, 11, 12, 13]].map(page => page.map(index => getNfts()[index])),
  }))),
]
