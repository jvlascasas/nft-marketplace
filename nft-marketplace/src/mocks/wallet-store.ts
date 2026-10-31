import type { ManagedWallet, WalletSettings } from '../features/account/contracts'
import { validateWallet } from '../features/account/contracts'
import { demoUsers } from './demo-identities'
import { SettingsError } from './errors'
export { SettingsError } from './errors'
const key = (userId: string) => 'kurio:mock-wallets:' + userId
export function readWallets(user: { id: string; name: string; email: string }): WalletSettings {
  const raw = localStorage.getItem(key(user.id))
  if (raw) return JSON.parse(raw) as WalletSettings
  const fixture = demoUsers.find(item => item.id === user.id)
  const primary = user.id.replace(/[^0-9a-f]/g, '').padEnd(40, '0').slice(0, 40)
  const wallet: ManagedWallet = {
    id: 'primary', label: 'Carteira principal', displayName: user.name, nickname: 'Principal',
    profileName: fixture?.username ?? user.name, email: user.email, referralCode: '', secondaryAddress: '',
    address: '0x' + (fixture ? (fixture.id === 'collector-sam' ? 'b2' : 'a1').repeat(20) : primary),
    ensName: fixture?.ensName ?? user.id.slice(-8) + '.kurio.eth', provider: 'Coinbase Wallet', network: 'Ethereum',
    networks: ['Ethereum', 'Polygon'], sameAsPrimary: false,
  }
  const state = { version: 1, items: [wallet] }
  localStorage.setItem(key(user.id), JSON.stringify(state))
  return state
}
export function updateWallet(user: { id: string; name: string; email: string }, input: { version: number; wallet: ManagedWallet }, create: boolean) {
  const state = readWallets(user)
  if (state.version !== input.version) throw new SettingsError('WALLET_CONFLICT', 'As carteiras mudaram em outra aba. Recarregue os dados antes de salvar.', 409)
  const wallet = input.wallet
  if (!['primary', 'secondary'].includes(wallet.id)) throw new SettingsError('VALIDATION', 'Selecione carteira principal ou secundária.')
  const previous = state.items.find(item => item.id === wallet.id)
  if (create && previous) throw new SettingsError('WALLET_CONFLICT', 'Esta carteira já existe. Recarregue e use a edição.', 409)
  if (!create && !previous) throw new SettingsError('NOT_FOUND', 'Carteira não encontrada.', 404)
  const primary = state.items.find(item => item.id === 'primary')
  const candidate = wallet.id === 'secondary' && wallet.sameAsPrimary && primary ? { ...primary, id: 'secondary', label: 'Carteira secundária', sameAsPrimary: true } : { ...wallet, label: wallet.id === 'primary' ? 'Carteira principal' : 'Carteira secundária', networks: [wallet.network] }
  const fields = validateWallet(candidate)
  if (Object.keys(fields).length) throw new SettingsError('VALIDATION', 'Revise os campos da carteira.', 422, fields)
  if (wallet.id === 'secondary' && !wallet.sameAsPrimary && primary?.address.toLowerCase() === candidate.address.toLowerCase()) throw new SettingsError('DUPLICATE_WALLET', 'Ative Igual à carteira principal para usar o mesmo endereço.', 422, { address: 'Este endereço já pertence à carteira principal.' })
  state.items = [...state.items.filter(item => item.id !== wallet.id), candidate].sort((a, b) => a.id.localeCompare(b.id))
  if (wallet.id === 'primary') state.items = state.items.map(item => item.id === 'secondary' && item.sameAsPrimary ? { ...candidate, id: 'secondary', label: 'Carteira secundária', sameAsPrimary: true } : item)
  state.version++
  localStorage.setItem(key(user.id), JSON.stringify(state))
  return state
}

export function syncPrimaryNickname(user: { id: string; name: string; email: string }, nickname: string) {
  const state = readWallets(user)
  const primary = state.items.find(wallet => wallet.id === 'primary')
  if (!primary || primary.nickname === nickname) return
  state.items = state.items.map(wallet => wallet.id === 'primary' || wallet.sameAsPrimary ? { ...wallet, nickname } : wallet)
  state.version++
  localStorage.setItem(key(user.id), JSON.stringify(state))
}
