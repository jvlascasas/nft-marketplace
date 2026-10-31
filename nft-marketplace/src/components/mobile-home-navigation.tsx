import { Link, useRouterState } from '@tanstack/react-router'
import { MobileIcon } from './mobile-icon'
import { SessionControl } from '../features/checkout/session-control'
import { CartBadge } from './cart-badge'

export function MobileHomeNavigation() {
  const favoritesActive = useRouterState({ select: state => state.location.pathname === '/lista-de-interesse' })
  return <nav className="mobile-home-navigation" aria-label="Navegação mobile">
    <Link to="/" search={{}} aria-label="Início" aria-current={favoritesActive ? undefined : 'page'} className={favoritesActive ? undefined : 'mobile-home-active'}><MobileIcon name="home" /></Link>
    <Link to="/lista-de-interesse" search={{}} className="mobile-nav-favorites" aria-current={favoritesActive ? 'page' : undefined}><MobileIcon name="heart" /><span className="sr-only">Lista de interesse</span></Link>
    <Link to="/mercado" aria-label="Mercado" className="mobile-market-link"><MobileIcon name="explore" /></Link>
    <Link to="/carrinho" className="cart-link"><span className="sr-only">Carrinho </span><MobileIcon name="shop" /><CartBadge /></Link>
    <SessionControl compact />
  </nav>
}
