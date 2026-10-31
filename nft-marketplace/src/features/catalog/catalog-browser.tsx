import { useState, type SubmitEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Sheet } from '../../components/ui/sheet'
import { isAxiosError } from 'axios'
import { catalogOptions } from './api'
import { categories, type CatalogParams, type CatalogSearch, type Sort } from './contracts'
import { Filters } from './filters'
import { CatalogSkeleton, Spotlight } from './curation'
import { NftCard } from './nft-card'
import { useMobile } from '../../lib/use-mobile'
import { MobileIcon } from '../../components/mobile-icon'

function SearchForm({ value, onSubmit, compact }: { value: string; onSubmit: (value: string) => void; compact: boolean }) {
  const [draft, setDraft] = useState(value)
  function submit(event: SubmitEvent<HTMLFormElement>) { event.preventDefault(); onSubmit(draft) }
  return <form className="catalog-search" onSubmit={submit} role="search">
    <Search size={18} aria-hidden="true" /><label htmlFor="catalog-search" className="sr-only">Buscar NFTs</label>
    <input id="catalog-search" aria-label="Buscar NFTs" name="q" placeholder={compact ? 'Explorar coleções' : 'Busque um NFT ou artista…'} value={draft} maxLength={80} onChange={event => setDraft(event.target.value)} />
    <button type="submit" className="search-submit" aria-label="Buscar">Buscar</button>
  </form>
}

function ActiveFilters({ params, onChange, onReset }: { params: CatalogParams; onChange: (patch: CatalogSearch) => void; onReset: () => void }) {
  const values = [
    ...params.categories.map(id => ({ label: categories.find(category => category.id === id)!.label, remove: () => onChange({ categories: params.categories.filter(item => item !== id) }) })),
    ...params.networks.map(network => ({ label: network, remove: () => onChange({ networks: params.networks.filter(item => item !== network) }) })),
    ...(params.q ? [{ label: 'Busca: ' + params.q, remove: () => onChange({ q: '' }) }] : []),
    ...(params.minPrice || params.maxPrice ? [{ label: (params.minPrice || '0') + '–' + (params.maxPrice || '∞') + ' ETH', remove: () => onChange({ minPrice: '', maxPrice: '' }) }] : []),
    ...(params.tab !== 'all' ? [{ label: params.tab === 'new' ? 'Novos lançamentos' : 'Em alta', remove: () => onChange({ tab: 'all' }) }] : []),
  ]
  return values.length ? <div className="active-filters" aria-label="Filtros ativos">{values.map(value => <button key={value.label} onClick={value.remove} aria-label={'Remover filtro ' + value.label}>{value.label}<X size={13} aria-hidden="true" /></button>)}<button className="clear-filters" onClick={onReset}>Limpar filtros</button></div> : null
}

interface CatalogBrowserProps {
  showSpotlight?: boolean
  params: CatalogParams
  onChange: (patch: CatalogSearch) => void
  onReset: () => void
}

export function CatalogBrowser({ params, onChange: update, onReset: reset, showSpotlight = true }: CatalogBrowserProps) {
  const mobile = useMobile()
  const catalog = useQuery(catalogOptions(params, mobile ? 'mobile' : 'desktop'))
  const sortControl = <div className="sort-control"><label htmlFor="catalog-sort">Ordenar por:</label><select id="catalog-sort" value={params.sort} onChange={event => update({ sort: event.target.value as Sort })}><option value="recent">Listados recentemente</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option><option value="popular">Mais populares</option></select></div>
  const totalPages = catalog.data?.totalPages ?? 0
  const message = isAxiosError(catalog.error) && catalog.error.response?.status === 422
    ? 'A faixa de preço é inválida. Ajuste os filtros para continuar.'
    : 'Não foi possível carregar os NFTs. Verifique sua conexão e tente novamente.'
  return <>
    <section id="catalogo" className="catalog-section" aria-labelledby="catalog-heading">
      <h2 id="catalog-heading" className="sr-only">Catálogo de NFTs</h2>
      <div className="catalog-sidebar"><Filters params={params} facets={catalog.data?.facets} onChange={update} />{showSpotlight && <Spotlight />}</div>
      <div className="catalog-main">
        <div className="catalog-toolbar">
          <div className="catalog-tabs" role="group" aria-label="Seleção do catálogo">
            {([{ id: 'all', label: 'Todos os NFTs' }, { id: 'new', label: 'Novos lançamentos' }, { id: 'trending', label: 'Em alta' }] as const).map(tab => <button key={tab.id} aria-pressed={params.tab === tab.id} className={params.tab === tab.id ? 'selected' : ''} onClick={() => update({ tab: tab.id })}>{tab.label}</button>)}
          </div>
          {!mobile && sortControl}
        </div>
        <div className="search-row"><SearchForm key={params.q} value={params.q} compact={mobile} onSubmit={q => update({ q })} /><div className="mobile-filter-trigger"><Sheet title="Filtrar NFTs" description="Combine coleções, redes e preços para refinar sua busca." trigger={<Button variant="outline" aria-label="Abrir filtros">{mobile ? <MobileIcon name="filter" /> : <SlidersHorizontal size={18} />}<span>Filtros</span></Button>}>{mobile && sortControl}<Filters params={params} facets={catalog.data?.facets} onChange={update} /></Sheet></div></div>
        <ActiveFilters params={params} onChange={update} onReset={reset} />
        <p className="catalog-status" role="status" aria-live="polite">{catalog.isPending ? 'Carregando NFTs…' : catalog.isError ? 'Catálogo indisponível' : catalog.isFetching ? 'Atualizando catálogo…' : catalog.data.total + (catalog.data.total === 1 ? ' NFT encontrado' : ' NFTs encontrados')}</p>
        <div className="catalog-results" aria-busy={catalog.isPending} aria-label="Resultados do catálogo">
          {catalog.isPending ? <CatalogSkeleton /> : catalog.isError ? <div className="catalog-message" role="alert"><SlidersHorizontal size={30} aria-hidden="true" /><h3>Vamos tentar de novo?</h3><p>{message}</p><Button onClick={() => void catalog.refetch()} disabled={catalog.isFetching}>Tentar novamente</Button></div> : catalog.data.items.length ? <div className="nft-grid">{catalog.data.items.map(nft => <NftCard key={nft.id} nft={nft} />)}</div> : <div className="catalog-message"><Search size={32} aria-hidden="true" /><h3>Nenhum NFT encontrado</h3><p>{params.page > totalPages && totalPages > 0 ? 'Esta página não existe para a seleção atual.' : 'Tente outra busca ou ajuste os filtros para descobrir novas peças.'}</p><Button variant="outline" onClick={reset}>Ver todos os NFTs</Button></div>}
        </div>
        {totalPages > 1 && <nav className="pagination" aria-label="Paginação do catálogo"><button className="page-button" disabled={params.page <= 1} aria-label="Página anterior" onClick={() => update({ page: params.page - 1 })}><ChevronLeft size={16} /></button>{Array.from({ length: totalPages }, (_, index) => index + 1).map(page => <button className="page-button" aria-label={'Página ' + page} aria-current={params.page === page ? 'page' : undefined} key={page} onClick={() => update({ page })}>{page}</button>)}<button className="page-button" disabled={params.page >= totalPages} aria-label="Próxima página" onClick={() => update({ page: params.page + 1 })}><ChevronRight size={16} /></button></nav>}
      </div>
    </section>
  </>
}
