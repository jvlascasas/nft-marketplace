import { nftFixtures } from './fixtures/nfts'
import type { Nft } from '../features/catalog/contracts'

const KEY = 'kurio:mock-inventory:v1'
type Change = { price?: string; available?: number; version: number }
function changes(): Record<string, Change> { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Change> }
export function getNfts(): Nft[] {
  const overrides = changes()
  return nftFixtures.map(nft => ({ ...nft, ...overrides[nft.id] }))
}
export function updateInventory(nftId: string, update: Omit<Change, 'version'>) {
  const overrides = changes()
  const nft = getNfts().find(nft => nft.id === nftId)!
  overrides[nftId] = { ...overrides[nftId], ...update, version: nft.version + 1 }
  localStorage.setItem(KEY, JSON.stringify(overrides))
  return { eventId: 'nft:' + nftId + ':' + (nft.version + 1), nftId, version: nft.version + 1 }
}
export function applyMarketScenario(scenario: string) {
  const first = getNfts()[0]
  if (scenario === 'price-changed' && first.price === '1.19') return updateInventory(first.id, { price: '1.29' })
  if (scenario === 'stock-changed' && first.available > 1) return updateInventory(first.id, { available: 1 })
  return null
}
