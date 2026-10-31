import { useEffect, useRef, useState, type ChangeEvent, type SubmitEvent } from 'react'
import { isAxiosError } from 'axios'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../components/ui/button'
import { AccountAvatar } from './avatar'
import { AccountAccess, AccountGate, AccountLoading, AccountShell } from './account-shell'
import { profileOptions, useSaveProfile } from './api'
import { AccountField } from './form-field'
import { focusAccountError } from './form-utils'
import { useAccountExpiry } from './use-account-expiry'
import { AVATAR_MAX_BYTES, validateProfile, type FieldErrors, type PasswordChange, type Profile } from './contracts'
import { apiMessage, isUnauthorized } from '../checkout/api'
import type { ApiError } from '../catalog/contracts'

const blankPassword: PasswordChange = { currentPassword: '', newPassword: '', confirmPassword: '' }
function ProfileForm({ userId, initial, currentVersion, reload }: { userId: string; initial: Profile; currentVersion: number; reload: () => Promise<Profile | undefined> }) {
  const [draft, setDraft] = useState(initial)
  const [password, setPassword] = useState<PasswordChange>({ ...blankPassword })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [notice, setNotice] = useState('')
  const [reading, setReading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const saving = useRef(false)
  const save = useSaveProfile(userId)
  useEffect(() => { if (save.isError && !save.isPending) focusAccountError('profile-', errors) }, [save.isError, save.isPending, errors])
  function field(name: keyof Profile, value: string) { setDraft(current => ({ ...current, [name]: value })); setErrors(current => ({ ...current, [name]: '' })); save.reset(); setNotice('') }
  function passwordField(name: keyof PasswordChange, value: string) { setPassword(current => ({ ...current, [name]: value })); setErrors(current => ({ ...current, [name]: '' })); save.reset(); setNotice('') }
  function avatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > AVATAR_MAX_BYTES) { setErrors(current => ({ ...current, avatar: 'Use PNG, JPEG ou WebP com até 512 KB.' })); return }
    setReading(true)
    const reader = new FileReader()
    reader.onload = () => { setDraft(current => ({ ...current, avatar: String(reader.result) })); setErrors(current => ({ ...current, avatar: '' })); setReading(false); setNotice('Prévia carregada. Clique em Salvar para confirmar.') }
    reader.onerror = () => { setReading(false); setErrors(current => ({ ...current, avatar: 'Não foi possível ler a imagem.' })) }
    reader.readAsDataURL(file)
  }
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving.current) return
    const input = { ...draft, password: Object.values(password).some(Boolean) ? password : undefined }
    const next = validateProfile(input)
    setErrors(next)
    if (Object.keys(next).length) { focusAccountError('profile-', next); return }
    saving.current = true
    save.mutate(input, {
      onSuccess: response => { saving.current = false; setDraft(response.profile); setPassword({ ...blankPassword }); setErrors({}); setNotice(input.password ? 'Perfil e senha atualizados.' : 'Perfil atualizado.') },
      onError: error => { saving.current = false; if (isAxiosError<ApiError>(error)) setErrors(error.response?.data.fields ?? {}); setNotice('') },
    })
  }
  async function refresh() { const fresh = await reload(); if (fresh) { setDraft(fresh); setPassword({ ...blankPassword }); setErrors({}); save.reset(); setNotice('Dados atualizados.') } }
  const busy = save.isPending || reading
  return <form className="profile-form" onSubmit={submit} noValidate>
    <h1>Perfil do colecionador</h1>
    {currentVersion !== draft.version && <div className="account-change-notice" role="status"><p>O perfil mudou em outra aba. Recarregue os dados antes de salvar suas alterações.</p><button type="button" onClick={() => void refresh()} disabled={busy}>Recarregar dados</button></div>}
    <fieldset disabled={busy}><legend className="sr-only">Dados do perfil</legend><div className="account-fields">
      <AccountField id="profile-displayName" name="displayName" label="Nome de exibição" value={draft.displayName} onChange={value => field('displayName', value)} error={errors.displayName} required maxLength={80} autoComplete="name" />
      <AccountField id="profile-username" name="username" label="Nome de usuário" value={draft.username} onChange={value => field('username', value)} error={errors.username} required maxLength={30} autoComplete="username" />
      <AccountField id="profile-email" name="email" label="E-mail" value={draft.email} onChange={value => field('email', value)} error={errors.email} type="email" required maxLength={254} autoComplete="email" />
      <AccountField id="profile-ensName" name="ensName" label="Nome ENS" value={draft.ensName} placeholder=".eth" onChange={value => field('ensName', value)} error={errors.ensName} required maxLength={64} />
      <AccountField id="profile-walletNickname" name="walletNickname" label="Apelido da carteira" value={draft.walletNickname} onChange={value => field('walletNickname', value)} error={errors.walletNickname} required maxLength={50} />
      <div className="account-avatar-field"><span className="account-field-label">Avatar<span aria-hidden="true">*</span></span><div><AccountAvatar avatar={draft.avatar} name={draft.displayName} /><button className="account-action" type="button" onClick={() => fileInput.current?.click()}>Carregar avatar</button><button className="account-text-action" type="button" disabled={!draft.avatar} onClick={() => { setDraft(current => ({ ...current, avatar: null })); setNotice('Clique em Salvar para confirmar a remoção.'); setErrors(current => ({ ...current, avatar: '' })) }}>Remover</button></div><label htmlFor="profile-avatar" className="sr-only">Arquivo de avatar</label><input ref={fileInput} id="profile-avatar" type="file" accept="image/png,image/jpeg,image/webp" onChange={avatar} className="sr-only" aria-invalid={!!errors.avatar} aria-describedby="profile-avatar-help" /><p id="profile-avatar-help">PNG, JPEG ou WebP · até 512 KB</p>{errors.avatar && <p className="account-field-error">{errors.avatar}</p>}</div>
    </div><section className="account-password-fields" aria-labelledby="password-heading"><h2 id="password-heading">Alterar senha</h2>
      <AccountField id="profile-currentPassword" name="currentPassword" label="Senha atual" value={password.currentPassword} onChange={value => passwordField('currentPassword', value)} error={errors.currentPassword} password maxLength={128} autoComplete="current-password" />
      <AccountField id="profile-newPassword" name="newPassword" label="Nova senha" value={password.newPassword} onChange={value => passwordField('newPassword', value)} error={errors.newPassword} password maxLength={128} autoComplete="new-password" />
      <AccountField id="profile-confirmPassword" name="confirmPassword" label="Confirmar nova senha" value={password.confirmPassword} onChange={value => passwordField('confirmPassword', value)} error={errors.confirmPassword} password maxLength={128} autoComplete="new-password" />
    </section><button className="account-action account-save" type="submit">{save.isPending ? 'Salvando…' : 'Salvar'}</button></fieldset>
    {save.error && <p className="account-error" role="alert">{apiMessage(save.error)}</p>}
    {Object.values(errors).some(Boolean) && <span className="sr-only" role="alert">Revise os campos indicados.</span>}
    <p className="account-status" role="status" aria-live="polite">{reading ? 'Carregando prévia…' : notice}</p>
  </form>
}
function ProfileContent({ userId }: { userId: string }) {
  const profile = useQuery(profileOptions(userId))
  useAccountExpiry(profile.error)
  if (isUnauthorized(profile.error)) return <AccountAccess />
  if (profile.isPending) return <AccountLoading />
  if (profile.isError && !profile.data) return <AccountShell section="profile"><div className="account-error-state" role="alert"><h1>Não foi possível carregar o perfil</h1><p>{apiMessage(profile.error)}</p><Button onClick={() => void profile.refetch()}>Tentar novamente</Button></div></AccountShell>
  return <AccountShell section="profile"><ProfileForm key={userId} userId={userId} initial={profile.data!.profile} currentVersion={profile.data!.profile.version} reload={async () => (await profile.refetch()).data?.profile} /></AccountShell>
}
export function ProfilePage() { return <AccountGate>{userId => <ProfileContent key={userId} userId={userId} />}</AccountGate> }
