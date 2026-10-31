import { useNavigate, useSearch } from '@tanstack/react-router'
import { CatalogBrowser } from './catalog-browser'
import { catalogParams, validateCatalogSearch } from './search'
import type { CatalogSearch } from './contracts'
import { Hero } from './hero'
import { Curation } from './curation'
import { MobileHomeNavigation } from '../../components/mobile-home-navigation'

export function CatalogPage() {
  const search = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  function update(patch: CatalogSearch) {
    void navigate({ to: '/', search: previous => validateCatalogSearch({ ...previous, ...patch, page: patch.page ?? 1 }), hash: 'catalogo', resetScroll: false })
  }
  function reset() { void navigate({ to: '/', search: {}, hash: 'catalogo', resetScroll: false }) }
  return <div className="home-page"><Hero /><CatalogBrowser params={catalogParams(search)} onChange={update} onReset={reset} /><Curation /><MobileHomeNavigation /></div>
}
