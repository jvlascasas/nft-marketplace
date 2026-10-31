import { ImageOff } from 'lucide-react'
import { cn } from '../lib/utils'
import type { Nft } from '../features/catalog/contracts'

export function Artwork({ nft, className, priority = false, decorative = false }: { nft: Pick<Nft, 'image' | 'name' | 'tone'>; className?: string; priority?: boolean; decorative?: boolean }) {
  if (nft.image) return <img src={nft.image} alt={decorative ? '' : nft.name} className={cn('artwork', className)} width={450} height={450} loading={priority ? 'eager' : 'lazy'} decoding="async" fetchPriority={priority ? 'high' : 'auto'} />
  return <div className={cn('artwork artwork-placeholder', 'tone-' + nft.tone, className)} role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={'Imagem indisponível de ' + nft.name}>
    <ImageOff size={32} strokeWidth={1} aria-hidden="true" />
    <span>Imagem do NFT</span>
    <small>1:1</small>
  </div>
}
