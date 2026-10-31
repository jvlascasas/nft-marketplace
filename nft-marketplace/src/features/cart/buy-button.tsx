import { Link, useNavigate } from '@tanstack/react-router'
import { useAddToCart, cartErrorMessage } from './api'
import type { AddCartItem } from './contracts'

export function BuyButton({ nftId, editionId, quantity, disabled }: AddCartItem & { disabled: boolean }) {
  const add = useAddToCart()
  const navigate = useNavigate()
  return <div className="detail-buy-action"><button className="detail-buy" disabled={disabled || add.isPending} onClick={() => add.mutate({ nftId, editionId, quantity }, { onSuccess: () => { void navigate({ to: '/carrinho' }) } })}><span className="desktop-buy-label">{add.isPending ? 'ADICIONANDO…' : 'COMPRAR'}</span><span className="mobile-buy-label">{add.isPending ? 'Adicionando…' : 'Comprar NFT'}</span></button>{add.isError && <p className="detail-cart-error" role="alert">{cartErrorMessage(add.error)} <Link to="/carrinho">Ver carrinho</Link></p>}</div>
}
