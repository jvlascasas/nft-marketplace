import { useParams } from '@tanstack/react-router'
import { NftDetailPage } from './nft-detail-page'

export function NftRoutePage() {
  const { nftId } = useParams({ from: '/nfts/$nftId' })
  return <NftDetailPage nftId={nftId} />
}
