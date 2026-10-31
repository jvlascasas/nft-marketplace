import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { OrderEvent, NftEvent } from '../features/checkout/contracts'
import type { Session } from '../features/checkout/contracts'
let sessionReader: (() => Session) | undefined
type Listener = { userId: string | null; emit: (event: string, data: OrderEvent | NftEvent) => void; close: () => void }
const listeners = new Set<Listener>()
let offlineUntil = 0
const counts = { nft: 0, order: 0 }
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('kurio:mock-server-events') : null
function deliver(type: 'nft.updated' | 'order.updated', event: NftEvent | OrderEvent) {
 for (const listener of listeners) {
  if (type === 'nft.updated') { counts.nft++; listener.emit(type, event) }
  else if ('userId' in event && listener.userId === event.userId && sessionReader?.().user?.id === event.userId) { counts.order++; listener.emit(type, event) }
 }
}
if (channel) channel.onmessage = message => { if (message.data?.type === 'nft.updated' || message.data?.type === 'order.updated') deliver(message.data.type, message.data.event) }
export function emitOrder(event: OrderEvent) { deliver('order.updated', event); channel?.postMessage({ type: 'order.updated', event }) }
export function emitNft(event: NftEvent) { deliver('nft.updated', event); channel?.postMessage({ type: 'nft.updated', event }) }
export function disconnectMockSocket(durationMs: number) { offlineUntil = Date.now() + durationMs; for (const listener of listeners) listener.close() }
export function socketStats() { return { connections: listeners.size, offlineUntil, frames: { ...counts } } }
const socket = ws.link(/wss?:\/\/[^/]+\/kurio-events\/?/)
export const checkoutSocketHandler = socket.addEventListener('connection', async connection => {
 const { currentSession } = await import('./session-store')
 sessionReader = currentSession
 if (Date.now() < offlineUntil) { setTimeout(() => connection.client.close(1013, 'Simulated network interruption'), 0); return }
 const io = toSocketIo(connection)
 const { getNfts } = await import('./inventory-state')
 let snapshotSent = false
 connection.client.addEventListener('message', message => {
   if (snapshotSent || typeof message.data !== 'string' || !message.data.startsWith('40')) return
   snapshotSent = true
   for (const nft of getNfts().filter(nft => nft.version > 1)) io.client.emit('nft.updated', { eventId: 'nft:' + nft.id + ':' + nft.version, nftId: nft.id, version: nft.version })
 })
 const userId = currentSession().user?.id ?? null
 const listener = { userId, emit: (event: string, data: OrderEvent | NftEvent) => io.client.emit(event, data), close: () => connection.client.close(1012, 'Simulated network interruption') }
 listeners.add(listener)
 const heartbeat = setInterval(() => connection.client.send('2'), 20_000)
 connection.client.addEventListener('close', () => { clearInterval(heartbeat); listeners.delete(listener) })
})
if (import.meta.hot) import.meta.hot.dispose(() => { channel?.close(); for (const listener of listeners) listener.close() })
