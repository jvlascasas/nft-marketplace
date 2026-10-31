import { Link } from '@tanstack/react-router'
import { Artwork } from '../../components/artwork'
import { formatEth } from '../../lib/eth'
import type { CartItem, CartQuote } from '../cart/contracts'

export function PaymentItems({ items, receipt = false }: { items: CartItem[]; receipt?: boolean }) {
  return <div className={'payment-items' + (receipt ? ' receipt-items' : '')}>
    <div className="payment-items-heading"><span>NFTs</span>{receipt && <span>Edições</span>}<span>Subtotal</span></div>
    <ul>{items.map(item => <li key={item.id} data-testid="payment-item"><Link to="/nfts/$nftId" params={{ nftId: item.nft.id }} className="payment-item-nft"><Artwork nft={item.nft} /><span><strong>{item.nft.name}</strong><small>ID do token: #{item.nft.name.split('#')[1].padStart(4, '0')}{!receipt && ' (x ' + item.quantity + ')'}</small></span></Link>{receipt && <span className="receipt-quantity">(x {item.quantity})</span>}<strong className="payment-line-total">{formatEth(item.lineTotal)} ETH</strong></li>)}</ul>
  </div>
}
export function PaymentTotals({ quote, receipt = false }: { quote: CartQuote; receipt?: boolean }) {
  return <div className={'payment-totals' + (receipt ? ' receipt-totals' : '')}><dl>
    {!receipt && <div><dt>Subtotal</dt><dd>{formatEth(quote.subtotal)} ETH</dd></div>}
    {(!receipt || quote.coupon) && <div><dt>{quote.coupon?.appliesTo === 'total' ? 'Desconto sobre o total' : 'Desconto do lançamento'}</dt><dd>(−) {formatEth(quote.discount)}{receipt && ' ETH'}</dd></div>}
    <div><dt>Taxa de rede{quote.networkFeePercent && ' (' + formatEth(quote.networkFeePercent) + '%)'}</dt><dd data-testid={receipt ? 'receipt-fee' : 'checkout-fee'}>{formatEth(quote.networkFee)} ETH</dd></div>
  </dl>{!receipt && <p className="payment-fee-note">Taxa estimada</p>}
  <div className="payment-total"><span>Total</span><strong data-testid={receipt ? 'receipt-total' : 'checkout-total'}>{formatEth(quote.total)} ETH</strong></div></div>
}
