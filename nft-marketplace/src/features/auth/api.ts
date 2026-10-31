import { useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '../../lib/http'
import type { Session } from '../checkout/contracts'
import { replaceSession } from '../checkout/api'
import type { RegisterInput } from './contracts'

export function useAuth(mode: 'login' | 'register') {
  const client = useQueryClient()
  return useMutation({
    mutationKey: ['auth', mode], gcTime: 0, retry: false,
    mutationFn: async (input: RegisterInput) => (await http.post<Session>(mode === 'register' ? '/accounts' : '/session/login', mode === 'register' ? input : { email: input.email, password: input.password })).data,
    onSuccess: session => replaceSession(client, session),
  })
}
export function useSocialLogin() {
  const client = useQueryClient()
  return useMutation({
    mutationKey: ['auth', 'social'], gcTime: 0, retry: false,
    mutationFn: async (input: { provider: 'Google' | 'Facebook'; account: string }) => (await http.post<Session>('/session/social', input)).data,
    onSuccess: session => replaceSession(client, session),
  })
}
