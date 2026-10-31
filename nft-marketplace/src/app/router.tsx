import { MarketPage } from '../features/catalog/market-page'
import { NftRoutePage } from '../features/catalog/nft-route-page'
import { createRootRoute, createRoute, createRouter, lazyRouteComponent } from '@tanstack/react-router'
import { CatalogPage } from '../features/catalog/catalog-page'
import { validateCatalogSearch } from '../features/catalog/search'
import { validateAuthSearch } from '../features/auth/contracts'
import { validateFavoritesSearch } from '../features/favorites/search'
import { Layout, NotFound } from './layout'

const root = createRootRoute({ component: Layout, notFoundComponent: NotFound })
const home = createRoute({ getParentRoute: () => root, path: '/', validateSearch: validateCatalogSearch, component: CatalogPage })
const market = createRoute({ getParentRoute: () => root, path: '/mercado', component: MarketPage })
const detail = createRoute({ getParentRoute: () => root, path: '/nfts/$nftId', component: NftRoutePage })
const cart = createRoute({ getParentRoute: () => root, path: '/carrinho', component: lazyRouteComponent(() => import('../features/cart/cart-page'), 'CartPage') })
const checkout = createRoute({ getParentRoute: () => root, path: '/pagamento', component: lazyRouteComponent(() => import('../features/checkout/checkout-page'), 'CheckoutPage') })
const order = createRoute({ getParentRoute: () => root, path: '/pedidos/$orderId', component: lazyRouteComponent(() => import('../features/checkout/order-page'), 'OrderPage') })
const login = createRoute({ getParentRoute: () => root, path: '/login', validateSearch: validateAuthSearch, component: lazyRouteComponent(() => import('../features/auth/auth-page'), 'LoginPage') })
const register = createRoute({ getParentRoute: () => root, path: '/cadastro', validateSearch: validateAuthSearch, component: lazyRouteComponent(() => import('../features/auth/auth-page'), 'RegisterPage') })
const profile = createRoute({ getParentRoute: () => root, path: '/perfil', validateSearch: validateAuthSearch, component: lazyRouteComponent(() => import('../features/account/profile-page'), 'ProfilePage') })
const wallets = createRoute({ getParentRoute: () => root, path: '/carteiras', validateSearch: validateAuthSearch, component: lazyRouteComponent(() => import('../features/account/wallets-page'), 'WalletsPage') })

const favorites = createRoute({ getParentRoute: () => root, path: '/lista-de-interesse', validateSearch: validateFavoritesSearch, component: lazyRouteComponent(() => import('../features/favorites/favorites-page'), 'FavoritesPage') })

export const router = createRouter({ routeTree: root.addChildren([home, market, detail, cart, checkout, order, login, register, profile, wallets, favorites]), defaultPreload: 'intent', scrollRestoration: true })

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}
