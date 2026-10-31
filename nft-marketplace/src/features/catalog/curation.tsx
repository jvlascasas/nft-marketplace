import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Artwork } from '../../components/artwork'
import { InfoAction } from '../../components/info-action'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { curationOptions } from './api'

export function Spotlight() {
  const curation = useQuery(curationOptions)
  return <aside className="spotlight" aria-label="NFT em destaque">
    <p className="spotlight-heading">NFT EM DESTAQUE</p><h3>OFERTA LIMITADA</h3>
    {curation.isPending ? <Skeleton className="aspect-square w-full" /> : curation.data ? <Link to="/nfts/$nftId" params={{ nftId: curation.data.spotlight.id }} title={'Ver oferta de ' + curation.data.spotlight.name}><Artwork nft={curation.data.spotlight} decorative /><p className="spotlight-name">{curation.data.spotlight.name} <ArrowRight size={16} aria-hidden="true" /></p></Link> : <p className="p-5 text-sm text-muted-foreground">Destaque indisponível no momento.</p>}
  </aside>
}

const journal = [
  { date: '12 de setembro', reading: '6 min', title: 'Como funciona a propriedade de NFTs', text: 'Aprenda a colecionar, negociar e verificar ativos digitais.' },
  { date: '13 de setembro', reading: '2 min', title: '10 artistas digitais para acompanhar', text: 'Conheça criadores que moldam a cultura digital.' },
  { date: '15 de setembro', reading: '3 min', title: 'Raridade, atributos e procedência', text: 'Entenda raridade, procedência, direitos autorais e utilidade.' },
  { date: '15 de setembro', reading: '2 min', title: 'Como proteger sua carteira', text: 'Rotina sem estresse, seus ativos e sua identidade.' },
]

export function Curation() {
  const curation = useQuery(curationOptions)
  return <div className="home-lower">
    <section className="promotion-grid" aria-label="Explore nossas coleções">
      {[
        { title: 'Lançamentos gênesis de edição limitada', lines: ['Lançamentos gênesis', 'de edição limitada'], text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.', index: 0, search: { tab: 'new' as const } },
        { title: 'Arte digital selecionada e muito mais', lines: ['Arte digital selecionada', 'e muito mais'], text: 'Explore novos artistas, coleções verificadas e obras digitais que definem tendências.', index: 2, search: { categories: ['digital-art' as const] } },
      ].map(promo => <article className="promotion-card" key={promo.title}>
        {curation.data ? <Artwork nft={curation.data.highlights[promo.index]} /> : <Skeleton className="promotion-art" />}
        <div className="promotion-copy"><h2>{promo.lines[0]}<br />{promo.lines[1]}</h2><p>{promo.text}</p><Button asChild><Link to="/" search={promo.search} hash="catalogo">Explorar <ArrowRight size={14} aria-hidden="true" /></Link></Button></div>
      </article>)}
    </section>
    <section id="guia" className="minting-journal" aria-labelledby="journal-heading">
      <h2 id="journal-heading">Diário da Cunhagem</h2>
      <p className="journal-description">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
      <div className="journal-grid">
        {journal.map((article, index) => <article className="journal-card" key={article.title}>
          {curation.data ? <Artwork nft={curation.data.collectors[index]} /> : <Skeleton className="journal-art" />}
          <div className="journal-copy"><p className="journal-meta">{article.date}<span aria-hidden="true"> | </span>Leitura de {article.reading}</p><h3>{article.title}</h3><p className="journal-summary">{article.text}</p><InfoAction title={article.title} className="journal-read-more">Ler mais <span aria-hidden="true">→</span></InfoAction></div>
        </article>)}
      </div>
    </section>
  </div>
}

export function CatalogSkeleton() {
  return <div className="nft-grid" data-testid="catalog-skeleton">
    {Array.from({ length: 9 }, (_, index) => <div className="nft-card" key={index}><Skeleton className="aspect-square w-full" /><Skeleton className="mb-2 mt-4 h-4 w-4/5" /><Skeleton className="h-4 w-1/2" /><Skeleton className="mb-2 mt-2 h-3 w-2/3" /></div>)}
  </div>
}
