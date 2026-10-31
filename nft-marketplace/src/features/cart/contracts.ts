import type { Nft } from '../catalog/contracts'

export interface CartItem {
  id: string
  nft: Nft
  editionId: string
  editionLabel: string
  quantity: number
  available: number
  unitPrice: string
  lineTotal: string
}
export interface CartQuote {
  revision: string
  cartVersion: number
  subtotal: string
  discount: string
  networkFee: string
  networkFeePercent?: string
  total: string
  coupon: { code: string; percent: number; appliesTo: 'subtotal' | 'total' } | null
}
export interface CartResponse {
  version: number
  items: CartItem[]
  quote: CartQuote
}
export interface AddCartItem {
  nftId: string
  editionId: string
  quantity: number
}
