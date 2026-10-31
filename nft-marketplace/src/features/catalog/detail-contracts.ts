import type { Nft } from './contracts'

export interface NftEdition {
  id: string
  label: string
  price: string
  available: number
}
export interface NftReview {
  id: string
  author: string
  rating: number
  text: string
  date: string
}
export interface NftDetailResponse {
  nft: Nft
  gallery: Array<{ id: string; src: string | null; alt: string }>
  editions: NftEdition[]
  defaultEditionId: string
  about: string
  mobileAbout: string
  description: string[]
  tokenId: string
  collectionName: string
  attributes: string[]
  networkDescription: string
  contract: string
  royalties: string
  rating: string
  reviews: NftReview[]
  related: Nft[][]
}
