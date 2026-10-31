import { queryOptions } from '@tanstack/react-query'
import { http } from '../../lib/http'

export interface SystemStatus {
  status: 'ok'
  mode: 'mock'
}

export const systemStatusOptions = queryOptions({
  queryKey: ['system', 'status'],
  queryFn: async ({ signal }) => (await http.get<SystemStatus>('/health', { signal })).data,
})
