import { memo } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { FavoriteButton } from '../favorites/favorite-button'
import { Artwork } from '../../components/artwork'
import { formatEth } from '../../lib/eth'
import type { Nft } from './contracts'

export const NftCard = memo(function NftCard({ nft }: { nft: Nft }) {
  return <article className="nft-card" data-testid="nft-card">
    <Link to="/nfts/$nftId" params={{ nftId: nft.id }} title={'Ver detalhes de ' + nft.name} className="nft-card-link"><span className="sr-only">Ver detalhes de </span>
      <div className="nft-card-art"><Artwork nft={nft} decorative />{nft.badge && <span className="mobile-card-badge">{nft.badge}</span>}<span className="nft-card-arrow"><ArrowUpRight size={20} aria-hidden="true" /></span></div>
      <div className="nft-card-copy"><h3>{nft.name}</h3><p className="nft-price"><span data-testid="nft-price">{formatEth(nft.price)} ETH</span>{nft.previousPrice && <del>{formatEth(nft.previousPrice)} ETH</del>}</p><p className="nft-meta">{nft.network}<span aria-hidden="true"> · </span>{nft.available ? nft.available + ' disponíveis' : 'Esgotado'}</p></div>
    </Link>
    <FavoriteButton nft={nft} className="nft-card-favorite" />
  </article>
})
