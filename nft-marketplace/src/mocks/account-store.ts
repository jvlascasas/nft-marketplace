import type { RegisterInput, LoginInput, AuthErrors } from '../features/auth/contracts'
import { validateAuth } from '../features/auth/contracts'
import type { Session } from '../features/checkout/contracts'
import { CartError, SettingsError } from './errors'
import { beginSession } from './session-store'
import { demoUsers, migrateIdentity } from './demo-identities'
import { AVATAR_MAX_BYTES, validateProfile, type Profile, type ProfileInput } from '../features/account/contracts'
import { getScenario } from './scenarios'

const KEY = 'kurio:mock-accounts:v1'
const ITERATIONS = 210_000
interface Account {
  id: string; name: string; email: string; username: string
  credential: { salt: string; hash: string; iterations: number }; createdAt: string
  profile?: { version: number; ensName: string; walletNickname: string; avatar: string | null }
}
export class AccountError extends CartError {
  fields: AuthErrors
  constructor(code: string, message: string, status: number, fields: AuthErrors = {}) { super(code, message, status); this.fields = fields }
}
function bytesToHex(bytes: Uint8Array) { return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('') }
function hexToBytes(hex: string) { return Uint8Array.from(hex.match(/.{2}/g) ?? [], byte => parseInt(byte, 16)) }
async function hashPassword(password: string, salt: string, iterations: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  return bytesToHex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: hexToBytes(salt), iterations, hash: 'SHA-256' }, key, 256)))
}
async function credential(password: string) {
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)))
  return { salt, hash: await hashPassword(password, salt, ITERATIONS), iterations: ITERATIONS }
}
function sameHash(first: string, second: string) {
  if (first.length !== second.length) return false
  let difference = 0
  for (let index = 0; index < first.length; index++) difference |= first.charCodeAt(index) ^ second.charCodeAt(index)
  return difference === 0
}
function read(): Account[] | null {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Account[] | null
    if (!Array.isArray(data) || !data.every(account => account.credential?.hash && account.credential?.salt)) return null
    const migrated = data.map(account => migrateIdentity(account))
    if (JSON.stringify(data) !== JSON.stringify(migrated)) save(migrated)
    return migrated
  } catch { return null }
}
function save(accounts: Account[]) { localStorage.setItem(KEY, JSON.stringify(accounts)) }
async function accounts(): Promise<Account[]> {
  const existing = read()
  if (existing) return existing
  const seeded = await Promise.all(demoUsers.map(async user => ({ ...user, credential: await credential('Kurio@2026'), createdAt: '2026-10-01T00:00:00.000Z' })))
  save(seeded)
  return seeded
}
export function withAccountsLock<T>(operation: () => Promise<T>): Promise<T> {
  return navigator.locks ? navigator.locks.request('kurio:mock-account-write', operation) : operation()
}
function ensureSessionAvailable() {
  if (getScenario() === 'session-expired') throw new AccountError('UNAUTHORIZED', 'Sua sessão de demonstração está expirada. Restaure o cenário padrão e tente novamente.', 401)
}
export async function loginAccount(input: LoginInput): Promise<Session> {
  ensureSessionAvailable()
  const errors = validateAuth({ ...input, username: '', confirmPassword: '' }, 'login')
  if (Object.keys(errors).length) throw new AccountError('VALIDATION', 'Revise os dados de acesso.', 422, errors)
  const list = await accounts()
  const account = list.find(account => account.email === input.email.trim().toLowerCase())
  const reference = account ?? list[0]
  const hash = await hashPassword(input.password, reference.credential.salt, reference.credential.iterations)
  if (!account || !sameHash(hash, account.credential.hash)) throw new AccountError('INVALID_CREDENTIALS', 'E-mail ou senha inválidos.', 401)
  return beginSession({ id: account.id, name: account.name, email: account.email })
}
export async function registerAccount(input: RegisterInput): Promise<Session> {
  ensureSessionAvailable()
  const fields = validateAuth(input, 'register')
  if (Object.keys(fields).length) throw new AccountError('VALIDATION', 'Revise os campos indicados.', 422, fields)
  const list = await accounts()
  const email = input.email.trim().toLowerCase()
  const username = input.username.trim()
  if (getScenario() === 'registration-conflict' || list.some(account => account.email === email)) throw new AccountError('ACCOUNT_CONFLICT', 'Este e-mail já está cadastrado. Entre com sua conta.', 409, { email: 'Este e-mail já está cadastrado.' })
  if (list.some(account => account.username.toLowerCase() === username.toLowerCase())) throw new AccountError('USERNAME_CONFLICT', 'Este nome de usuário já está em uso.', 409, { username: 'Escolha outro nome de usuário.' })
  const account: Account = { id: 'collector-' + crypto.randomUUID(), name: username, username, email, credential: await credential(input.password), createdAt: new Date().toISOString() }
  save([...list, account])
  return beginSession({ id: account.id, name: account.name, email: account.email })
}

