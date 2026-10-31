export const categories = [
  { id: 'digital-art', label: 'Arte digital' },
  { id: 'photography', label: 'Fotografia' },
  { id: 'music', label: 'Música' },
  { id: '3d-art', label: 'Arte 3D' },
  { id: 'collectibles', label: 'Colecionáveis' },
  { id: 'generative', label: 'Generativa' },
  { id: 'games', label: 'Jogos' },
  { id: 'memberships', label: 'Assinaturas' },
  { id: 'utility', label: 'Utilidade' },
] as const

export const networks = ['Ethereum', 'Polygon', 'Solana'] as const
export type Category = typeof categories[number]['id']
export type Network = typeof networks[number]
export type Sort = 'recent' | 'price-asc' | 'price-desc' | 'popular'
export type CatalogTab = 'all' | 'new' | 'trending'
export type MockScenario = 'default' | 'slow' | 'variable-delay' | 'http-error' | 'network-error' | 'empty' | 'cart-empty' | 'cart-error' | 'session-expired' | 'wallet-rejected' | 'payment-declined' | 'order-timeout' | 'order-pending' | 'price-changed' | 'stock-changed' | 'registration-conflict' | 'profile-error' | 'wallets-error'

export interface CatalogSearch {
  q?: string
  categories?: Category[]
  networks?: Network[]
  minPrice?: string
  maxPrice?: string
  sort?: Sort
  tab?: CatalogTab
  page?: number
}
export interface CatalogParams {
  q: string
  categories: Category[]
  networks: Network[]
  minPrice: string
  maxPrice: string
  sort: Sort
  tab: CatalogTab
  page: number
}
export interface Nft {
  id: string
  name: string
  creator: string
  category: Category
  network: Network
  price: string
  previousPrice?: string
  badge?: string
  image: string | null
  tone: 'sage' | 'ivory' | 'mint' | 'sand'
  available: number
  isNew: boolean
  popularity: number
  listedAt: string
  version: number
}
export interface CatalogResponse {
  items: Nft[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  facets: {
    categories: Record<Category, number>
    networks: Record<Network, number>
  }
}
export interface CurationResponse {
  highlights: Nft[]
  spotlight: Nft
  collectors: Nft[]
}
export interface ApiError {
  code: string
  message: string
  fields?: Record<string, string>
}
