import type { PaymentNetwork, Session, Wallet, WalletProvider } from '../checkout/contracts'

export const AVATAR_MAX_BYTES = 512 * 1024
export interface Profile {
  userId: string; version: number; displayName: string; username: string; email: string
  ensName: string; walletNickname: string; avatar: string | null
}
export interface PasswordChange { currentPassword: string; newPassword: string; confirmPassword: string }
export type ProfileInput = Omit<Profile, 'userId'> & { password?: PasswordChange }
export interface ProfileResponse { profile: Profile; session: Session }
export type FieldErrors = Record<string, string>
export interface ManagedWallet extends Wallet {
  displayName: string; nickname: string; profileName: string; email: string; referralCode: string
  secondaryAddress: string; provider: WalletProvider; network: PaymentNetwork; sameAsPrimary: boolean
}
export interface WalletSettings { version: number; items: ManagedWallet[] }
export interface WalletInput { version: number; wallet: ManagedWallet }
const emailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254
export const evmAddressValid = (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value)
export const ensValid = (value: string) => /^[a-zA-Z0-9][a-zA-Z0-9.-]{1,60}\.eth$/.test(value)
export function validateProfile(input: ProfileInput): FieldErrors {
  const fields: FieldErrors = {}
  if (input.displayName.trim().length < 2 || input.displayName.length > 80) fields.displayName = 'Use de 2 a 80 caracteres.'
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(input.username.trim())) fields.username = 'Use de 3 a 30 letras, números, pontos ou traços.'
  if (!emailValid(input.email.trim())) fields.email = 'Informe um e-mail válido.'
  if (!ensValid(input.ensName.trim())) fields.ensName = 'Informe um nome terminado em .eth.'
  if (!input.walletNickname.trim() || input.walletNickname.length > 50) fields.walletNickname = 'Informe um apelido de até 50 caracteres.'
  if (input.password && Object.values(input.password).some(Boolean)) {
    if (!input.password.currentPassword || input.password.currentPassword.length > 128) fields.currentPassword = 'Informe sua senha atual.'
    if (input.password.newPassword.length < 8 || input.password.newPassword.length > 128 || !/[a-zA-Z]/.test(input.password.newPassword) || !/\d/.test(input.password.newPassword)) fields.newPassword = 'Use 8 a 128 caracteres, com letras e números.'
    if (input.password.newPassword === input.password.currentPassword) fields.newPassword = 'Escolha uma senha diferente da atual.'
    if (!input.password.confirmPassword || input.password.confirmPassword !== input.password.newPassword) fields.confirmPassword = 'As senhas devem ser iguais.'
  }
  return fields
}
export function validateWallet(wallet: ManagedWallet): FieldErrors {
  const fields: FieldErrors = {}
  if (wallet.displayName.trim().length < 2 || wallet.displayName.length > 80) fields.displayName = 'Informe um nome de 2 a 80 caracteres.'
  if (!wallet.nickname.trim() || wallet.nickname.length > 50) fields.nickname = 'Informe um apelido de até 50 caracteres.'
  if (!wallet.profileName.trim() || wallet.profileName.length > 80) fields.profileName = 'Informe o nome do perfil.'
  if (!['Ethereum', 'Polygon'].includes(wallet.network)) fields.network = 'Selecione uma rede.'
  if (!evmAddressValid(wallet.address)) fields.address = 'Use 0x seguido de 40 caracteres hexadecimais.'
  if (wallet.secondaryAddress && !evmAddressValid(wallet.secondaryAddress) && !ensValid(wallet.secondaryAddress)) fields.secondaryAddress = 'Use um endereço EVM ou um nome .eth.'
  if (!['MetaMask', 'Coinbase Wallet', 'WalletConnect'].includes(wallet.provider)) fields.provider = 'Selecione um tipo de carteira.'
  if (!emailValid(wallet.email.trim())) fields.email = 'Informe um e-mail válido.'
  if (!ensValid(wallet.ensName.trim())) fields.ensName = 'Informe um nome terminado em .eth.'
  if (wallet.referralCode.length > 40) fields.referralCode = 'Use no máximo 40 caracteres.'
  return fields
}
