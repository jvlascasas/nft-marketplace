import { QueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: (failures, error) => failures < 1 && !(isAxiosError(error) && error.response && error.response.status < 500),
    },
    mutations: { retry: false },
  },
})
