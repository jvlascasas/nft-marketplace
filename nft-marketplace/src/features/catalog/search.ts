import { isEth } from '../../lib/eth'
import { categories, networks, type CatalogParams, type CatalogSearch } from './contracts'

export const defaultCatalog: CatalogParams = {
  q: '', categories: [], networks: [], minPrice: '', maxPrice: '', sort: 'recent', tab: 'all', page: 1,
}

function selected<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  return [...new Set(values.filter((item): item is T => allowed.includes(item)))].sort()
}

export function validateCatalogSearch(raw: Record<string, unknown>): CatalogSearch {
  const result: CatalogSearch = {}
  if (typeof raw.q === 'string' && raw.q.trim()) result.q = raw.q.trim().slice(0, 80)
  const collections = selected(raw.categories, categories.map(category => category.id))
  const chains = selected(raw.networks, networks)
  if (collections.length) result.categories = collections
  if (chains.length) result.networks = chains
  if (isEth(raw.minPrice)) result.minPrice = raw.minPrice
  if (isEth(raw.maxPrice)) result.maxPrice = raw.maxPrice
  if (['price-asc', 'price-desc', 'popular'].includes(String(raw.sort))) result.sort = raw.sort as CatalogSearch['sort']
  if (raw.tab === 'new' || raw.tab === 'trending') result.tab = raw.tab
  const page = Number(raw.page)
  if (Number.isInteger(page) && page > 1 && page <= 1000) result.page = page
  return result
}

export function catalogParams(search: CatalogSearch): CatalogParams {
  return { ...defaultCatalog, ...search }
}

export function catalogQuery(params: CatalogParams): URLSearchParams {
  const query = new URLSearchParams()
  query.set('q', params.q)
  query.set('categories', params.categories.join(','))
  query.set('networks', params.networks.join(','))
  query.set('minPrice', params.minPrice)
  query.set('maxPrice', params.maxPrice)
  query.set('sort', params.sort)
  query.set('tab', params.tab)
  query.set('page', String(params.page))
  return query
}
