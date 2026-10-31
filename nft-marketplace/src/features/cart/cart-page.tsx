import { useId, useState, type SubmitEvent } from 'react'
import { useIsMutating, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { DemoAccess } from '../checkout/demo-access'
import { sessionOptions } from '../checkout/api'
import * as Dialog from '@radix-ui/react-dialog'
import { ChevronLeft, Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react'
import { Artwork } from '../../components/artwork'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { formatEth } from '../../lib/eth'
import { RelatedCollection } from '../catalog/related-collection'
import {
  cartOptions, cartRecommendationsOptions, cartErrorMessage, useApplyCoupon, useChangeCartQuantity,
  useRemoveCartItem, useRemoveCoupon, useRevalidateQuote,
} from './api'
import type { CartItem, CartResponse } from './contracts'

function CartBreadcrumb() {
  return <nav className="cart-breadcrumb" aria-label="Localização"><Link to="/" search={{}}>Início</Link><span aria-hidden="true">/</span><Link to="/mercado">Mercado</Link><span aria-hidden="true">/</span><span aria-current="page">Carrinho</span></nav>
}

function CartRow({ item, busy, onQuantity, onRemove }: {
  item: CartItem; busy: boolean; onQuantity: (id: string, quantity: number) => void; onRemove: (id: string) => void
}) {
  return <tr className="cart-item" data-testid="cart-item" role="row">
    <th scope="row" role="rowheader"><Link className="cart-nft" to="/nfts/$nftId" params={{ nftId: item.nft.id }}><Artwork nft={item.nft} /><span><strong>{item.nft.name}</strong><small className="cart-token-id">ID do token: #{item.nft.name.split('#')[1].padStart(4, '0')}</small><small className="cart-mobile-edition">Edição: {item.editionLabel}</small>{item.quantity > item.available && <small className="cart-stock-warning" role="alert">Disponível: {item.available}. Ajuste a quantidade ou remova este NFT.</small>}</span></Link></th>
    <td role="cell" data-label="Preço" className="cart-unit-price">{formatEth(item.unitPrice)} ETH</td>
    <td role="cell" data-label="Edições"><div className="cart-quantity" role="group" aria-label={'Quantidade de ' + item.nft.name}><button aria-label={'Diminuir quantidade de ' + item.nft.name} disabled={busy || item.quantity <= 1} onClick={() => onQuantity(item.id, item.quantity - 1)}><Minus size={12} /></button><output aria-label={'Quantidade selecionada de ' + item.nft.name}>{item.quantity}</output><button aria-label={'Aumentar quantidade de ' + item.nft.name} disabled={busy || item.quantity >= item.available} onClick={() => onQuantity(item.id, item.quantity + 1)}><Plus size={12} /></button></div></td>
    <td role="cell" data-label="Total" className="cart-line-total">{formatEth(item.lineTotal)} ETH</td>
    <td role="cell" className="cart-remove-cell"><button className="cart-remove" disabled={busy} aria-label={'Remover ' + item.nft.name} onClick={() => onRemove(item.id)}><Trash2 size={19} strokeWidth={1.4} /></button></td>
  </tr>
}

export function CouponForm({ cart, busy, onNotice }: { cart: CartResponse; busy: boolean; onNotice: (notice: string) => void }) {
  const id = useId()
  const [code, setCode] = useState(cart.quote.coupon?.code ?? '')
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const error = apply.error || remove.error
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    apply.mutate({ code, version: cart.version }, { onSuccess: () => onNotice('Código promocional aplicado.') })
  }
  return <div className="cart-coupon"><form onSubmit={submit} noValidate>
    <label htmlFor={id}>Código promocional</label><div className="cart-coupon-input"><input id={id} value={code} onChange={event => setCode(event.target.value)} placeholder="Digite o código promocional..." maxLength={40} aria-invalid={!!error} aria-describedby={error ? id + '-error' : undefined} disabled={busy || !cart.items.length} /><button type="submit" disabled={busy || !cart.items.length}>Aplicar</button></div>
  </form>{cart.quote.coupon && <p className="coupon-applied">{cart.quote.coupon.code} · {cart.quote.coupon.percent}% de desconto <button aria-label="Remover cupom" disabled={busy} onClick={() => remove.mutate({ version: cart.version }, { onSuccess: () => onNotice('Código promocional removido.') })}><X size={14} /></button></p>}{error && <p className="cart-field-error" id={id + '-error'} role="alert">{cartErrorMessage(error)}</p>}</div>
}

function CheckoutGate({ cart, busy, onNotice }: { cart: CartResponse; busy: boolean; onNotice: (notice: string) => void }) {
  const [open, setOpen] = useState(false)
  const session = useQuery(sessionOptions)
  const navigate = useNavigate()
  const quote = useRevalidateQuote()
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild><button className="cart-checkout" disabled={busy || !cart.items.length} onClick={event => {
      event.preventDefault()
      quote.mutate(undefined, { onSuccess: fresh => {
        if (fresh.version !== cart.version || fresh.quote.total !== cart.quote.total) {
          onNotice('Os valores do carrinho foram atualizados. Revise o resumo e confirme novamente.')
          return
        }
        if (session.data?.user) void navigate({ to: '/pagamento' })
        else setOpen(true)
      }, onError: error => onNotice(cartErrorMessage(error)) })
    }}>{quote.isPending ? 'Validando valores…' : session.data?.user ? 'Finalizar' : 'Conectar e finalizar'}</button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="sheet-overlay" /><Dialog.Content className="sheet-content"><div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-xl font-semibold">Conecte sua conta</Dialog.Title><Dialog.Description className="mt-2 text-sm text-muted-foreground">Entre para conectar sua carteira e continuar.</Dialog.Description></div><Dialog.Close className="icon-button" aria-label="Fechar painel"><X size={20} /></Dialog.Close></div><div className="cart-connect-summary"><p>Total do carrinho</p><strong>{formatEth(cart.quote.total)} ETH</strong><p>Seu carrinho será preservado. Nenhum pedido foi criado.</p><DemoAccess onComplete={() => void navigate({ to: '/pagamento' })} /><Dialog.Close asChild><Button asChild><Link to="/login" search={{ redirect: '/pagamento' }}>Entrar para continuar</Link></Button></Dialog.Close></div></Dialog.Content></Dialog.Portal>
  </Dialog.Root>
}

function Summary({ cart, busy, onNotice }: { cart: CartResponse; busy: boolean; onNotice: (notice: string) => void }) {
  return <aside className="cart-summary" aria-labelledby="cart-summary-heading"><h2 id="cart-summary-heading">Resumo da carteira</h2>
    <CouponForm key={cart.quote.coupon?.code ?? 'none'} cart={cart} busy={busy} onNotice={onNotice} />
    <dl className="cart-amounts" aria-busy={busy}><div><dt>Subtotal</dt><dd data-testid="cart-subtotal">{busy ? <Skeleton className="h-4 w-24" /> : formatEth(cart.quote.subtotal) + ' ETH'}</dd></div><div><dt>Desconto do lançamento</dt><dd data-testid="cart-discount">{busy ? <Skeleton className="h-4 w-24" /> : '(-) ' + formatEth(cart.quote.discount)}</dd></div><div><dt>Taxa de rede{cart.quote.networkFeePercent && ' (' + formatEth(cart.quote.networkFeePercent) + '%)'}</dt><dd data-testid="cart-fee">{busy ? <Skeleton className="h-4 w-24" /> : formatEth(cart.quote.networkFee) + ' ETH'}</dd></div></dl>
    <p className="cart-fee-note">Taxa estimada</p>
    <div className="cart-grand-total"><span>Total</span><strong data-testid="cart-total">{busy ? <Skeleton className="h-5 w-28" /> : formatEth(cart.quote.total) + ' ETH'}</strong></div>
    <CheckoutGate cart={cart} busy={busy} onNotice={onNotice} />
    <Link to="/" search={{}} hash="catalogo" className="cart-continue">Continuar explorando</Link>
  </aside>
}

function Recommendations() {
  const recommendations = useQuery(cartRecommendationsOptions)
  if (recommendations.isPending) return <section className="related-collection" aria-label="Carregando sugestões"><h2>Colecionadores também viram</h2><div className="related-nfts">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="aspect-[190/230] w-full" />)}</div></section>
  if (recommendations.isError) return <section className="cart-recommendations-error"><p>Não foi possível carregar as sugestões.</p><Button variant="outline" onClick={() => void recommendations.refetch()}>Recarregar sugestões</Button></section>
  return <RelatedCollection pages={recommendations.data.pages} title="Colecionadores também viram" />
}

