import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import { isAxiosError } from 'axios'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../components/ui/button'
import { AccountAccess, AccountGate, AccountLoading, AccountShell } from './account-shell'
import { profileOptions, useSaveWallet, walletSettingsOptions } from './api'
import { AccountField } from './form-field'
import { focusAccountError } from './form-utils'
import { useAccountExpiry } from './use-account-expiry'
import { validateWallet, type FieldErrors, type ManagedWallet, type Profile, type WalletSettings } from './contracts'
import { apiMessage, isUnauthorized } from '../checkout/api'
import type { ApiError } from '../catalog/contracts'
import type { PaymentNetwork, WalletProvider } from '../checkout/contracts'

type Draft = Omit<ManagedWallet, 'network' | 'provider'> & { network: string; provider: string }
function walletFingerprint(wallet?: ManagedWallet) {
  return JSON.stringify(wallet ? [wallet.id, wallet.displayName, wallet.nickname, wallet.profileName, wallet.email,
    wallet.referralCode, wallet.secondaryAddress, wallet.address, wallet.ensName, wallet.provider, wallet.network,
    [...wallet.networks].sort(), wallet.sameAsPrimary] : null)
}
function blankWallet(id: string, profile: Profile): Draft {
  return { id, label: id === 'primary' ? 'Carteira principal' : 'Carteira secundária', address: '', ensName: profile.ensName,
    networks: [], displayName: profile.displayName, nickname: '', profileName: profile.username, email: profile.email,
    referralCode: '', secondaryAddress: '', network: '', provider: '', sameAsPrimary: false }
}
function WalletForm({ userId, id, settings, initial, profile, copyPrimary = false, onSaved, reload }: {
  userId: string; id: 'primary' | 'secondary'; settings: WalletSettings; initial?: ManagedWallet; profile: Profile
  copyPrimary?: boolean; onSaved?: (wallet: ManagedWallet) => void; reload: () => Promise<WalletSettings | undefined>
}) {
  const [draft, setDraft] = useState<Draft>(() => initial ? { ...initial } : blankWallet(id, profile))
  const [version, setVersion] = useState(settings.version)
  const [baseline, setBaseline] = useState(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [notice, setNotice] = useState('')
  const saving = useRef(false)
  const mutation = useSaveWallet(userId)
  const primary = settings.items.find(item => item.id === 'primary')
  const unchanged = walletFingerprint(baseline) === walletFingerprint(settings.items.find(item => item.id === id))
  const expectedVersion = unchanged ? settings.version : version
  const effective = copyPrimary && primary ? { ...primary, id, label: 'Carteira secundária', sameAsPrimary: true } : { ...draft, sameAsPrimary: false }
  useEffect(() => { if (mutation.isError && !mutation.isPending) focusAccountError('wallet-' + id + '-', errors) }, [mutation.isError, mutation.isPending, errors, id])
  function field(name: keyof Draft, value: string) { setDraft(current => ({ ...current, [name]: value })); setErrors(current => ({ ...current, [name]: '' })); setNotice(''); mutation.reset() }
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving.current) return
    const wallet: ManagedWallet = { ...effective, network: effective.network as PaymentNetwork, provider: effective.provider as WalletProvider }
    const fields = validateWallet(wallet)
    setErrors(fields)
    if (Object.keys(fields).length) { focusAccountError('wallet-' + id + '-', fields); return }
    saving.current = true
    mutation.mutate({ input: { version: expectedVersion, wallet }, create: !settings.items.some(item => item.id === id) }, {
      onSuccess: response => { saving.current = false; const saved = response.items.find(item => item.id === id)!; setDraft(saved); setBaseline(saved); setVersion(response.version); setErrors({}); setNotice('Carteira salva. Ela já está disponível no pagamento.'); onSaved?.(saved) },
      onError: error => { saving.current = false; if (isAxiosError<ApiError>(error)) setErrors(error.response?.data.fields ?? {}); setNotice('') },
    })
  }
  async function refresh() {
    const fresh = await reload()
    if (!fresh) return
    setDraft(fresh.items.find(item => item.id === id) ?? blankWallet(id, profile))
    setBaseline(fresh.items.find(item => item.id === id))
    setVersion(fresh.version); setErrors({}); setNotice('Dados atualizados.'); mutation.reset()
  }
  const textField = (name: 'displayName' | 'nickname' | 'profileName' | 'email' | 'referralCode' | 'secondaryAddress' | 'address' | 'ensName', label: string, required = true, placeholder?: string) => <AccountField id={'wallet-' + id + '-' + name} name={name} label={label} value={effective[name]} onChange={value => field(name, value)} error={errors[name]} required={required} placeholder={placeholder} maxLength={name === 'email' ? 254 : name === 'address' ? 42 : name === 'ensName' ? 64 : name === 'nickname' ? 50 : name === 'referralCode' ? 40 : 80} type={name === 'email' ? 'email' : 'text'} />
  return <form className="wallet-form" onSubmit={submit} noValidate aria-label={id === 'primary' ? 'Editar carteira principal' : 'Editar carteira secundária'}>
    {settings.version !== expectedVersion && <div className="account-change-notice" role="status"><p>As carteiras foram atualizadas. Recarregue os dados antes de salvar.</p><button type="button" disabled={mutation.isPending} onClick={() => void refresh()}>Recarregar carteiras</button></div>}
    <fieldset disabled={mutation.isPending}><legend className="sr-only">Dados da carteira</legend><fieldset className="wallet-inputs" disabled={copyPrimary}><legend className="sr-only">Campos da carteira</legend><div className="account-fields">
      {textField('displayName', 'Nome de exibição')}
      {textField('nickname', 'Apelido da carteira')}
      <div className="account-field"><label htmlFor={'wallet-' + id + '-network'}>Rede<span aria-hidden="true">*</span></label><select id={'wallet-' + id + '-network'} name="network" value={effective.network} onChange={event => field('network', event.target.value)} required aria-invalid={!!errors.network} aria-describedby={errors.network ? 'wallet-' + id + '-network-error' : undefined}><option value="">Selecione uma rede</option><option>Ethereum</option><option>Polygon</option></select>{errors.network && <p className="account-field-error" id={'wallet-' + id + '-network-error'}>{errors.network}</p>}</div>
      {textField('profileName', 'Nome do perfil')}
      {textField('address', 'Endereço da carteira', true, 'Endereço 0x da carteira')}
      {textField('secondaryAddress', 'ENS ou carteira secundária (opcional)', false, 'ENS ou carteira secundária (opcional)')}
      <div className="account-field"><label htmlFor={'wallet-' + id + '-provider'}>Tipo de carteira<span aria-hidden="true">*</span></label><select id={'wallet-' + id + '-provider'} name="provider" value={effective.provider} onChange={event => field('provider', event.target.value)} required aria-invalid={!!errors.provider} aria-describedby={errors.provider ? 'wallet-' + id + '-provider-error' : undefined}><option value="">Selecione uma carteira</option><option>WalletConnect</option><option>MetaMask</option><option>Coinbase Wallet</option></select>{errors.provider && <p className="account-field-error" id={'wallet-' + id + '-provider-error'}>{errors.provider}</p>}</div>
      {textField('referralCode', 'Código de indicação', false)}
      {textField('email', 'E-mail')}
      {textField('ensName', 'Nome ENS', true, '.eth')}
    </div></fieldset><button className="account-action wallet-save" type="submit">{mutation.isPending ? 'Salvando…' : 'Salvar carteira'}</button></fieldset>
    {mutation.error && <p className="account-error" role="alert">{apiMessage(mutation.error)}</p>}
    {Object.values(errors).some(Boolean) && <span className="sr-only" role="alert">Revise os campos indicados.</span>}
    <p className="account-status" role="status" aria-live="polite">{notice}</p>
  </form>
}
function WalletsContent({ userId }: { userId: string }) {
  const settings = useQuery(walletSettingsOptions(userId))
  const profile = useQuery(profileOptions(userId))
  const [adding, setAdding] = useState(false)
  const [same, setSame] = useState<boolean | null>(null)
  useAccountExpiry(settings.error || profile.error)
  if (isUnauthorized(settings.error) || isUnauthorized(profile.error)) return <AccountAccess />
  if (settings.isPending || profile.isPending) return <AccountLoading />
  if ((settings.isError && !settings.data) || (profile.isError && !profile.data)) return <AccountShell section="wallets"><div className="account-error-state" role="alert"><h1>Não foi possível carregar as carteiras</h1><p>{apiMessage(settings.error || profile.error)}</p><Button onClick={() => { void settings.refetch(); void profile.refetch() }}>Tentar novamente</Button></div></AccountShell>
  const data = settings.data!
  const primary = data.items.find(item => item.id === 'primary')
  const secondary = data.items.find(item => item.id === 'secondary')
  const copy = same ?? secondary?.sameAsPrimary ?? false
  const reload = async () => (await settings.refetch()).data
  return <AccountShell section="wallets"><section className="wallet-primary"><header className="wallet-section-heading"><div><h1>Carteira principal</h1><p>Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p></div><button type="button" className="account-text-action" onClick={() => document.getElementById('wallet-primary-address')?.focus()}>Adicionar</button></header><WalletForm userId={userId} id="primary" settings={data} initial={primary} profile={profile.data!.profile} reload={reload} /></section>
    <section className="wallet-secondary"><header className="wallet-section-heading"><h2>Carteira secundária</h2><div className="wallet-secondary-actions"><label><input type="checkbox" checked={copy} disabled={!primary} onChange={event => { setSame(event.target.checked); setAdding(true) }} />Igual à carteira principal</label><button type="button" className="account-text-action" onClick={() => { if (adding) setSame(secondary?.sameAsPrimary ?? false); setAdding(value => !value) }}>{adding ? 'Cancelar' : secondary ? 'Editar' : 'Adicionar'}</button></div></header>
      {!adding ? secondary ? <div className="wallet-saved-summary"><strong>{secondary.nickname} · {secondary.provider} · {secondary.network}</strong><p>{secondary.address}</p><p>{secondary.ensName}</p></div> : <p className="wallet-empty">Você ainda não adicionou uma carteira secundária.</p> : <WalletForm userId={userId} id="secondary" settings={data} initial={secondary} profile={profile.data!.profile} copyPrimary={copy} onSaved={wallet => { setSame(wallet.sameAsPrimary); setAdding(false) }} reload={reload} />}
    </section>
  </AccountShell>
}
export function WalletsPage() { return <AccountGate>{userId => <WalletsContent key={userId} userId={userId} />}</AccountGate> }
