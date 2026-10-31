import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isPrivateQuery, sessionKey, sessionSource } from '../checkout/api'

export function SessionSync() {
  const client = useQueryClient()
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel('kurio:session')
    channel.onmessage = event => {
      if (event.data?.type === 'favorites.updated' && event.data.source !== sessionSource) {
        const userId = client.getQueryData<{ user: { id: string } | null }>(sessionKey)?.user?.id
        if (userId === event.data.userId) void client.invalidateQueries({ queryKey: ['favorites', userId] })
        return
      }
      if (event.data?.type === 'account.updated' && event.data.source !== sessionSource) {
        const userId = client.getQueryData<{ user: { id: string } | null }>(sessionKey)?.user?.id
        if (userId === event.data.userId) {
          void client.invalidateQueries({ queryKey: [event.data.resource === 'profile' ? 'profile' : 'wallets', userId] })
          void client.invalidateQueries({ queryKey: [event.data.resource === 'profile' ? 'wallets' : 'profile', userId] })
          void client.invalidateQueries({ queryKey: event.data.resource === 'profile' ? sessionKey : ['wallet-connection', userId] })
        }
        return
      }
      if (event.data?.type !== 'session.changed' || event.data.source === sessionSource) return
      void client.cancelQueries().then(() => {
        client.removeQueries({ predicate: query => isPrivateQuery(query.queryKey) })
        client.setQueryData(sessionKey, { user: null, expiresAt: null })
        void client.invalidateQueries({ queryKey: sessionKey })
      })
    }
    return () => channel.close()
  }, [client])
  return null
}
