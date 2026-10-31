import { CartBadge } from '../components/cart-badge'
import { SiteFooter } from '../components/site-footer'
import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { Menu, Search, ShoppingCart } from 'lucide-react'
import { SessionControl } from '../features/checkout/session-control'
import { Button } from '../components/ui/button'
import { Sheet, SheetClose } from '../components/ui/sheet'

function CreatorsInfo() {
  return <Sheet title="Criadores" description="Informações sobre esta demonstração." trigger={<button className="nav-item">Criadores</button>}><p className="mt-8 leading-relaxed text-muted-foreground">O diretório de criadores está fora do escopo deste desafio. Você pode explorar os artistas de cada peça pela busca do catálogo.</p><Button asChild className="mt-6"><SheetClose><Link to="/" hash="catalogo">Explorar NFTs</Link></SheetClose></Button></Sheet>
}

export function Layout() {
  const mobileCatalogRoute = useRouterState({ select: state => state.location.pathname === '/' || state.location.pathname === '/mercado' || state.location.pathname === '/lista-de-interesse' || state.location.pathname.startsWith('/nfts/') })
  const accountActive = useRouterState({ select: state => state.location.pathname === '/perfil' || state.location.pathname === '/carteiras' || state.location.pathname === '/lista-de-interesse' })
  const authActive = useRouterState({ select: state => state.location.pathname === '/login' || state.location.pathname === '/cadastro' })
  const orderActive = useRouterState({ select: state => state.location.pathname.startsWith('/pedidos/') })
  const cartActive = useRouterState({ select: state => state.location.pathname === '/carrinho' })
  const checkoutActive = useRouterState({ select: state => state.location.pathname === '/pagamento' })
  const mobileFlowRoute = cartActive || checkoutActive || authActive
  const marketActive = useRouterState({ select: state => state.location.pathname === '/mercado' || state.location.pathname === '/carrinho' || state.location.pathname === '/pagamento' || state.location.pathname.startsWith('/nfts/') })
  if (orderActive) return <><a href="#main" className="skip-link">Pular para o conteúdo</a><main id="main" tabIndex={-1}><Outlet /></main></>
  return <>
    <a href="#main" className="skip-link">Pular para o conteúdo</a>
    <header className={'site-header page-width' + (cartActive ? ' cart-route-header' : '') + (mobileCatalogRoute || mobileFlowRoute ? ' mobile-catalog-hidden' : '')}>
      <Link to="/" search={{}} aria-label="Kurio, página inicial" className="brand">KURIO</Link>
      <nav aria-label="Navegação principal" className="desktop-navigation">
        <Link to="/" search={{}} className={authActive ? 'active' : undefined} activeOptions={{ exact: true, includeSearch: false, includeHash: true }} activeProps={{ className: 'active', 'aria-current': 'page' }}>Início</Link>
        <Link to="/mercado" className={marketActive ? 'active' : undefined} aria-current={marketActive ? 'page' : undefined} activeOptions={{ exact: true, includeSearch: false }} activeProps={{ className: 'active', 'aria-current': 'page' }}>Mercado</Link>
        <CreatorsInfo />
        <Link to="/" hash="guia" activeOptions={{ includeHash: true }}>Aprenda</Link>
      </nav>
      <div className="header-actions">
        <Link className="icon-button header-search" to="/" hash="catalogo" aria-label="Ir para a busca"><Search size={22} strokeWidth={1.5} /></Link>
        <Link className="icon-button cart-link" to="/carrinho"><span className="sr-only">Carrinho </span><ShoppingCart size={22} strokeWidth={1.5} /><CartBadge /></Link>
        <SessionControl />
        <div className="mobile-navigation"><Sheet title="Menu" description="Navegue pelo marketplace Kurio." trigger={<button className="icon-button" aria-label="Abrir menu"><Menu size={22} /></button>}><nav className="mobile-nav-links" aria-label="Navegação mobile"><SheetClose><Link to="/" search={{}}>Início</Link></SheetClose><SheetClose><Link to="/mercado" className={marketActive ? 'active' : undefined} aria-current={marketActive ? 'page' : undefined} activeOptions={{ includeSearch: false }} activeProps={{ 'aria-current': 'page' }}>Mercado</Link></SheetClose><SheetClose><Link to="/" hash="guia">Aprenda</Link></SheetClose><SheetClose><Link to="/login">Entrar</Link></SheetClose><SheetClose><Link to="/carrinho">Carrinho</Link></SheetClose></nav></Sheet></div>
      </div>
    </header>
    <main id="main" tabIndex={-1} className={'page-width' + (mobileCatalogRoute ? ' mobile-catalog-main' : '') + (mobileFlowRoute ? ' mobile-flow-main' : '')}><Outlet /></main>
    {!authActive && !accountActive && <SiteFooter compactOnMobile={cartActive} hideOnMobile={mobileCatalogRoute || checkoutActive} />}
  </>
}

export function NotFound() {
  return <section className="stage-page"><p className="eyebrow">404</p><h1>Página não encontrada</h1><p>Confira o endereço ou volte ao início.</p><Button asChild><Link to="/" search={{}}>Voltar ao início</Link></Button></section>
}

export function StagePage({ title }: { title: string }) {
  return <section className="stage-page"><p className="eyebrow">Em desenvolvimento</p><h1>{title}</h1><p>Esta funcionalidade será implementada nas próximas etapas.</p><Button asChild variant="outline"><Link to="/" search={{}}>Voltar ao início</Link></Button></section>
}
