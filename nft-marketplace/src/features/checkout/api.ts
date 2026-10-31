import { isAxiosError } from 'axios'
import { queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { http } from '../../lib/http'
import type { ApiError } from '../catalog/contracts'
import type { CheckoutInput, Order, Session, Wallet, WalletConnection } from './contracts'

export const sessionKey = ['session'] as const
export const sessionSource = crypto.randomUUID()
export const sessionOptions = queryOptions({
  queryKey: sessionKey, queryFn: async ({ signal }) => (await http.get<Session>('/session', { signal })).data,
  staleTime: 10_000, retry: false, refetchInterval: 30_000,
})
export const demoAccountsOptions = queryOptions({
  queryKey: ['demo-accounts'], queryFn: async ({ signal }) => (await http.get<{ items: NonNullable<Session['user']>[] }>('/demo-accounts', { signal })).data,
})
export const walletsOptions = (userId: string) => queryOptions({
  queryKey: ['wallets', userId], queryFn: async ({ signal }) => (await http.get<{ items: Wallet[] }>('/wallets', { signal })).data,
})
export const connectionOptions = (userId: string) => queryOptions({
  queryKey: ['wallet-connection', userId], queryFn: async ({ signal }) => (await http.get<WalletConnection | null>('/wallet-connection', { signal })).data,
})
export const orderOptions = (userId: string, orderId: string) => queryOptions({
  queryKey: ['orders', userId, orderId], queryFn: async ({ signal }) => (await http.get<Order>('/orders/' + encodeURIComponent(orderId), { signal })).data,
  refetchInterval: query => query.state.data?.status === 'pending' ? 1200 : false,
})
export function apiMessage(error: unknown) {
  return isAxiosError<ApiError>(error) && error.response?.data?.message ? error.response.data.message : 'Não foi possível completar a operação. Verifique a conexão e tente novamente.'
}
export function isUnauthorized(error: unknown) { return isAxiosError(error) && error.response?.status === 401 }
export function isPrivateQuery(key: readonly unknown[]) { return ['cart', 'orders', 'wallets', 'wallet-connection', 'profile', 'favorites'].includes(String(key[0])) }
export async function replaceSession(client: QueryClient, session: Session) {
  await client.cancelQueries()
  client.removeQueries({ predicate: query => isPrivateQuery(query.queryKey) })
  client.setQueryData(sessionKey, session)
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('kurio:session')
    channel.postMessage({ type: 'session.changed', source: sessionSource })
    channel.close()
  }
}
export function useDemoLogin() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (account: string) => (await http.post<Session>('/session/demo', { account })).data,
    onSuccess: session => replaceSession(client, session),
  })
}
export function useLogout() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async () => (await http.delete<Session>('/session')).data,
    onSuccess: session => replaceSession(client, session),
  })
}
export function useCreateOrder() {
  const client = useQueryClient()
  return useMutation({
    mutationKey: ['create-order'], retry: false,
    mutationFn: async (attempt: Attempt) => (await http.post<Order>('/orders', attempt.input, { headers: { 'Idempotency-Key': attempt.key } })).data,
    onError: error => { if (isUnauthorized(error)) void client.invalidateQueries({ queryKey: sessionKey }) },
  })
}
export interface Attempt { key: string; input: CheckoutInput }
const attemptKey = (userId: string) => 'kurio:checkout-attempt:' + userId
export function readAttempt(userId: string): Attempt | null {
  try { return JSON.parse(sessionStorage.getItem(attemptKey(userId)) ?? 'null') as Attempt | null } catch { return null }
}
export function saveAttempt(userId: string, attempt: Attempt | null) {
  if (attempt) sessionStorage.setItem(attemptKey(userId), JSON.stringify(attempt))
  else sessionStorage.removeItem(attemptKey(userId))
}
