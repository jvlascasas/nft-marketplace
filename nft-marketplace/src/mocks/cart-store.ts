import type { CartResponse } from '../features/cart/contracts'
import { ethToWei, weiToEth } from '../lib/eth'
import { getNfts } from './inventory-state'
import { couponFor } from './coupons'
import { currentSession } from './session-store'
import { editionsFor } from './inventory'
import { getScenario } from './scenarios'
import { CartError } from './errors'
export { CartError } from './errors'

export const CART_STORAGE_KEY = 'kurio:mock-cart:visitor:v1'
interface StoredItem { nftId: string; editionId: string; quantity: number }
export interface StoredCart { schema: 1; version: number; items: StoredItem[]; coupon: string | null }

export function readCart(userId: string | null = currentSession().user?.id ?? null): StoredCart {
  const raw = localStorage.getItem(userId ? CART_STORAGE_KEY + ':' + userId : CART_STORAGE_KEY)
  if (raw) {
    try {
      const data = JSON.parse(raw) as StoredCart
      if (data.schema === 1 && Number.isSafeInteger(data.version) && data.version > 0 && Array.isArray(data.items) &&
        data.items.every(item => typeof item.nftId === 'string' && typeof item.editionId === 'string' && Number.isSafeInteger(item.quantity) && item.quantity > 0) &&
        (data.coupon === null || couponFor(data.coupon))) return data
    } catch { /* Restore the known scenario if local mock storage is malformed. */ }
  }
  const initial: StoredCart = { schema: 1, version: 1, items: userId || getScenario() === 'cart-empty' ? [] : [
    { nftId: 'emerald-ape-042', editionId: 'fifty', quantity: 2 },
    { nftId: 'violet-nomad-314', editionId: 'fifty', quantity: 6 },
    { nftId: 'ivory-baron-088', editionId: 'fifty', quantity: 9 },
  ], coupon: null }
  saveCart(initial, userId)
  return initial
}

export function saveCart(cart: StoredCart, userId: string | null = currentSession().user?.id ?? null) {
  localStorage.setItem(userId ? CART_STORAGE_KEY + ':' + userId : CART_STORAGE_KEY, JSON.stringify(cart))
}

export function requireVersion(cart: StoredCart, version: unknown) {
  if (version !== cart.version) throw new CartError('CART_CONFLICT', 'O carrinho foi atualizado em outra operação. Revise os valores e tente novamente.', 409)
}

export function validateItems(cart: StoredCart) {
  for (const item of cart.items) {
    const nft = getNfts().find(nft => nft.id === item.nftId)
    if (!nft) throw new CartError('NOT_FOUND', 'O NFT não está mais disponível.', 404)
    const edition = editionsFor(nft).find(edition => edition.id === item.editionId)
    if (!edition || !edition.available) throw new CartError('EDITION_UNAVAILABLE', 'Esta edição está esgotada.', 409)
    const totalForNft = cart.items.filter(line => line.nftId === nft.id).reduce((total, line) => total + line.quantity, 0)
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > edition.available || totalForNft > nft.available) {
      throw new CartError('STOCK_CONFLICT', 'A quantidade excede a disponibilidade deste NFT.', 409)
    }
  }
}

export function cartResponse(cart: StoredCart): CartResponse {
  const items = cart.items.map(item => {
    const nft = getNfts().find(nft => nft.id === item.nftId)!
    const edition = editionsFor(nft).find(edition => edition.id === item.editionId)!
    const otherQuantity = cart.items.filter(line => line.nftId === item.nftId && line.editionId !== item.editionId).reduce((sum, line) => sum + line.quantity, 0)
    return {
      id: item.nftId + ':' + item.editionId, nft, editionId: edition.id, editionLabel: edition.label,
      quantity: item.quantity, available: Math.max(0, Math.min(edition.available, nft.available - otherQuantity)),
      unitPrice: edition.price, lineTotal: weiToEth(ethToWei(edition.price) * BigInt(item.quantity)),
    }
  })
  const subtotal = items.reduce((sum, item) => sum + ethToWei(item.lineTotal), 0n)
  const coupon = couponFor(cart.coupon)
  const discount = coupon ? subtotal * BigInt(coupon.percent) / 100n : 0n
  const networkFee = (subtotal - discount) * 6n / 10_000n
  return { version: cart.version, items, quote: {
    revision: [cart.version, ...items.map(item => item.id + '@' + item.nft.version), coupon?.code ?? '', weiToEth(networkFee)].join('|'),
    cartVersion: cart.version, subtotal: weiToEth(subtotal), discount: weiToEth(discount),
    networkFee: weiToEth(networkFee), networkFeePercent: '0.06', total: weiToEth(subtotal - discount + networkFee),
    coupon,
  } }
}

export function commitCart(cart: StoredCart): CartResponse {
  validateItems(cart)
  cart.version++
  if (!cart.items.length) cart.coupon = null
  saveCart(cart)
  return cartResponse(cart)
}
