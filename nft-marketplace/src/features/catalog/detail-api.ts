import { queryOptions } from '@tanstack/react-query'
import { http } from '../../lib/http'
import type { NftDetailResponse } from './detail-contracts'

export function nftDetailOptions(nftId: string) {
  return queryOptions({
    queryKey: ['nfts', 'detail', nftId],
    queryFn: async ({ signal }) => (await http.get<NftDetailResponse>('/nfts/' + encodeURIComponent(nftId), { signal })).data,
  })
}
