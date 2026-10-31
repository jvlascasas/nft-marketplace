import { useState } from 'react'
import type { Nft } from './contracts'
import { NftCard } from './nft-card'

export function RelatedCollection({ pages, title = 'Mais desta coleção' }: { pages: Nft[][]; title?: string }) {
  const [page, setPage] = useState(Math.min(1, pages.length - 1))
  return <section className="related-collection" aria-labelledby="related-heading"><h2 id="related-heading">{title}</h2><div className="related-nfts">{pages[page].map(item => <NftCard key={item.id} nft={item} />)}</div><div className="collection-pagination" role="group" aria-label="Páginas desta coleção">{pages.map((_, index) => <button key={index} aria-label={'Coleção, página ' + (index + 1)} aria-pressed={index === page} onClick={() => setPage(index)}><span /></button>)}</div></section>
}
