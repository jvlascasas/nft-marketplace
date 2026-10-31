import { http, HttpResponse } from 'msw'
import { AccountError, loginAccount, registerAccount, withAccountsLock } from './account-store'
import { CartError } from './cart-store'
import { currentSession, signInDemo, signOut } from './session-store'
import { simulateNetwork } from './scenarios'
import type { LoginInput, RegisterInput } from '../features/auth/contracts'

async function bodyOf(request: Request) {
  try { const data: unknown = await request.json(); if (data && typeof data === 'object' && !Array.isArray(data)) return data as Record<string, unknown> } catch { /* Report malformed input below. */ }
  throw new CartError('VALIDATION', 'Solicitação inválida.')
}
function stringField(body: Record<string, unknown>, key: string) {
  if (typeof body[key] !== 'string') throw new CartError('VALIDATION', 'Revise os campos do formulário.')
  return body[key]
}
async function respond(request: Request, register: boolean) {
  const owner = currentSession().user?.id ?? null
  const failure = await simulateNetwork(request)
  if (failure) return failure
  try {
    const body = await bodyOf(request)
    return await withAccountsLock(async () => {
      if (owner !== (currentSession().user?.id ?? null)) throw new CartError('SESSION_CHANGED', 'A sessão foi alterada em outra aba. Tente novamente.', 409)
      const input: LoginInput = { email: stringField(body, 'email'), password: stringField(body, 'password') }
      const session = register ? await registerAccount({ ...input, username: stringField(body, 'username'), confirmPassword: stringField(body, 'confirmPassword') } satisfies RegisterInput) : await loginAccount(input)
      return HttpResponse.json(session, { status: register ? 201 : 200 })
    })
  } catch (error) {
    if (error instanceof CartError) return HttpResponse.json({ code: error.code, message: error.message, ...(error instanceof AccountError ? { fields: error.fields } : {}) }, { status: error.status })
    return HttpResponse.json({ code: 'UNAVAILABLE', message: 'Não foi possível concluir o acesso neste navegador. Tente novamente.' }, { status: 503 })
  }
}
async function sessionOperation(request: Request, operation: (body: Record<string, unknown>) => object) {
    const owner = currentSession().user?.id ?? null
    const failure = await simulateNetwork(request)
    if (failure) return failure
    try {
      const body = request.method === 'DELETE' ? {} : await bodyOf(request)
      return await withAccountsLock(async () => {
        if (owner !== (currentSession().user?.id ?? null)) throw new CartError('SESSION_CHANGED', 'A sessão foi alterada em outra aba. Tente novamente.', 409)
        return HttpResponse.json(operation(body))
      })
    } catch (error) {
      return HttpResponse.json({ code: error instanceof CartError ? error.code : 'UNAVAILABLE', message: error instanceof Error ? error.message : 'Falha ao entrar.' }, { status: error instanceof CartError ? error.status : 503 })
    }
}
export const authHandlers = [
  http.post('/api/session/login', ({ request }) => respond(request, false)),
  http.post('/api/accounts', ({ request }) => respond(request, true)),
  http.post('/api/session/demo', ({ request }) => sessionOperation(request, body => signInDemo(body.account))),
  http.delete('/api/session', ({ request }) => sessionOperation(request, () => signOut())),
  http.post('/api/session/social', ({ request }) => sessionOperation(request, body => {
    if (body.provider !== 'Google' && body.provider !== 'Facebook') throw new CartError('VALIDATION', 'Provedor de demonstração inválido.')
    return signInDemo(body.account)
  })),
]
