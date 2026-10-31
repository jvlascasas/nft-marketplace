import { http, HttpResponse } from 'msw'
import { categories, networks, type CatalogResponse, type CurationResponse } from '../features/catalog/contracts'
import { catalogParams, validateCatalogSearch } from '../features/catalog/search'
import { ethToWei } from '../lib/eth'
import { getNfts } from './inventory-state'
import { getScenario, simulateNetwork } from './scenarios'

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export const catalogHandlers = [
  http.get('/api/nfts', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const search = Object.fromEntries(new URL(request.url).searchParams)
    const params = catalogParams(validateCatalogSearch(search))
    if (params.minPrice && params.maxPrice && ethToWei(params.minPrice) > ethToWei(params.maxPrice)) {
      return HttpResponse.json({ code: 'VALIDATION', message: 'O preço mínimo deve ser menor ou igual ao máximo.' }, { status: 422 })
    }
    let items = getNfts().filter(nft =>
      (!params.q || normalize(nft.name + ' ' + nft.creator).includes(normalize(params.q))) &&
      (!params.categories.length || params.categories.includes(nft.category)) &&
      (!params.networks.length || params.networks.includes(nft.network)) &&
      (!params.minPrice || ethToWei(nft.price) >= ethToWei(params.minPrice)) &&
      (!params.maxPrice || ethToWei(nft.price) <= ethToWei(params.maxPrice)) &&
      (params.tab !== 'new' || nft.isNew) &&
      (params.tab !== 'trending' || nft.popularity >= 60),
    )
    if (getScenario() === 'empty') items = []
    items = [...items].sort((a, b) => {
      if (params.sort === 'popular') return b.popularity - a.popularity || a.id.localeCompare(b.id)
      if (params.sort === 'recent') return b.listedAt.localeCompare(a.listedAt) || a.id.localeCompare(b.id)
      const difference = ethToWei(a.price) - ethToWei(b.price)
      const result = difference < 0n ? -1 : difference > 0n ? 1 : a.id.localeCompare(b.id)
      return params.sort === 'price-asc' ? result : -result
    })
    if (search.view === 'mobile' && params.sort === 'recent' && params.tab === 'all' && !params.q && !params.categories.length && !params.networks.length && !params.minPrice && !params.maxPrice) {
      const featured = ['emerald-ape-042', 'sage-nomad-009', 'neon-vessel-552', 'golden-beat-207']
      items = [...featured.flatMap(id => items.filter(item => item.id === id)), ...items.filter(item => !featured.includes(item.id))]
    }
    const pageSize = 9
    const totalPages = Math.ceil(items.length / pageSize)
    return HttpResponse.json<CatalogResponse>({
      items: items.slice((params.page - 1) * pageSize, params.page * pageSize),
      total: items.length, page: params.page, pageSize, totalPages,
      facets: {
        categories: Object.fromEntries(categories.map(category => [category.id, getNfts().filter(nft => nft.category === category.id).length])) as CatalogResponse['facets']['categories'],
        networks: Object.fromEntries(networks.map(network => [network, getNfts().filter(nft => nft.network === network).length])) as CatalogResponse['facets']['networks'],
      },
    })
  }),
  http.get('/api/curation', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    return HttpResponse.json<CurationResponse>({
      highlights: [getNfts()[0], getNfts()[1], getNfts()[2]],
      spotlight: getNfts()[3],
      collectors: [getNfts()[5], getNfts()[0], getNfts()[1], getNfts()[6]],
    })
  }),
]
