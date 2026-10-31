import { http, HttpResponse } from 'msw'
import { currentSession } from './session-store'
import { demoUsers } from './demo-identities'
import { simulateNetwork } from './scenarios'

export const basicHandlers = [
  http.get('/api/session', async ({ request }) => (await simulateNetwork(request)) ?? HttpResponse.json(currentSession())),
  http.get('/api/demo-accounts', async ({ request }) => (await simulateNetwork(request)) ?? HttpResponse.json({ items: demoUsers })),
  http.get('/api/health', async ({ request }) => (await simulateNetwork(request)) ?? HttpResponse.json({ status: 'ok', mode: 'mock' })),
]
