import type { Nft } from '../features/catalog/contracts'
import type { NftEdition } from '../features/catalog/detail-contracts'

export function editionsFor(nft: Nft): NftEdition[] {
  return [
    { id: 'unique', label: '1/1', price: '2.49', available: 0 },
    { id: 'ten', label: '1/10', price: '1.69', available: nft.available },
    { id: 'fifty', label: '1/50', price: nft.price, available: nft.available },
    { id: 'open', label: 'ABERTA', price: '0.49', available: nft.available },
  ]
}
