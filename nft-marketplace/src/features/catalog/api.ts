import { queryOptions } from '@tanstack/react-query'
import { http } from '../../lib/http'
import type { CatalogParams, CatalogResponse, CurationResponse } from './contracts'
import { catalogQuery } from './search'

export function catalogOptions(params: CatalogParams, view: 'desktop' | 'mobile' = 'desktop') {
  const query = catalogQuery(params)
  query.set('view', view)
  return queryOptions({
    queryKey: ['nfts', 'list', params, view],
    queryFn: async ({ signal }) => (await http.get<CatalogResponse>('/nfts', { params: query, signal })).data,
  })
}

export const curationOptions = queryOptions({
  queryKey: ['nfts', 'curation'],
  queryFn: async ({ signal }) => (await http.get<CurationResponse>('/curation', { signal })).data,
})
