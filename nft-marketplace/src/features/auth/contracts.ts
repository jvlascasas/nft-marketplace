export interface LoginInput { email: string; password: string }
export interface RegisterInput extends LoginInput { username: string; confirmPassword: string }
export type AuthErrors = Partial<Record<keyof RegisterInput, string>>
export interface AuthSearch { redirect?: string }

export function validateAuth(input: RegisterInput, mode: 'login' | 'register'): AuthErrors {
  const errors: AuthErrors = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()) || input.email.length > 254) errors.email = 'Informe um e-mail válido.'
  if (!input.password) errors.password = 'Informe sua senha.'
  else if (input.password.length > 128) errors.password = 'Use no máximo 128 caracteres.'
  if (mode === 'register') {
    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(input.username.trim())) errors.username = 'Use de 3 a 30 letras, números, pontos ou traços.'
    if (input.password.length < 8 || !/[a-zA-Z]/.test(input.password) || !/[0-9]/.test(input.password)) errors.password = 'Use pelo menos 8 caracteres, incluindo uma letra e um número.'
    if (!input.confirmPassword || input.confirmPassword !== input.password) errors.confirmPassword = 'As senhas devem ser iguais.'
  }
  return errors
}
export function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || [...value].some(character => character.charCodeAt(0) < 32)) return '/'
  try {
    const url = new URL(value, 'https://kurio.local')
    if (url.origin !== 'https://kurio.local' || !/^\/(?:mercado|carrinho|pagamento|perfil|carteiras|lista-de-interesse|nfts\/[a-z0-9-]+|pedidos\/[a-zA-Z0-9-]+)?$/.test(url.pathname)) return '/'
    return url.pathname + url.search + url.hash
  } catch { return '/' }
}
export function validateAuthSearch(search: Record<string, unknown>): AuthSearch {
  const redirect = safeReturnTo(search.redirect)
  return redirect === '/' ? {} : { redirect }
}