export function currentAccountUser(userId: string): NonNullable<Session['user']> | null {
  const account = read()?.find(account => account.id === userId)
  return account ? { id: account.id, name: account.name, email: account.email } : null
}
function profileOf(account: Account): Profile {
  return { userId: account.id, version: account.profile?.version ?? 1, displayName: account.name, username: account.username, email: account.email,
    ensName: account.profile?.ensName ?? demoUsers.find(user => user.id === account.id)?.ensName ?? account.id.slice(-8) + '.kurio.eth',
    walletNickname: account.profile?.walletNickname ?? 'Principal', avatar: account.profile?.avatar ?? null }
}
export async function getProfile(userId: string): Promise<Profile> {
  const account = (await accounts()).find(account => account.id === userId)
  if (!account) throw new SettingsError('NOT_FOUND', 'Perfil não encontrado.', 404)
  return profileOf(account)
}
async function validateAvatar(value: string | null) {
  if (value === null) return
  const match = /^data:image\/(png|jpeg|webp);base64,([a-zA-Z0-9+/=]+)$/.exec(value)
  if (!match || value.length > Math.ceil(AVATAR_MAX_BYTES * 4 / 3) + 100) throw new SettingsError('INVALID_AVATAR', 'Use PNG, JPEG ou WebP com até 512 KB.', 422, { avatar: 'Formato ou tamanho do avatar inválido.' })
  try {
    const bytes = Uint8Array.from(atob(match[2]), character => character.charCodeAt(0))
    if (bytes.length > AVATAR_MAX_BYTES) throw new Error('Too large')
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/' + match[1] }))
    const valid = bitmap.width > 0 && bitmap.height > 0 && bitmap.width <= 4096 && bitmap.height <= 4096
    bitmap.close()
    if (!valid) throw new Error('Invalid dimensions')
  } catch { throw new SettingsError('INVALID_AVATAR', 'A imagem não pôde ser lida. Use PNG, JPEG ou WebP com até 4096 px.', 422, { avatar: 'Imagem inválida.' }) }
}
export async function updateProfile(userId: string, input: ProfileInput): Promise<Profile> {
  const list = await accounts()
  const account = list.find(account => account.id === userId)
  if (!account) throw new SettingsError('NOT_FOUND', 'Perfil não encontrado.', 404)
  const current = profileOf(account)
  if (current.version !== input.version) throw new SettingsError('PROFILE_CONFLICT', 'O perfil mudou em outra aba. Recarregue os dados antes de salvar.', 409)
  const fields = validateProfile(input)
  if (Object.keys(fields).length) throw new SettingsError('VALIDATION', 'Revise os campos indicados.', 422, fields)
  const email = input.email.trim().toLowerCase()
  const username = input.username.trim()
  if (list.some(other => other.id !== userId && other.email === email)) throw new SettingsError('ACCOUNT_CONFLICT', 'Este e-mail já está cadastrado.', 409, { email: 'Este e-mail já está cadastrado.' })
  if (list.some(other => other.id !== userId && other.username.toLowerCase() === username.toLowerCase())) throw new SettingsError('USERNAME_CONFLICT', 'Este nome de usuário já está em uso.', 409, { username: 'Escolha outro nome de usuário.' })
  await validateAvatar(input.avatar)
  let nextCredential = account.credential
  if (input.password && Object.values(input.password).some(Boolean)) {
    const hash = await hashPassword(input.password.currentPassword, account.credential.salt, account.credential.iterations)
    if (!sameHash(hash, account.credential.hash)) throw new SettingsError('INVALID_PASSWORD', 'A senha atual está incorreta.', 422, { currentPassword: 'A senha atual está incorreta.' })
    nextCredential = await credential(input.password.newPassword)
  }
  const updated: Account = { ...account, name: input.displayName.trim(), username, email, credential: nextCredential,
    profile: { version: current.version + 1, ensName: input.ensName.trim().toLowerCase(), walletNickname: input.walletNickname.trim(), avatar: input.avatar } }
  save(list.map(item => item.id === userId ? updated : item))
  return profileOf(updated)
}

export async function syncProfileWalletNickname(userId: string, nickname: string) {
  const list = await accounts()
  const account = list.find(account => account.id === userId)
  if (!account) return
  const current = profileOf(account)
  if (current.walletNickname === nickname) return
  account.profile = { version: current.version + 1, walletNickname: nickname, ensName: current.ensName, avatar: current.avatar }
  save(list)
}
