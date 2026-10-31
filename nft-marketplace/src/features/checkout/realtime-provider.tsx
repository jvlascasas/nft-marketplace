import { useEffect, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { sessionKey, sessionOptions } from './api'
import type { Nft } from '../catalog/contracts'
import type { NftEvent, Order, OrderEvent, Session } from './contracts'
import { RealtimeContext, type RealtimeState } from './realtime-context'

function validVersion(value: unknown) { return Number.isSafeInteger(value) && Number(value) > 0 }
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient()
  const session = useQuery(sessionOptions)
  const owner = session.data?.user?.id ?? null
  const ready = session.isSuccess
  const [state, setState] = useState<RealtimeState>({ owner: null, connected: false, updatedOrder: '', inventoryEvent: null, notice: '' })
  useEffect(() => {
    if (!ready) return
    let alive = true
    let hadConnection = false
    let noticeTimer: ReturnType<typeof setTimeout> | undefined
    const versions = new Map<string, number>()
    const active = () => alive && (client.getQueryData<Session>(sessionKey)?.user?.id ?? null) === owner
    let socket: Socket | undefined
    const announce = (notice: string) => {
      clearTimeout(noticeTimer)
      setState(current => current.owner === owner ? { ...current, notice } : { owner, connected: false, updatedOrder: '', inventoryEvent: null, notice })
      noticeTimer = setTimeout(() => { if (active()) setState(current => ({ ...current, notice: '' })) }, 10_000)
    }
    const reconcile = () => client.invalidateQueries({ predicate: query => query.state.data !== undefined && (['nfts', 'cart', 'favorites'].includes(String(query.queryKey[0])) || (query.queryKey[0] === 'orders' && query.queryKey[1] === owner)) })
    void import('socket.io-client').then(({ io }) => {
    if (!active()) return
    socket = io(location.origin, { path: '/kurio-events/', transports: ['websocket'], reconnectionDelay: 500, reconnectionDelayMax: 3000, randomizationFactor: 0, timeout: 3000 })
    socket.on('connect', () => {
      if (!active()) return
      setState(current => current.owner === owner ? { ...current, connected: true } : { owner, connected: true, updatedOrder: '', inventoryEvent: null, notice: '' })
      if (hadConnection) { void reconcile(); announce('Conexão restabelecida. Estamos conferindo os dados atualizados.') }
      hadConnection = true
    })
    const disconnected = () => {
      if (!active()) return
      setState(current => ({ ...current, connected: false }))
      if (hadConnection) announce('Conexão em tempo real interrompida. Tentando reconectar; seus dados foram preservados.')
    }
    socket.on('disconnect', disconnected)
    socket.on('connect_error', disconnected)
    socket.on('nft.updated', (event: NftEvent) => {
      if (!active() || !event || typeof event.nftId !== 'string' || !validVersion(event.version)) return
      const key = 'nft:' + event.nftId
      let known = versions.get(key) ?? 0
      for (const [, data] of client.getQueriesData({ predicate: query => ['nfts', 'cart', 'favorites'].includes(String(query.queryKey[0])) })) {
        const resource = data as { nft?: Nft; items?: Array<Nft | { nft: Nft }> } | undefined
        if (resource?.nft?.id === event.nftId) known = Math.max(known, resource.nft.version)
        for (const item of resource?.items ?? []) {
          const nft = 'nft' in item ? item.nft : item
          if (nft.id === event.nftId) known = Math.max(known, nft.version)
        }
      }
      if (event.version <= known) return
      versions.set(key, event.version)
      setState(current => ({ ...current, inventoryEvent: event }))
      if (!location.pathname.startsWith('/pedidos/')) announce('Preço ou disponibilidade de um NFT foram atualizados. Confira os valores antes de continuar.')
      void client.invalidateQueries({ predicate: query => ['nfts', 'cart', 'favorites'].includes(String(query.queryKey[0])) })
    })
    socket.on('order.updated', (event: OrderEvent) => {
      if (!active() || !owner || !event || event.userId !== owner || typeof event.orderId !== 'string' || !validVersion(event.version)) return
      const identity = 'order:' + event.orderId
      const key = ['orders', owner, event.orderId]
      const cached = client.getQueryData<Order>(key)
      if (event.version <= Math.max(versions.get(identity) ?? 0, cached?.version ?? 0) || (cached && cached.status !== 'pending')) return
      versions.set(identity, event.version)
      setState(current => ({ ...current, updatedOrder: event.orderId }))
      void client.invalidateQueries({ queryKey: key })
    })
    }).catch(() => { if (active()) announce('Não foi possível conectar às atualizações. Recarregue a página para tentar novamente.') })
    return () => { alive = false; clearTimeout(noticeTimer); socket?.removeAllListeners(); socket?.disconnect() }
  }, [client, owner, ready])
  const value = state.owner === owner && ready ? state : { owner, connected: false, updatedOrder: '', inventoryEvent: null, notice: '' }
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}
