import { http, HttpResponse } from 'msw'

export const lazyHttpHandler = http.all('/api/*', async ({ request, requestId }) => {
  const pathname = new URL(request.url).pathname
  const handlers = pathname.startsWith('/api/mock/') ? (await import('./control-handlers')).controlHandlers
    : pathname === '/api/health' || pathname === '/api/demo-accounts' || (pathname === '/api/session' && request.method === 'GET') ? (await import('./basic-handlers')).basicHandlers
    : pathname.startsWith('/api/session') || pathname === '/api/accounts' ? (await import('./auth-handlers')).authHandlers
    : pathname.startsWith('/api/favorites') ? (await import('./favorite-handlers')).favoriteHandlers
    : pathname.startsWith('/api/cart') || pathname === '/api/quote' ? (await import('./cart-handlers')).cartHandlers
    : pathname === '/api/nfts' || pathname === '/api/curation' ? (await import('./catalog-handlers')).catalogHandlers
    : pathname.startsWith('/api/nfts/') ? (await import('./detail-handlers')).detailHandlers
    : pathname.startsWith('/api/profile') || (pathname.startsWith('/api/wallets') && !pathname.endsWith('/connect')) ? (await import('./account-handlers')).accountHandlers
    : (await import('./checkout-handlers')).checkoutHandlers
  for (const handler of handlers) {
    const result = await handler.run({ request, requestId })
    if (result?.response) return result.response
  }
  return HttpResponse.json({ code: 'NOT_FOUND', message: 'Recurso não encontrado.' }, { status: 404 })
})
