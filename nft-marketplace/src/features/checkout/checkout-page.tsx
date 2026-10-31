import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import { isAxiosError } from 'axios'
import { Link, useNavigate } from '@tanstack/react-router'
import { useIsMutating, useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { Check, ChevronLeft, LoaderCircle, MoreVertical, WalletCards, X } from 'lucide-react'
import { useMobile } from '../../lib/use-mobile'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { http } from '../../lib/http'
import { formatEth } from '../../lib/eth'
import { cartKey, cartOptions, useRevalidateQuote } from '../cart/api'
import { CouponForm } from '../cart/cart-page'
import { CheckoutAccess } from './demo-access'
import { apiMessage, connectionOptions, isUnauthorized, orderOptions, readAttempt, saveAttempt, sessionKey, sessionOptions, useCreateOrder, type Attempt } from './api'
import { profileOptions, walletSettingsOptions } from '../account/api'
import type { Profile, WalletSettings } from '../account/contracts'
import { draftKey, initialDraft, type Draft } from './checkout-draft'
import { validateCollector, type Collector, type CollectorErrors, type Order, type PaymentNetwork, type Session, type WalletConnection } from './contracts'
import { PaymentItems, PaymentTotals } from './payment-items'
import { useCheckoutRealtime } from './realtime'

export function CheckoutSkeleton() {
  return <div className="checkout-loading" aria-busy="true"><Skeleton className="mb-8 h-5 w-60" /><div className="checkout-grid"><div><Skeleton className="mb-5 h-6 w-60" /><div className="collector-fields">{Array.from({ length: 10 }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div></div><Skeleton className="h-[580px] w-full" /></div><span className="sr-only" role="status">Carregando pagamento…</span></div>
}
function FormField({ name, label, value, error, required = false, onChange, type = 'text', placeholder = '', maxLength = 100 }: { name: keyof Collector; label: string; value: string; error?: string; required?: boolean; onChange: (name: keyof Collector, value: string) => void; type?: string; placeholder?: string; maxLength?: number }) {
  return <div className="collector-field"><label htmlFor={'collector-' + name}>{label}{required && <span aria-hidden="true">*</span>}</label><input id={'collector-' + name} name={name} type={type} value={value} onChange={event => onChange(name, event.target.value)} placeholder={placeholder} maxLength={maxLength} required={required} aria-invalid={!!error} aria-describedby={error ? 'error-' + name : undefined} autoComplete={name === 'email' ? 'email' : name === 'displayName' ? 'name' : 'off'} />{error && <p id={'error-' + name} role="alert">{error}</p>}</div>
}

function CheckoutForm({ userId, profile, wallets }: { userId: string; profile: Profile; wallets: UseQueryResult<WalletSettings> }) {
  const mobile = useMobile()
  const client = useQueryClient()
  const navigate = useNavigate()
  const cart = useQuery(cartOptions)
  const connection = useQuery(connectionOptions(userId))
  const revalidate = useRevalidateQuote()
  const create = useCreateOrder()
  const cartBusy = useIsMutating({ mutationKey: ['cart', 'mutation'] }) > 0
  const [draft, setDraft] = useState(() => initialDraft(profile, wallets.data?.items ?? []))
  const [errors, setErrors] = useState<CollectorErrors>({})
  const [notice, setNotice] = useState('')
  const [walletOpen, setWalletOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [showCoupon, setShowCoupon] = useState(false)
  const [collectorOpen, setCollectorOpen] = useState(false)
  const [attempt, setAttempt] = useState(() => readAttempt(userId))
  const [recovering, setRecovering] = useState(() => !!readAttempt(userId))
  const sending = useRef(false)
  const reviewedConnection = useRef<WalletConnection | null>(null)
  const { connected: realtime } = useCheckoutRealtime(userId)
  const recover = useMutation({
    mutationFn: async (key: string) => (await http.get<Order>('/orders/by-attempt/' + encodeURIComponent(key))).data,
    onSuccess: order => { void navigate({ to: '/pedidos/$orderId', params: { orderId: order.id }, replace: true }) },
    onError: error => {
      if (isAxiosError(error) && error.response?.status === 404) {
        saveAttempt(userId, null); sending.current = false; setAttempt(null); setRecovering(false); setNotice('Nenhum pedido foi criado. Você pode revisar e tentar novamente.')
      }
    },
  })
  const { mutate: recoverAttempt } = recover
  const connect = useMutation({
    mutationFn: async (approved: boolean) => (await http.post<WalletConnection>('/wallets/' + draft.walletId + '/connect', { approved, network: draft.network, provider: draft.provider })).data,
    onSuccess: fresh => { client.setQueryData(connectionOptions(userId).queryKey, fresh); setWalletOpen(false); setNotice('Carteira conectada. Revise o pedido antes de finalizar.'); void review(fresh) },
    onError: error => { setNotice(apiMessage(error)); if (isUnauthorized(error)) void client.invalidateQueries({ queryKey: sessionKey }) },
  })
  const disconnect = useMutation({
    mutationFn: async () => { await http.delete('/wallet-connection') },
    onSuccess: () => { client.setQueryData(connectionOptions(userId).queryKey, null); setNotice('Carteira desconectada. Seus dados e itens foram preservados.') },
  })
  useEffect(() => { sessionStorage.setItem(draftKey(userId), JSON.stringify(draft)) }, [draft, userId])
  useEffect(() => {
    if (recovering && attempt) recoverAttempt(attempt.key)
  }, [recovering, attempt, recoverAttempt])
  useEffect(() => {
    if ([wallets.error, connection.error, recover.error].some(isUnauthorized)) void client.invalidateQueries({ queryKey: sessionKey })
  }, [wallets.error, connection.error, recover.error, client])
  const busy = create.isPending || connect.isPending || disconnect.isPending || cartBusy || !!attempt
  const activeConnection = connection.data?.walletId === draft.walletId && connection.data.network === draft.network && connection.data.provider === draft.provider ? connection.data : null
  function field(name: keyof Collector, value: string) { setDraft(current => ({ ...current, collector: { ...current.collector, [name]: value } })); setErrors(current => ({ ...current, [name]: undefined })) }
  function selection(update: Partial<Draft>) {
    if (connection.data) disconnect.mutate()
    setDraft(current => ({ ...current, ...update }))
  }
  function chooseWallet(id: string) {
    const wallet = wallets.data?.items.find(wallet => wallet.id === id)
    selection({ walletId: id, provider: wallet?.provider ?? draft.provider,
      network: wallet?.networks.includes(draft.network as PaymentNetwork) ? draft.network : wallet?.network ?? wallet?.networks[0] ?? '',
      collector: { ...draft.collector, walletAddress: wallet?.address ?? '', ensName: wallet?.ensName ?? draft.collector.ensName } })
    setErrors(current => ({ ...current, walletId: undefined, walletAddress: undefined, ensName: undefined }))
  }
  const reviewedQuote = useRef('')
  useEffect(() => {
    if (reviewOpen && reviewedQuote.current && cart.data && reviewedQuote.current !== cart.data.quote.revision) {
      setReviewOpen(false); setNotice('A cotação mudou com uma atualização de preço ou disponibilidade. Revise os valores e confirme novamente.')
    }
  }, [reviewOpen, cart.data])
  async function review(connected: WalletConnection | null = activeConnection) {
    try {
      const fresh = await revalidate.mutateAsync()
      if (fresh.items.some(item => item.quantity > item.available)) { setNotice('A disponibilidade de um NFT mudou. Ajuste as quantidades no carrinho antes de continuar.'); return }
      if (fresh.version !== cart.data?.version || fresh.quote.revision !== cart.data.quote.revision) { setNotice('A cotação mudou. Confira os valores atualizados e clique novamente em Confirmar compra.'); return }
      if (!connected) { setWalletOpen(true); return }
      reviewedQuote.current = fresh.quote.revision
      reviewedConnection.current = connected
      setReviewOpen(true)
    } catch (error) { setNotice(apiMessage(error)) }
  }
  function checkCollector(form?: HTMLFormElement) {
    const next = validateCollector(draft.collector, draft.walletId, draft.network)
    setErrors(next)
    if (Object.keys(next).length) {
      setNotice('Revise os campos indicados antes de continuar.')
      if (mobile) setCollectorOpen(true)
      const first = form?.elements.namedItem(Object.keys(next)[0]) as HTMLElement | null
      first?.focus()
      return false
    }
    return true
  }
  function saveCollector(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (checkCollector(event.currentTarget)) setCollectorOpen(false)
  }
  function submit(event?: SubmitEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (!checkCollector(event?.currentTarget)) return
    setCollectorOpen(false)
    void review()
  }
  async function sendOrder() {
    if (create.isPending || sending.current) return
    if (attempt) { setReviewOpen(false); setRecovering(true); return }
    const approved = reviewedConnection.current
    if (!cart.data || !draft.network || !approved || approved.walletId !== draft.walletId || approved.network !== draft.network || approved.provider !== draft.provider) {
      setReviewOpen(false); setNotice('Confira a carteira e revise o pedido novamente antes de finalizar.'); return
    }
    if (reviewedQuote.current !== cart.data.quote.revision) { setReviewOpen(false); setNotice('A cotação mudou. Revise os valores e confirme novamente.'); return }
    sending.current = true
    const next: Attempt = { key: crypto.randomUUID(), input: { collector: draft.collector, walletId: draft.walletId, network: draft.network, provider: draft.provider, connectionId: approved.id, cartVersion: cart.data.version, total: cart.data.quote.total, quoteRevision: cart.data.quote.revision } }
    saveAttempt(userId, next)
    setAttempt(next)
    try {
      const order = await create.mutateAsync(next)
      if (client.getQueryData<Session>(sessionKey)?.user?.id !== userId) return
      client.setQueryData(orderOptions(userId, order.id).queryKey, order)
      setReviewOpen(false)
      await navigate({ to: '/pedidos/$orderId', params: { orderId: order.id } })
    } catch (error) {
      setReviewOpen(false)
      if (isAxiosError(error) && error.response && error.response.status < 500) {
        saveAttempt(userId, null); sending.current = false; setAttempt(null); setNotice(apiMessage(error))
        void client.invalidateQueries({ queryKey: cartKey })
        if (error.response.data?.code === 'WALLET_DISCONNECTED') client.setQueryData(connectionOptions(userId).queryKey, null)
      } else {
        setRecovering(true); setNotice('A resposta do envio foi interrompida. Estamos recuperando a mesma tentativa, sem criar outro pedido.')
      }
    }
  }
  if (cart.isPending || wallets.isPending || connection.isPending) return <CheckoutSkeleton />
  if (cart.isError || wallets.isError || connection.isError) return <section className="checkout-access" role="alert"><h1>Não foi possível carregar o pagamento</h1><p>{apiMessage(cart.error || wallets.error || connection.error)}</p><Button onClick={() => { void cart.refetch(); void wallets.refetch(); void connection.refetch() }}>Tentar novamente</Button></section>
  if (!cart.data.items.length && !attempt) return <section className="checkout-access"><h1>Seu carrinho está vazio</h1><p>Adicione um NFT antes de iniciar o pagamento.</p><Button asChild><Link to="/" search={{}} hash="catalogo">Explorar NFTs</Link></Button></section>
  const fieldProps = { onChange: field }
  const collectorForm = (<form className="collector-form" id="collector-form" onSubmit={mobile ? saveCollector : submit} noValidate><fieldset disabled={busy}><legend>Perfil do colecionador</legend>
        <div className="collector-fields">
          <FormField name="displayName" label="Nome de exibição" value={draft.collector.displayName} error={errors.displayName} required {...fieldProps} />
          <FormField name="username" label="Nome de usuário" value={draft.collector.username} error={errors.username} required maxLength={30} {...fieldProps} />
          <div className="collector-field"><label htmlFor="collector-network">Rede<span aria-hidden="true">*</span></label><select id="collector-network" name="network" value={draft.network} onChange={event => { selection({ network: event.target.value as Draft['network'] }); setErrors(current => ({ ...current, network: undefined })) }} required aria-invalid={!!errors.network} aria-describedby={errors.network ? 'error-network' : undefined}><option value="">Selecione uma rede</option><option>Ethereum</option><option>Polygon</option></select>{errors.network && <p id="error-network" role="alert">{errors.network}</p>}</div>
          <FormField name="profileName" label="Nome do perfil" value={draft.collector.profileName} error={errors.profileName} required {...fieldProps} />
          <FormField name="walletAddress" label="Endereço da carteira" value={draft.collector.walletAddress} placeholder="Endereço 0x da carteira" error={errors.walletAddress} required maxLength={42} {...fieldProps} />
          <FormField name="secondaryAddress" label="ENS ou carteira secundária (opcional)" value={draft.collector.secondaryAddress} placeholder="ENS ou carteira secundária (opcional)" error={errors.secondaryAddress} {...fieldProps} />
          <div className="collector-field"><label htmlFor="collector-wallet">Tipo de carteira<span aria-hidden="true">*</span></label><select id="collector-wallet" name="walletId" value={draft.walletId} onChange={event => chooseWallet(event.target.value)} required aria-invalid={!!errors.walletId} aria-describedby={errors.walletId ? 'error-wallet' : undefined}><option value="">Selecione uma carteira</option>{wallets.data.items.map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.label}</option>)}</select>{errors.walletId && <p id="error-wallet" role="alert">{errors.walletId}</p>}</div>
          <FormField name="referralCode" label="Código de indicação" value={draft.collector.referralCode} error={errors.referralCode} maxLength={40} {...fieldProps} />
          <FormField name="email" label="E-mail" value={draft.collector.email} error={errors.email} type="email" required {...fieldProps} />
          <FormField name="ensName" label="Nome ENS" value={draft.collector.ensName} placeholder=".eth" error={errors.ensName} required maxLength={64} {...fieldProps} />
        </div>
        <label className="collector-other-wallet"><input type="checkbox" checked={draft.walletId === 'secondary'} onChange={event => { if (event.target.checked && !wallets.data.items.some(wallet => wallet.id === 'secondary')) void navigate({ to: '/carteiras', search: { redirect: '/pagamento' } }); else chooseWallet(event.target.checked ? 'secondary' : 'primary') }} />Usar outra carteira?</label>
        <div className="collector-note"><label htmlFor="collector-note">Observação do colecionador (opcional)</label><textarea id="collector-note" name="note" value={draft.collector.note} onChange={event => field('note', event.target.value)} maxLength={500} rows={6} aria-invalid={!!errors.note} />{errors.note && <p role="alert">{errors.note}</p>}</div>
      <div className="mobile-collector-actions"><Button type="submit">Concluir</Button></div></fieldset></form>)
  return <div className="checkout-page">
    <header className="checkout-mobile-header"><Link to="/carrinho" aria-label="Voltar ao carrinho"><ChevronLeft size={19} strokeWidth={1.5} /></Link><span>Pagamento com carteira</span></header>
    <nav className="checkout-breadcrumb" aria-label="Localização"><Link to="/" search={{}}>Início</Link><span>/</span><Link to="/mercado">Mercado</Link><span>/</span><span aria-current="page">Pagamento</span></nav>
    <h1 className="sr-only">Pagamento</h1>
    {attempt && <div className="checkout-recovery" role="status"><h2>{create.isPending ? 'Enviando seu pedido…' : 'Recuperando sua tentativa'}</h2><p>{create.isPending ? 'Aguarde. Seus itens serão preservados até a confirmação.' : 'Consultamos o pedido original para evitar uma segunda compra.'}</p>{recover.error && !isUnauthorized(recover.error) && <Button onClick={() => attempt && recover.mutate(attempt.key)} disabled={recover.isPending}>Recuperar pedido</Button>}</div>}
    <div className="checkout-grid">
      {mobile && <section className="mobile-wallet-selector" aria-labelledby="mobile-wallet-title">
        <div className="mobile-wallet-title"><h2 id="mobile-wallet-title">{activeConnection ? 'Carteira conectada' : 'Carteira selecionada'}</h2><button type="button" disabled={busy} onClick={() => setCollectorOpen(true)}>Trocar carteira</button></div>
        <div className="mobile-wallet-list" role="radiogroup" aria-label="Carteira para pagamento">{wallets.data.items.map(wallet => <div className="mobile-wallet-card" key={wallet.id}>
          <input id={'payment-wallet-' + wallet.id} type="radio" name="registered-wallet" value={wallet.id} checked={draft.walletId === wallet.id} disabled={busy} onChange={() => chooseWallet(wallet.id)} />
          <label htmlFor={'payment-wallet-' + wallet.id}><strong>{wallet.nickname}</strong><span>{wallet.ensName || wallet.address.slice(0, 6) + '…' + wallet.address.slice(-4)}</span><small>{(wallet.id === draft.walletId ? draft.network : wallet.network) === 'Ethereum' ? 'Rede principal Ethereum' : 'Rede ' + (wallet.id === draft.walletId ? draft.network : wallet.network)}</small></label>
          <button type="button" className="mobile-wallet-options" disabled={busy} aria-label={'Editar ' + wallet.label.toLowerCase()} onClick={() => { if (draft.walletId !== wallet.id) chooseWallet(wallet.id); setCollectorOpen(true) }}><MoreVertical size={18} /></button>
        </div>)}</div>
      </section>}
      {!mobile && collectorForm}
      <aside className="checkout-summary" aria-labelledby="checkout-summary-title"><h2 id="checkout-summary-title">Seus NFTs</h2>
        <PaymentItems items={cart.data.items} />
        <button className="checkout-coupon-toggle" type="button" aria-expanded={showCoupon} onClick={() => setShowCoupon(value => !value)}>Tem um código promocional? Aplique aqui</button>
        {(showCoupon || cart.data.quote.coupon) && <CouponForm key={cart.data.quote.coupon?.code ?? 'none'} cart={cart.data} busy={busy} onNotice={setNotice} />}
        <div className="checkout-totals" aria-busy={cartBusy}>{cartBusy ? <Skeleton className="my-4 h-36 w-full" /> : <PaymentTotals quote={cart.data.quote} />}</div>
        <fieldset className="payment-providers" disabled={busy}><legend>Carteira e rede</legend>{(['WalletConnect', 'MetaMask', 'Coinbase Wallet'] as const).map(provider => <label key={provider} className={draft.provider === provider ? 'selected' : ''}><input type="radio" name="provider" value={provider} checked={draft.provider === provider} onChange={() => selection({ provider })} /><span className="mobile-provider-symbol" aria-hidden="true">{provider === 'Coinbase Wallet' ? <WalletCards size={18} /> : provider === 'MetaMask' ? 'M' : 'W'}</span>{provider === 'WalletConnect' ? <><span className="wallet-compatibility">METAMASK · WALLETCONNECT · COINBASE</span><span className="mobile-provider-label">WalletConnect</span></> : provider}</label>)}</fieldset>
        {activeConnection && <div className="payment-connected"><span><Check size={13} />Conectada · {draft.network}</span><button type="button" onClick={() => disconnect.mutate()} disabled={busy}>Desconectar</button></div>}
        <button className="payment-confirm" type={mobile ? 'button' : 'submit'} form={mobile ? undefined : 'collector-form'} onClick={mobile ? () => submit() : undefined} disabled={busy}>{create.isPending || cartBusy ? <><LoaderCircle className="payment-spinner" size={15} />Validando…</> : 'Confirmar compra'}</button>
        {disconnect.error && <p className="checkout-error" role="alert">{apiMessage(disconnect.error)}</p>}
        <p className="checkout-notice" role="status" aria-live="polite">{notice}</p>
      </aside>
    </div>
    {mobile && <Dialog.Root open={collectorOpen} onOpenChange={setCollectorOpen}><Dialog.Portal><Dialog.Overlay className="sheet-overlay" /><Dialog.Content className="mobile-collector-dialog" onOpenAutoFocus={event => {
      const first = Object.keys(errors)[0]
      const target = document.getElementById(first === 'walletId' ? 'collector-wallet' : 'collector-' + first)
      if (first && target) { event.preventDefault(); target.focus() }
    }}><Dialog.Close className="icon-button mobile-collector-close" aria-label="Fechar dados do colecionador"><X size={20} /></Dialog.Close><Dialog.Title>Carteira e dados do colecionador</Dialog.Title><Dialog.Description>Confira seus dados e selecione uma rede compatível para esta compra.</Dialog.Description>{collectorForm}</Dialog.Content></Dialog.Portal></Dialog.Root>}
    <Dialog.Root open={walletOpen} onOpenChange={setWalletOpen}><Dialog.Portal><Dialog.Overlay className="sheet-overlay" /><Dialog.Content className="checkout-dialog"><Dialog.Close className="checkout-dialog-close icon-button" aria-label="Fechar conexão"><X size={18} /></Dialog.Close><WalletCards className="checkout-dialog-icon" size={40} /><Dialog.Title>Conectar {draft.provider}</Dialog.Title><Dialog.Description>Autorize a conexão simulada da sua carteira cadastrada para revisar o pedido.</Dialog.Description><dl className="checkout-review-data"><div><dt>Rede</dt><dd>{draft.network}</dd></div><div><dt>Endereço</dt><dd>{draft.collector.walletAddress}</dd></div></dl>{connect.error && <p className="checkout-error" role="alert">{apiMessage(connect.error)}</p>}<div className="checkout-dialog-actions"><Button variant="outline" disabled={connect.isPending} onClick={() => connect.mutate(false)}>Recusar conexão</Button><Button disabled={connect.isPending} onClick={() => connect.mutate(true)}>{connect.isPending ? 'Conectando…' : 'Conectar carteira'}</Button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
    <Dialog.Root open={reviewOpen} onOpenChange={open => { if (!create.isPending) setReviewOpen(open) }}><Dialog.Portal><Dialog.Overlay className="sheet-overlay" /><Dialog.Content className="checkout-dialog"><Dialog.Close className="checkout-dialog-close icon-button" aria-label="Fechar revisão" disabled={create.isPending}><X size={18} /></Dialog.Close><Dialog.Title>Revise seu pedido</Dialog.Title><Dialog.Description>Confira os dados antes de enviar a compra simulada.</Dialog.Description><dl className="checkout-review-data"><div><dt>Colecionador</dt><dd>{draft.collector.displayName}</dd></div><div><dt>E-mail</dt><dd>{draft.collector.email}</dd></div><div><dt>Carteira</dt><dd>{draft.provider} · {draft.network}</dd></div><div><dt>Endereço</dt><dd>{draft.collector.walletAddress}</dd></div><div><dt>Edições</dt><dd>{cart.data.items.reduce((sum, item) => sum + item.quantity, 0)}</dd></div><div><dt>Total</dt><dd>{formatEth(cart.data.quote.total)} ETH</dd></div></dl><p className="checkout-review-note">Nenhum valor real será cobrado.</p><Button className="w-full" disabled={create.isPending || cartBusy} onClick={sendOrder}>{create.isPending ? 'Enviando pedido…' : 'Finalizar pedido'}</Button></Dialog.Content></Dialog.Portal></Dialog.Root>
    <span className="sr-only" role="status">{realtime ? 'Atualizações em tempo real conectadas.' : 'Consultas REST disponíveis para recuperar atualizações.'}</span>
  </div>
}
export function CheckoutPage() {
  const session = useQuery(sessionOptions)
  if (session.isPending) return <CheckoutSkeleton />
  if (session.isError) return <section className="checkout-access" role="alert"><h1>Não foi possível consultar sua sessão</h1><Button onClick={() => void session.refetch()}>Tentar novamente</Button></section>
  if (!session.data.user) return <CheckoutAccess />
  return <CheckoutAccount key={session.data.user.id} userId={session.data.user.id} />
}

function CheckoutAccount({ userId }: { userId: string }) {
  const client = useQueryClient()
  const profile = useQuery(profileOptions(userId))
  const wallets = useQuery(walletSettingsOptions(userId))
  useEffect(() => {
    if ([profile.error, wallets.error].some(isUnauthorized)) void client.invalidateQueries({ queryKey: sessionKey })
  }, [profile.error, wallets.error, client])
  if (profile.isPending || wallets.isPending) return <CheckoutSkeleton />
  if (profile.isError || wallets.isError) return <section className="checkout-access" role="alert"><h1>Não foi possível carregar os dados da conta</h1><p>{apiMessage(profile.error || wallets.error)}</p><Button onClick={() => { void profile.refetch(); void wallets.refetch() }}>Tentar novamente</Button></section>
  return <CheckoutForm userId={userId} profile={profile.data.profile} wallets={wallets} />
}
