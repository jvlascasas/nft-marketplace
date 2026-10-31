import type { ManagedWallet, Profile } from '../account/contracts'
import type { Collector, PaymentNetwork, WalletProvider } from './contracts'

interface DraftValues { collector: Collector; walletId: string; network: PaymentNetwork | ''; provider: WalletProvider }
export interface Draft extends DraftValues { autofill: DraftValues }
export function draftKey(userId: string) { return 'kurio:checkout-draft:' + userId }

export function initialDraft(profile: Profile, wallets: ManagedWallet[]): Draft {
  let saved: Partial<Draft> | null = null
  try { saved = JSON.parse(sessionStorage.getItem(draftKey(profile.userId)) ?? 'null') as Partial<Draft> | null } catch { /* Use the account data when the draft cannot be read. */ }
  const wallet = wallets.find(item => item.id === saved?.walletId) ?? wallets.find(item => item.id === 'primary')
  const defaults: DraftValues = {
    collector: {
      displayName: profile.displayName, username: profile.username, email: profile.email,
      profileName: wallet?.profileName ?? profile.displayName,
      walletAddress: wallet?.address ?? '', ensName: profile.ensName,
      secondaryAddress: wallet?.secondaryAddress ?? '', referralCode: wallet?.referralCode ?? '', note: '',
    },
    walletId: wallet?.id ?? '', network: wallet?.network ?? wallet?.networks[0] ?? '',
    provider: wallet?.provider ?? 'Coinbase Wallet',
  }
  // Refresh untouched account values, retaining manual edits (including cleared fields).
  // Older drafts have no baseline: keep their nonempty values and fill their blanks.
  function restore<T extends string>(value: T | undefined, previous: T | undefined, fallback: T): T {
    if (typeof value !== 'string') return fallback
    return saved?.autofill ? value === previous ? fallback : value : value || fallback
  }
  const collector = { ...defaults.collector }
  for (const name of Object.keys(collector) as (keyof Collector)[]) {
    collector[name] = restore(saved?.collector?.[name], saved?.autofill?.collector?.[name], collector[name])
  }
  return {
    collector, autofill: defaults,
    walletId: restore(saved?.walletId, saved?.autofill?.walletId, defaults.walletId),
    network: restore(saved?.network, saved?.autofill?.network, defaults.network),
    provider: restore(saved?.provider, saved?.autofill?.provider, defaults.provider),
  }
}
