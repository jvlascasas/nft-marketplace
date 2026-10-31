import { http, HttpResponse } from 'msw'
import { withAccountsLock } from './account-store'
import { currentSession, requireUser } from './session-store'
import { getNfts } from './inventory-state'
import { simulateNetwork } from './scenarios'
import { CartError } from './errors'

interface StoredFavorites { version: number; ids: string[] }
async function respond(request: Request, nftId?: string) {
  const owner = currentSession().user?.id
  const failure = await simulateNetwork(request)
  if (failure) return failure
  try {
    return await withAccountsLock(async () => {
      const user = requireUser()
      if (user.id !== owner) throw new CartError('SESSION_CHANGED', 'A sessão mudou. Entre novamente para continuar.', 401)
      const key = 'kurio:mock-favorites:v1:' + user.id
      const saved = JSON.parse(localStorage.getItem(key) ?? '{"version":0,"ids":[]}') as StoredFavorites
      const nfts = getNfts()
      if (nftId) {
        if (!nfts.some(nft => nft.id === nftId)) throw new CartError('NOT_FOUND', 'NFT não encontrado.', 404)
        const ids = new Set(saved.ids)
        if (request.method === 'PUT') ids.add(nftId)
        else ids.delete(nftId)
        if (JSON.stringify([...ids]) !== JSON.stringify(saved.ids)) {
          saved.ids = [...ids]
          saved.version++
          localStorage.setItem(key, JSON.stringify(saved))
        }
      }
      return HttpResponse.json({ version: saved.version, items: saved.ids.flatMap(id => nfts.filter(nft => nft.id === id)) })
    })
  } catch (error) {
    if (error instanceof CartError) return HttpResponse.json({ code: error.code, message: error.message }, { status: error.status })
    return HttpResponse.json({ code: 'STORAGE_UNAVAILABLE', message: 'Não foi possível acessar seus favoritos neste navegador.' }, { status: 503 })
  }
}
export const favoriteHandlers = [
  http.get('/api/favorites', ({ request }) => respond(request)),
  http.put('/api/favorites/:nftId', ({ request, params }) => respond(request, String(params.nftId))),
  http.delete('/api/favorites/:nftId', ({ request, params }) => respond(request, String(params.nftId))),
]
