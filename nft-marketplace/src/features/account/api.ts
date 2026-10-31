import { isAxiosError } from 'axios'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '../../lib/http'
import { sessionKey, sessionSource, isUnauthorized } from '../checkout/api'
import type { Session } from '../checkout/contracts'
import type { ProfileInput, ProfileResponse, WalletInput, WalletSettings } from './contracts'

export const profileOptions = (userId: string) => queryOptions({
  queryKey: ['profile', userId], queryFn: async ({ signal }) => (await http.get<ProfileResponse>('/profile', { signal })).data,
})
export const walletSettingsOptions = (userId: string) => queryOptions({
  queryKey: ['wallets', userId, 'settings'], queryFn: async ({ signal }) => (await http.get<WalletSettings>('/wallets', { signal })).data,
})
function publish(userId: string, resource: 'profile' | 'wallets') {
  if (typeof BroadcastChannel === 'undefined') return
  const channel = new BroadcastChannel('kurio:session')
  channel.postMessage({ type: 'account.updated', source: sessionSource, userId, resource })
  channel.close()
}
export function useSaveProfile(userId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationKey: ['profile', 'save', userId], gcTime: 0, retry: false,
    mutationFn: async (input: ProfileInput) => (await http.patch<ProfileResponse>('/profile', input)).data,
    onSuccess: async response => {
      if (client.getQueryData<Session>(sessionKey)?.user?.id !== userId) return
      await client.cancelQueries({ queryKey: profileOptions(userId).queryKey })
      client.setQueryData(profileOptions(userId).queryKey, response)
      client.setQueryData(sessionKey, response.session)
      void client.invalidateQueries({ queryKey: ['wallets', userId] })
      publish(userId, 'profile')
    },
    onError: error => {
      if (isUnauthorized(error)) void client.invalidateQueries({ queryKey: sessionKey })
      if (isAxiosError(error) && error.response?.data.code === 'PROFILE_CONFLICT') void client.invalidateQueries({ queryKey: profileOptions(userId).queryKey })
    },
  })
}
export function useSaveWallet(userId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationKey: ['wallets', 'save', userId], scope: { id: 'wallet-settings' }, retry: false,
    mutationFn: async ({ input, create }: { input: WalletInput; create: boolean }) => (create ? await http.post<WalletSettings>('/wallets', input) : await http.patch<WalletSettings>('/wallets/' + input.wallet.id, input)).data,
    onSuccess: response => {
      if (client.getQueryData<Session>(sessionKey)?.user?.id !== userId) return
      client.setQueryData(walletSettingsOptions(userId).queryKey, response)
      client.setQueryData(['wallet-connection', userId], null)
      void client.invalidateQueries({ queryKey: ['profile', userId] })
      void client.invalidateQueries({ queryKey: ['wallets', userId], exact: true })
      publish(userId, 'wallets')
    },
    onError: error => {
      if (isUnauthorized(error)) void client.invalidateQueries({ queryKey: sessionKey })
      if (isAxiosError(error) && error.response?.data.code === 'WALLET_CONFLICT') void client.invalidateQueries({ queryKey: walletSettingsOptions(userId).queryKey })
    },
  })
}
