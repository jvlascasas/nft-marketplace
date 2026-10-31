import { useEffect, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { BadgeCheck, Check, Copy, LoaderCircle, WalletCards, X, XCircle } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { CheckoutAccess } from './demo-access'
import { apiMessage, isUnauthorized, orderOptions, saveAttempt, sessionKey, sessionOptions } from './api'
import type { Order } from './contracts'
import { PaymentItems, PaymentTotals } from './payment-items'
import { useCheckoutRealtime } from './realtime'
import { formatEth } from '../../lib/eth'

function Explorer({ order }: { order: Order }) {
  const [copied, setCopied] = useState(false)
  return <Dialog.Root><Dialog.Trigger asChild><Button>Ver no Etherscan</Button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="sheet-overlay" /><Dialog.Content className="checkout-dialog"><Dialog.Close className="checkout-dialog-close icon-button" aria-label="Fechar transação"><X size={18} /></Dialog.Close><Dialog.Title>Explorador de demonstração</Dialog.Title><Dialog.Description>Esta transação é simulada e não possui registro em um explorador público.</Dialog.Description><dl className="checkout-review-data"><div><dt>Pedido</dt><dd>{order.id}</dd></div><div><dt>Rede</dt><dd>{order.network}</dd></div><div><dt>ID da transação</dt><dd>{order.transactionId}</dd></div><div><dt>Carteira</dt><dd>{order.wallet.address}</dd></div></dl><Button variant="outline" onClick={() => { void navigator.clipboard.writeText(order.transactionId).then(() => setCopied(true)) }}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'ID copiado' : 'Copiar ID da transação'}</Button></Dialog.Content></Dialog.Portal></Dialog.Root>
}
function OrderReceipt({ userId, orderId }: { userId: string; orderId: string }) {
  const client = useQueryClient()
  const query = useQuery(orderOptions(userId, orderId))
  const { connected: realtime, updatedOrder } = useCheckoutRealtime(userId)
  useEffect(() => { if (isUnauthorized(query.error)) void client.invalidateQueries({ queryKey: sessionKey }) }, [query.error, client])
  useEffect(() => {
    if (query.data?.status === 'confirmed') {
      saveAttempt(userId, null)
      sessionStorage.removeItem('kurio:checkout-draft:' + userId)
      void client.invalidateQueries({ predicate: query => ['cart', 'nfts'].includes(String(query.queryKey[0])) })
    } else if (query.data?.status === 'declined') saveAttempt(userId, null)
  }, [query.data?.status, client, userId])
  if (isUnauthorized(query.error)) return <CheckoutAccess />
  if (query.isPending) return <section className="order-page"><div className="order-receipt" aria-busy="true"><Skeleton className="mx-auto mb-8 h-24 w-24" /><Skeleton className="mb-6 h-5 w-full" /><Skeleton className="h-96 w-full" /><span className="sr-only" role="status">Consultando pedido…</span></div></section>
  if (query.isError && !query.data) return <section className="order-page"><div className="order-state"><h1>Não foi possível consultar o pedido</h1><p>{apiMessage(query.error)}</p><Button onClick={() => void query.refetch()}>Tentar novamente</Button><Link to="/carrinho">Voltar ao carrinho</Link></div></section>
  const order = query.data!
  if (order.status === 'pending') return <section className="order-page"><div className="order-state" aria-live="polite"><LoaderCircle size={60} className="payment-spinner" /><h1>Seu pedido está em processamento</h1><p>Aguardando a confirmação da carteira. Atualizamos esta tela automaticamente.</p><p className="order-identity">{order.id}</p><strong>{formatEth(order.quote.total)} ETH</strong><p>{realtime ? 'Conectado às atualizações do pedido.' : 'Recuperando o estado do pedido pela API.'}</p>{query.error && <p role="alert">A conexão foi interrompida. Seu pedido está salvo; tente consultar novamente.</p>}<Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}>Consultar status</Button><Link to="/carrinho">Voltar ao carrinho</Link></div></section>
  if (order.status === 'declined') return <section className="order-page"><div className="order-state"><XCircle size={60} /><h1>Pagamento recusado</h1><p>{order.declineReason}</p><p className="order-identity">{order.id}</p><Button asChild><Link to="/pagamento">Revisar pagamento</Link></Button><Link to="/carrinho">Voltar ao carrinho</Link></div></section>
  return <section className="order-page"><span className="sr-only" role="status">{updatedOrder === orderId ? 'Pedido atualizado em tempo real.' : ''}</span><article className="order-receipt" aria-labelledby="receipt-title">
    <Link to="/" search={{}} className="receipt-close icon-button" aria-label="Fechar confirmação e voltar ao Início"><X size={16} /></Link>
    <header className="receipt-header"><div className="receipt-mark"><WalletCards size={90} strokeWidth={1} /><BadgeCheck size={36} className="receipt-check" strokeWidth={1.4} /></div><h1 id="receipt-title">Seus NFTs agora estão na sua carteira</h1></header>
    <dl className="receipt-meta"><div><dt>ID da transação</dt><dd><abbr title={order.transactionId}>{order.transactionId.slice(0, 6)}…{order.transactionId.slice(-4)}</abbr></dd></div><div><dt>Data</dt><dd>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(order.createdAt)).replaceAll(' de ', ' ')}</dd></div><div><dt>Total</dt><dd>{formatEth(order.quote.total)} ETH</dd></div><div><dt>Carteira</dt><dd>{order.provider}</dd></div></dl>
    <div className="receipt-body"><h2>Detalhes da transação</h2><PaymentItems items={order.items} receipt /><PaymentTotals quote={order.quote} receipt /><p className="receipt-message">Transação confirmada na simulação da {order.network}. Os NFTs estão disponíveis na sua coleção de demonstração.</p><div className="receipt-explorer"><Explorer order={order} /></div><p className="receipt-order-id">Pedido {order.id}</p></div>
  </article></section>
}
export function OrderPage() {
  const { orderId } = useParams({ from: '/pedidos/$orderId' })
  const session = useQuery(sessionOptions)
  if (session.isPending) return <section className="order-page"><div className="order-state" role="status">Consultando sessão…</div></section>
  if (!session.data?.user) return <CheckoutAccess />
  return <OrderReceipt key={session.data.user.id + orderId} userId={session.data.user.id} orderId={orderId} />
}
