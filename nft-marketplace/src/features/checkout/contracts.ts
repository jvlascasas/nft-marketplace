import type { CartItem, CartQuote } from '../cart/contracts'

export interface Collector {
  displayName: string; username: string; profileName: string; email: string
  walletAddress: string; secondaryAddress: string; referralCode: string; ensName: string; note: string
}
export type PaymentNetwork = 'Ethereum' | 'Polygon'
export type WalletProvider = 'WalletConnect' | 'MetaMask' | 'Coinbase Wallet'
export interface Wallet {
  id: string; label: string; address: string; ensName: string; networks: PaymentNetwork[]
  provider?: WalletProvider; network?: PaymentNetwork
}
export interface Session {
  user: { id: string; name: string; email: string } | null; expiresAt: string | null
}
export interface WalletConnection { id: string; walletId: string; network: PaymentNetwork; provider: WalletProvider }
export interface CheckoutInput {
  collector: Collector; walletId: string; network: PaymentNetwork; provider: WalletProvider
  connectionId: string; cartVersion: number; total: string; quoteRevision: string
}
export interface Order {
  id: string; userId: string; version: number; status: 'pending' | 'confirmed' | 'declined'
  createdAt: string; transactionId: string; network: PaymentNetwork; provider: WalletProvider
  wallet: Wallet; collector: Collector; items: CartItem[]; quote: CartQuote; declineReason: string | null
}
export interface OrderEvent { eventId: string; orderId: string; userId: string; version: number }
export interface NftEvent { eventId: string; nftId: string; version: number }
export type CollectorErrors = Partial<Record<keyof Collector | 'walletId' | 'network', string>>
export function validateCollector(collector: Collector, walletId: string, network: string): CollectorErrors {
  const errors: CollectorErrors = {}
  if (collector.displayName.trim().length < 2) errors.displayName = 'Informe seu nome de exibição.'
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(collector.username)) errors.username = 'Use de 3 a 30 letras, números, pontos ou traços.'
  if (collector.profileName.trim().length < 2) errors.profileName = 'Informe o nome do perfil.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(collector.email)) errors.email = 'Informe um e-mail válido.'
  if (!/^0x[0-9a-fA-F]{40}$/.test(collector.walletAddress)) errors.walletAddress = 'Informe um endereço EVM válido (0x e 40 caracteres).'
  if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]{1,60}\.eth$/.test(collector.ensName)) errors.ensName = 'Informe um nome ENS válido, terminado em .eth.'
  if (collector.secondaryAddress && !/^0x[0-9a-fA-F]{40}$/.test(collector.secondaryAddress) && !/^[a-zA-Z0-9][a-zA-Z0-9.-]{1,60}\.eth$/.test(collector.secondaryAddress)) errors.secondaryAddress = 'Use um endereço EVM ou um nome .eth.'
  if (collector.referralCode.length > 40) errors.referralCode = 'Use no máximo 40 caracteres.'
  if (collector.note.length > 500) errors.note = 'Use no máximo 500 caracteres.'
  if (!walletId) errors.walletId = 'Selecione uma carteira cadastrada.'
  if (!network) errors.network = 'Selecione uma rede.'
  return errors
}
