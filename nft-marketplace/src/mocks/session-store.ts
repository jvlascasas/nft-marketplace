import type { Session, Wallet, WalletConnection } from '../features/checkout/contracts'
import { CartError, CART_STORAGE_KEY, readCart, saveCart } from './cart-store'
import { getScenario } from './scenarios'
import { demoUsers, migrateIdentity } from './demo-identities'
import { currentAccountUser } from './account-store'
import { readWallets } from './wallet-store'
export { demoUsers } from './demo-identities'

const SESSION_KEY = 'kurio:mock-session:v1'
export function currentSession(): Session {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as Session | null
    if (session?.user && session.expiresAt && Date.parse(session.expiresAt) > Date.now() && getScenario() !== 'session-expired') {
      const user = currentAccountUser(session.user.id) ?? migrateIdentity(session.user)
      if (user.name !== session.user.name || user.email !== session.user.email) localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, user }))
      return { ...session, user }
    }
  } catch { /* An invalid local session is anonymous. */ }
  return { user: null, expiresAt: null }
}
export function requireUser() {
  const user = currentSession().user
  if (!user) throw new CartError('UNAUTHORIZED', 'Sua sessão expirou. Entre novamente para continuar.', 401)
  return user
}
export function signInDemo(account: unknown): Session {
  if (getScenario() === 'session-expired') throw new CartError('UNAUTHORIZED', 'Restaure o cenário padrão para iniciar uma nova sessão.', 401)
  const user = demoUsers.find(user => user.id === account)
  if (!user) throw new CartError('VALIDATION', 'Selecione uma conta de demonstração.')
  return beginSession(user)
}
export function beginSession(user: NonNullable<Session['user']>): Session {
  const visitor = currentSession().user ? null : readCart()
  const session = { user, expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  sessionStorage.removeItem(connectionKey(user.id))
  if (visitor?.items.length) {
    const userCart = readCart()
    for (const line of visitor.items) {
      const existing = userCart.items.find(item => item.nftId === line.nftId && item.editionId === line.editionId)
      if (existing) existing.quantity = Math.max(existing.quantity, line.quantity)
      else userCart.items.push(line)
    }
    userCart.coupon = visitor.coupon ?? userCart.coupon
    userCart.version++
    saveCart(userCart)
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ schema: 1, version: visitor.version + 1, items: [], coupon: null }))
  }
  return currentSession()
}
export function signOut() {
  if (currentSession().user) saveConnection(null)
  localStorage.removeItem(SESSION_KEY)
  return { user: null, expiresAt: null }
}
export function walletsFor(userId: string): Wallet[] {
  const user = currentAccountUser(userId) ?? demoUsers.find(user => user.id === userId) ?? requireUser()
  return readWallets(user).items
}
const connectionKey = (userId: string) => 'kurio:mock-wallet-connection:' + userId
export function readConnection(): WalletConnection | null {
  const user = requireUser()
  return JSON.parse(sessionStorage.getItem(connectionKey(user.id)) ?? 'null') as WalletConnection | null
}
export function saveConnection(connection: WalletConnection | null) {
  const user = requireUser()
  if (connection) sessionStorage.setItem(connectionKey(user.id), JSON.stringify(connection))
  else sessionStorage.removeItem(connectionKey(user.id))
}
