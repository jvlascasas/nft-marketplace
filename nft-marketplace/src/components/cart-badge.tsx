import { useQuery } from '@tanstack/react-query'
import { cartOptions } from '../features/cart/api'

export function CartBadge() {
  const cart = useQuery(cartOptions)
  const quantity = cart.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
  return quantity > 0 ? <span className="cart-badge" >{quantity}</span> : null
}
