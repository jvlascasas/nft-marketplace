import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '../../lib/http'
import type { Nft } from '../catalog/contracts'
import type { Session } from '../checkout/contracts'
import { isUnauthorized, sessionKey, sessionSource } from '../checkout/api'

export interface Favorites { version: number; items: Nft[] }
export const favoritesOptions = (userId: string) => queryOptions({
  queryKey: ['favorites', userId], retry: false,
  queryFn: async ({ signal }) => (await http.get<Favorites>('/favorites', { signal })).data,
})
export function useFavoriteMutation(userId: string, nftId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationKey: ['favorites', userId, nftId],
    onMutate: () => client.cancelQueries({ queryKey: ['favorites', userId] }),
    mutationFn: async (save: boolean) => (await http.request<Favorites>({ url: '/favorites/' + encodeURIComponent(nftId), method: save ? 'PUT' : 'DELETE' })).data,
    onSuccess: result => {
      if (client.getQueryData<Session>(sessionKey)?.user?.id !== userId) return
      client.setQueryData<Favorites>(['favorites', userId], previous => previous && previous.version > result.version ? previous : result)
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('kurio:session')
        channel.postMessage({ type: 'favorites.updated', source: sessionSource, userId })
        channel.close()
      }
    },
    onError: error => { if (isUnauthorized(error)) void client.invalidateQueries({ queryKey: sessionKey }) },
  })
}
