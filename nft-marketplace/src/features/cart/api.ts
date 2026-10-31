import { isAxiosError } from 'axios'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '../../lib/http'
import type { ApiError, Nft } from '../catalog/contracts'
import type { AddCartItem, CartResponse } from './contracts'
import { sessionKey } from '../checkout/api'
import type { Session } from '../checkout/contracts'

export const cartKey = ['cart', 'active'] as const
export const cartOptions = queryOptions({
  queryKey: cartKey,
  queryFn: async ({ signal }) => (await http.get<CartResponse>('/cart', { signal })).data,
})
export const cartRecommendationsOptions = queryOptions({
  queryKey: ['nfts', 'cart-recommendations'],
  queryFn: async ({ signal }) => (await http.get<{ pages: Nft[][] }>('/cart/recommendations', { signal })).data,
})

export function cartErrorMessage(error: unknown) {
  return isAxiosError<ApiError>(error) && error.response?.data?.message ? error.response.data.message : 'Não foi possível atualizar o carrinho. Tente novamente.'
}

export function useCartOperation<T>(operation: (input: T) => Promise<CartResponse>, optimisticRemove?: (input: T) => string) {
  const client = useQueryClient()
  return useMutation({
    mutationKey: ['cart', 'mutation'],
    scope: { id: 'cart' },
    mutationFn: operation,
    onMutate: async input => {
      await client.cancelQueries({ queryKey: cartKey })
      const previous = client.getQueryData<CartResponse>(cartKey)
      const owner = client.getQueryData<Session>(sessionKey)?.user?.id ?? null
      if (previous && optimisticRemove) client.setQueryData<CartResponse>(cartKey, { ...previous, items: previous.items.filter(item => item.id !== optimisticRemove(input)) })
      return { previous, owner }
    },
    onSuccess: (response, _input, context) => {
      if (context.owner === (client.getQueryData<Session>(sessionKey)?.user?.id ?? null)) client.setQueryData(cartKey, response)
    },
    onError: (error, _input, context) => {
      if (context?.owner !== (client.getQueryData<Session>(sessionKey)?.user?.id ?? null)) return
      if (context?.previous) client.setQueryData(cartKey, context.previous)
      if (isAxiosError(error) && error.response?.status === 409) void client.invalidateQueries({ queryKey: cartKey })
    },
  })
}

export function useAddToCart() {
  return useCartOperation(async (input: AddCartItem) => (await http.post<CartResponse>('/cart/items', input)).data)
}
export function useChangeCartQuantity() {
  return useCartOperation(async (input: { id: string; quantity: number; version: number }) => (await http.patch<CartResponse>('/cart/items/' + encodeURIComponent(input.id), input)).data)
}
export function useRemoveCartItem() {
  return useCartOperation(async (input: { id: string; version: number }) => (await http.delete<CartResponse>('/cart/items/' + encodeURIComponent(input.id), { data: input })).data, input => input.id)
}
export function useApplyCoupon() {
  return useCartOperation(async (input: { code: string; version: number }) => (await http.post<CartResponse>('/cart/coupon', input)).data)
}
export function useRemoveCoupon() {
  return useCartOperation(async (input: { version: number }) => (await http.delete<CartResponse>('/cart/coupon', { data: input })).data)
}
export function useRevalidateQuote() {
  return useCartOperation(async (_input: void) => (await http.post<CartResponse>('/quote')).data)
}
