import { http, HttpResponse } from 'msw'
import { getProfile, updateProfile, withAccountsLock, syncProfileWalletNickname } from './account-store'
import { currentSession, requireUser, saveConnection } from './session-store'
import { readWallets, SettingsError, updateWallet, syncPrimaryNickname } from './wallet-store'
import { simulateNetwork, getScenario } from './scenarios'
import { CartError } from './cart-store'
import type { ProfileInput, PasswordChange, ManagedWallet } from '../features/account/contracts'

async function bodyOf(request: Request): Promise<Record<string, unknown>> {
  try { const body: unknown = await request.json(); if (body && typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown> } catch { /* Return structured validation below. */ }
  throw new SettingsError('VALIDATION', 'Dados inválidos.')
}
function text(body: Record<string, unknown>, key: string) {
  if (typeof body[key] !== 'string') throw new SettingsError('VALIDATION', 'Preencha os campos obrigatórios.', 422, { [key]: 'Campo inválido.' })
  return body[key]
}
async function respond(request: Request, operation: () => Promise<object> | object) {
  const owner = currentSession().user?.id
  const failure = await simulateNetwork(request)
  if (failure) return failure
  try {
    return await withAccountsLock(async () => {
      const user = requireUser()
      if (user.id !== owner) throw new SettingsError('SESSION_CHANGED', 'A sessão mudou. Entre novamente para continuar.', 401)
      if (request.method !== 'GET' && (getScenario() === 'profile-error' || getScenario() === 'wallets-error')) throw new SettingsError('UNAVAILABLE', 'Não foi possível salvar as alterações. Tente novamente.', 503)
      return HttpResponse.json(await operation())
    })
  } catch (error) {
    if (error instanceof CartError) return HttpResponse.json({ code: error.code, message: error.message, ...(error instanceof SettingsError ? { fields: error.fields } : {}) }, { status: error.status })
    return HttpResponse.json({ code: 'STORAGE_UNAVAILABLE', message: 'Não foi possível salvar os dados neste navegador.' }, { status: 503 })
  }
}
function passwordOf(value: unknown): PasswordChange | undefined {
  if (value === undefined) return undefined
  if (!value || typeof value !== 'object') throw new SettingsError('VALIDATION', 'Revise os campos de senha.')
  const body = value as Record<string, unknown>
  return { currentPassword: text(body, 'currentPassword'), newPassword: text(body, 'newPassword'), confirmPassword: text(body, 'confirmPassword') }
}
function profileOf(body: Record<string, unknown>): ProfileInput {
  if (!Number.isSafeInteger(body.version) || (body.avatar !== null && typeof body.avatar !== 'string')) throw new SettingsError('VALIDATION', 'Revise os dados do perfil.')
  return { version: Number(body.version), displayName: text(body, 'displayName'), username: text(body, 'username'), email: text(body, 'email'),
    ensName: text(body, 'ensName'), walletNickname: text(body, 'walletNickname'), avatar: body.avatar as string | null, password: passwordOf(body.password) }
}
function walletOf(body: Record<string, unknown>, id?: string): ManagedWallet {
  if (!body.wallet || typeof body.wallet !== 'object') throw new SettingsError('VALIDATION', 'Revise os campos da carteira.')
  const value = body.wallet as Record<string, unknown>
  const keys = ['displayName', 'nickname', 'profileName', 'email', 'referralCode', 'secondaryAddress', 'address', 'ensName', 'provider', 'network'] as const
  const fields = Object.fromEntries(keys.map(key => [key, text(value, key)])) as Pick<ManagedWallet, typeof keys[number]>
  return { ...fields, id: id ?? text(value, 'id'), label: '', networks: [], sameAsPrimary: value.sameAsPrimary === true } as ManagedWallet
}
export const accountHandlers = [
  http.get('/api/profile', ({ request }) => respond(request, async () => ({ profile: await getProfile(requireUser().id), session: currentSession() }))),
  http.patch('/api/profile', ({ request }) => respond(request, async () => {
    const profile = await updateProfile(requireUser().id, profileOf(await bodyOf(request)))
    syncPrimaryNickname(requireUser(), profile.walletNickname)
    return { profile, session: currentSession() }
  })),
  http.post('/api/profile/password', ({ request }) => respond(request, async () => {
    const body = await bodyOf(request)
    const current = await getProfile(requireUser().id)
    const profile = await updateProfile(current.userId, { ...current, version: Number(body.version), password: passwordOf(body) })
    return { profile, session: currentSession() }
  })),
  http.get('/api/wallets', ({ request }) => respond(request, () => readWallets(requireUser()))),
  http.post('/api/wallets', ({ request }) => respond(request, async () => {
    const body = await bodyOf(request)
    const result = updateWallet(requireUser(), { version: Number(body.version), wallet: walletOf(body) }, true)
    const primary = result.items.find(wallet => wallet.id === 'primary')
    if (primary) await syncProfileWalletNickname(requireUser().id, primary.nickname)
    saveConnection(null)
    return result
  })),
  http.patch('/api/wallets/:walletId', ({ request, params }) => respond(request, async () => {
    const body = await bodyOf(request)
    const result = updateWallet(requireUser(), { version: Number(body.version), wallet: walletOf(body, String(params.walletId)) }, false)
    const primary = result.items.find(wallet => wallet.id === 'primary')
    if (primary) await syncProfileWalletNickname(requireUser().id, primary.nickname)
    saveConnection(null)
    return result
  })),
]
