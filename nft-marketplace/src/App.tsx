import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from './app/query-client'
import { router } from './app/router'
import { SessionSync } from './features/auth/session-sync'
import { RealtimeProvider } from './features/checkout/realtime-provider'
import { RealtimeNotice } from './components/realtime-notice'

export default function App() {
  return <QueryClientProvider client={queryClient}><SessionSync /><RealtimeProvider><RouterProvider router={router} /><RealtimeNotice /></RealtimeProvider></QueryClientProvider>
}