export function CartPage() {
  const cart = useQuery(cartOptions)
  const busy = useIsMutating({ mutationKey: ['cart', 'mutation'] }) > 0
  const [notice, setNotice] = useState('')
  const change = useChangeCartQuantity()
  const remove = useRemoveCartItem()
  function onQuantity(id: string, quantity: number) {
    if (!cart.data) return
    change.mutate({ id, quantity, version: cart.data.version }, { onSuccess: () => setNotice('Quantidade atualizada.'), onError: error => setNotice(cartErrorMessage(error)) })
  }
  function onRemove(id: string) {
    if (!cart.data) return
    remove.mutate({ id, version: cart.data.version }, { onSuccess: () => setNotice('Item removido do carrinho.'), onError: error => setNotice(cartErrorMessage(error)) })
  }
  return <div className="cart-page">
    <CartBreadcrumb /><header className="cart-page-header"><Link to="/mercado" className="icon-button" aria-label="Voltar ao Mercado"><ChevronLeft size={20} /></Link><h1>Carrinho de NFTs</h1></header>
    {cart.isPending ? <div className="cart-layout" aria-busy="true" data-testid="cart-skeleton"><div><Skeleton className="mb-4 h-6 w-full" />{[0, 1, 2].map(index => <Skeleton key={index} className="mb-3 h-20 w-full" />)}</div><div><Skeleton className="mb-6 h-7 w-4/5" /><Skeleton className="h-72 w-full" /></div><span className="sr-only" role="status">Carregando carrinho…</span></div> : cart.isError ? <div className="cart-empty" role="alert"><h2>Não foi possível carregar o carrinho</h2><p>Verifique sua conexão e tente novamente.</p><Button onClick={() => void cart.refetch()}>Tentar novamente</Button></div> : cart.data.items.length === 0 && !busy ? <section className="cart-empty"><ShoppingCart size={42} strokeWidth={1.2} aria-hidden="true" /><h2>Seu carrinho está vazio</h2><p>Explore os NFTs e encontre a próxima peça da sua coleção.</p><Button asChild><Link to="/" search={{}} hash="catalogo">Explorar NFTs</Link></Button></section> : <div className="cart-layout">
      <div className="cart-items"><table className="cart-table" role="table"><caption className="sr-only">Itens do carrinho</caption><colgroup><col className="cart-col-nft" /><col className="cart-col-price" /><col className="cart-col-quantity" /><col className="cart-col-total" /><col className="cart-col-remove" /></colgroup><thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">NFTs</th><th scope="col" role="columnheader">Preço</th><th scope="col" role="columnheader">Edições</th><th scope="col" role="columnheader">Total</th><th scope="col" role="columnheader"><span className="sr-only">Remover</span></th></tr></thead><tbody role="rowgroup">{cart.data.items.map(item => <CartRow key={item.id} item={item} busy={busy} onQuantity={onQuantity} onRemove={onRemove} />)}</tbody></table></div>
      <Summary cart={cart.data} busy={busy} onNotice={setNotice} />
    </div>}
    <p className="cart-notice" role="status" aria-live="polite">{busy ? 'Atualizando carrinho e resumo…' : notice}</p>
    <Recommendations />
  </div>
}
