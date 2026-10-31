import { http, HttpResponse } from 'msw'
import { ethToWei } from '../lib/eth'
import { CartError } from './errors'
import { getNfts, updateInventory } from './inventory-state'
import { getOrder, withOrderLock } from './order-store'
import { disconnectMockSocket, emitNft, emitOrder, socketStats } from './checkout-events'
// Network fixtures for demonstration and E2E; imported only when MSW is enabled.
export const controlHandlers = [
 http.get('/api/mock/control', () => HttpResponse.json(socketStats())),
 http.post('/api/mock/control', async ({ request }) => {
  try {
   const body = await request.json() as Record<string, unknown>
   if (!body || typeof body !== 'object') throw new CartError('VALIDATION', 'Controle inválido.')
   if (body.action === 'disconnect') {
    const duration = Number(body.durationMs ?? 3000)
    if (!Number.isSafeInteger(duration) || duration < 0 || duration > 120_000) throw new CartError('VALIDATION', 'Duração inválida.')
    disconnectMockSocket(duration); return HttpResponse.json(socketStats())
   }
   const copies = Number(body.copies ?? 1)
   if (!Number.isSafeInteger(copies) || copies < 1 || copies > 10) throw new CartError('VALIDATION', 'Quantidade de eventos inválida.')
   return await withOrderLock(() => {
    if (body.action === 'inventory' || body.action === 'replay-nft') {
     const nft = getNfts().find(nft => nft.id === body.nftId)
     if (!nft) throw new CartError('NOT_FOUND', 'NFT não encontrado.', 404)
     if (body.action === 'inventory') {
      const update: { price?: string; available?: number } = {}
      if (body.price !== undefined) {
       if (typeof body.price !== 'string' || !/^\d+(\.\d{1,18})?$/.test(body.price)) throw new CartError('VALIDATION', 'Preço inválido.')
       ethToWei(body.price); update.price = body.price
      }
      if (body.available !== undefined) {
       if (!Number.isSafeInteger(body.available) || Number(body.available) < 0) throw new CartError('VALIDATION', 'Disponibilidade inválida.')
       update.available = Number(body.available)
      }
      if (!Object.keys(update).length) throw new CartError('VALIDATION', 'Informe preço ou disponibilidade.')
      const event = updateInventory(nft.id, update)
      for (let index = 0; index < copies; index++) emitNft(event)
      return HttpResponse.json({ event, nft: getNfts().find(item => item.id === nft.id) })
     }
     const version = Number(body.version)
     if (!Number.isSafeInteger(version) || version < 1 || version > nft.version) throw new CartError('VALIDATION', 'Versão inválida.')
     const event = { eventId: 'nft:' + nft.id + ':' + version, nftId: nft.id, version }
     for (let index = 0; index < copies; index++) emitNft(event)
     return HttpResponse.json({ event })
    }
    if (body.action === 'replay-order') {
     const order = getOrder(String(body.orderId)); const version = Number(body.version)
     if (!Number.isSafeInteger(version) || version < 1 || version > order.version) throw new CartError('VALIDATION', 'Versão inválida.')
     const event = { eventId: 'order:' + order.id + ':' + version, orderId: order.id, userId: order.userId, version }
     for (let index = 0; index < copies; index++) emitOrder(event)
     return HttpResponse.json({ event })
    }
    throw new CartError('VALIDATION', 'Ação de controle inválida.')
   })
  } catch (error) {
   if (error instanceof CartError) return HttpResponse.json({ code: error.code, message: error.message }, { status: error.status })
   return HttpResponse.json({ code: 'VALIDATION', message: 'Controle inválido.' }, { status: 422 })
  }
 }),
]
