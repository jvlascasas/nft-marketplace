import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import { isAxiosError } from 'axios'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import * as Dialog from '@radix-ui/react-dialog'
import { ChevronLeft, Eye, EyeOff, LoaderCircle, X } from 'lucide-react'
import { useMobile } from '../../lib/use-mobile'
import { Button } from '../../components/ui/button'
import { SocialIcon } from '../../components/social-icon'
import { Hero } from '../catalog/hero'
import { CatalogBrowser } from '../catalog/catalog-browser'
import { catalogParams } from '../catalog/search'
import { apiMessage, demoAccountsOptions } from '../checkout/api'
import type { ApiError } from '../catalog/contracts'
import { useAuth, useSocialLogin } from './api'
import { safeReturnTo, validateAuth, type AuthErrors, type AuthSearch, type RegisterInput } from './contracts'

function AuthBackground() {
  return <div className="auth-background" inert aria-hidden="true"><Hero /><CatalogBrowser params={catalogParams({})} onChange={() => undefined} onReset={() => undefined} /></div>
}
function GoogleMark() { return <img src="/mobile-icons/google.png" width={20} height={21} alt="" aria-hidden="true" /> }

function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
  const mobile = useMobile()
  const search = useSearch({ strict: false }) as AuthSearch
  const returnTo = safeReturnTo(search.redirect)
  const navigate = useNavigate()
  const mutation = useAuth(mode)
  const social = useSocialLogin()
  const title = useRef<HTMLHeadingElement>(null)
  const auxiliaryTrigger = useRef<HTMLButtonElement | null>(null)
  const submitting = useRef(false)
  const [input, setInput] = useState<RegisterInput>({ username: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<AuthErrors>({})
  const [revealed, setRevealed] = useState(false)
  const [confirmRevealed, setConfirmRevealed] = useState(false)
  const [auxiliary, setAuxiliary] = useState<'Google' | 'Facebook' | 'recovery' | null>(null)
  const accounts = useQuery({ ...demoAccountsOptions, enabled: auxiliary === 'Google' || auxiliary === 'Facebook' })
  const register = mode === 'register'
  useEffect(() => {
    if (!mutation.isPending && mutation.isError) {
      const name = Object.entries(errors).find(([, message]) => message)?.[0]
      if (name) document.getElementById('auth-' + name)?.focus()
    }
  }, [mutation.isPending, mutation.isError, errors])
  function returnFocus() {
    requestAnimationFrame(() => {
      const trigger = Array.from(document.querySelectorAll<HTMLElement>('[data-auth-trigger]')).find(element => element.getClientRects().length > 0)
      ;(trigger ?? document.getElementById('main'))?.focus({ preventScroll: true })
    })
  }
  async function close() { await navigate({ href: returnTo, replace: true }); returnFocus() }
  async function complete() {
    setInput({ username: '', email: '', password: '', confirmPassword: '' })
    await navigate({ href: returnTo, replace: true })
    requestAnimationFrame(() => document.getElementById('main')?.focus({ preventScroll: true }))
  }
  function change(name: keyof RegisterInput, value: string) {
    setInput(current => ({ ...current, [name]: value }))
    setErrors(current => ({ ...current, [name]: undefined }))
    mutation.reset()
  }
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const fields = validateAuth(input, mode)
    setErrors(fields)
    if (Object.keys(fields).length) {
      const first = Array.from(event.currentTarget.elements).find(element => element instanceof HTMLInputElement && fields[element.name as keyof AuthErrors]) as HTMLInputElement | undefined
      first?.focus()
      return
    }
    submitting.current = true
    mutation.mutate(input, {
      onSuccess: () => void complete(),
      onError: error => {
        submitting.current = false
        if (isAxiosError<ApiError>(error) && error.response?.data.fields) {
          setErrors(error.response.data.fields)
        }
      },
    })
  }
  const field = (name: keyof RegisterInput, placeholder: string, type = 'text', autoComplete = 'off') => <div className={'auth-field auth-field-' + name}>
    <label className="sr-only" htmlFor={'auth-' + name}>{placeholder}</label><div className="auth-input-wrap">
      <input id={'auth-' + name} name={name} value={input[name]} onChange={event => change(name, event.target.value)} type={type} placeholder={name === 'email' && !register ? 'contato@email.com' : placeholder} autoComplete={autoComplete} maxLength={name === 'email' ? 254 : name === 'username' ? 30 : 128} required aria-invalid={!!errors[name]} aria-describedby={errors[name] ? 'auth-error-' + name : name === 'password' && register ? 'auth-password-policy' : undefined} autoCapitalize="none" spellCheck={false} />
      {name === 'password' && <button type="button" className="auth-reveal" aria-label={revealed ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={revealed} onClick={() => setRevealed(value => !value)}>{revealed ? <EyeOff size={18} strokeWidth={1.4} /> : <Eye size={18} strokeWidth={1.4} />}</button>}
      {mobile && name === 'confirmPassword' && <button type="button" className="auth-reveal" aria-label={confirmRevealed ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'} aria-pressed={confirmRevealed} onClick={() => setConfirmRevealed(value => !value)}>{confirmRevealed ? <EyeOff size={18} strokeWidth={1.4} /> : <Eye size={18} strokeWidth={1.4} />}</button>}
    </div>{errors[name] && <p className="auth-field-error" id={'auth-error-' + name}>{errors[name]}</p>}
  </div>
  return <>
    <AuthBackground />
    <Dialog.Root open onOpenChange={open => { if (!open && !mutation.isPending && !social.isPending) void close() }}><Dialog.Portal>
      <Dialog.Overlay className="auth-overlay" />
      <Dialog.Content className={'auth-dialog ' + (register ? 'auth-register' : 'auth-login')} onOpenAutoFocus={event => { event.preventDefault(); title.current?.focus() }} onCloseAutoFocus={event => event.preventDefault()}>
        <Dialog.Close className="auth-close" aria-label="Fechar autenticação" disabled={mutation.isPending || social.isPending}>{mobile ? <ChevronLeft size={19} strokeWidth={1.5} /> : <X size={18} strokeWidth={1.3} />}</Dialog.Close>
        <Dialog.Title asChild><h1 className="sr-only" ref={title} tabIndex={-1}>{register ? 'Cadastro' : 'Login'}</h1></Dialog.Title>
        <button type="button" className="mobile-auth-brand" aria-label="Kurio, voltar ao site" disabled={mutation.isPending || social.isPending} onClick={() => void close()}>KURIO</button>
        <p className="mobile-auth-heading">{register ? 'Criar perfil de colecionador' : 'Entrar'}</p>
        <nav className="auth-tabs" aria-label="Acesso à conta"><Link to="/login" search={search} aria-disabled={mutation.isPending || social.isPending} onClick={event => { if (mutation.isPending || social.isPending) event.preventDefault() }} aria-current={!register ? 'page' : undefined}>Entrar</Link><span aria-hidden="true">|</span><Link to="/cadastro" search={search} aria-disabled={mutation.isPending || social.isPending} onClick={event => { if (mutation.isPending || social.isPending) event.preventDefault() }} aria-current={register ? 'page' : undefined}>Criar conta</Link></nav>
        <Dialog.Description className="auth-description">{register ? 'Crie seu perfil de colecionador e conecte sua carteira.' : 'Entre para gerenciar sua carteira, coleção e perfil de criador.'}</Dialog.Description>
        <form className="auth-form" onSubmit={submit} noValidate>
          <fieldset disabled={mutation.isPending || social.isPending}>
            <legend className="sr-only">{register ? 'Dados de cadastro' : 'Dados de acesso'}</legend>
            {register && field('username', 'Nome de usuário', 'text', 'username')}
            {field('email', register ? 'Digite seu e-mail' : 'E-mail', 'email', 'email')}
            {field('password', 'Senha', revealed ? 'text' : 'password', register ? 'new-password' : 'current-password')}
            {register && <><p id="auth-password-policy" className="sr-only">Use pelo menos oito caracteres, incluindo uma letra e um número.</p>{field('confirmPassword', 'Confirmar senha', mobile && confirmRevealed ? 'text' : 'password', 'new-password')}</>}
            {!register && <button type="button" className="auth-forgot" onClick={event => { auxiliaryTrigger.current = event.currentTarget; setAuxiliary('recovery') }}>Esqueceu a senha?</button>}
            {mutation.error && <p className="auth-error" role="alert">{apiMessage(mutation.error)}</p>}
            {Object.values(errors).some(Boolean) && <p className="sr-only" role="alert">Revise os campos indicados.</p>}
            <button type="submit" className="auth-submit">{mutation.isPending ? <><LoaderCircle className="auth-spinner" size={16} />{register ? 'Criando conta…' : 'Entrando…'}</> : register ? mobile ? 'Criar perfil' : 'Criar conta' : 'Entrar'}</button>
          </fieldset>
        </form>
        <div className="auth-divider"><span>Ou continue com</span></div>
        <div className="auth-social"><button type="button" disabled={mutation.isPending} onClick={event => { auxiliaryTrigger.current = event.currentTarget; social.reset(); setAuxiliary('Google') }}><GoogleMark />Continuar com Google</button><button type="button" disabled={mutation.isPending} onClick={event => { auxiliaryTrigger.current = event.currentTarget; social.reset(); setAuxiliary('Facebook') }}><SocialIcon name="Facebook" />Continuar com Facebook</button></div>
        <p className="mobile-auth-switch">{register ? 'Já tem uma conta? ' : 'Novo na Kurio? '}<Link to={register ? '/login' : '/cadastro'} search={search} aria-disabled={mutation.isPending || social.isPending} onClick={event => { if (mutation.isPending || social.isPending) event.preventDefault() }}>{register ? 'Entre' : 'Crie uma conta'}</Link></p>
    <Dialog.Root open={!!auxiliary} onOpenChange={open => { if (!open && !social.isPending) setAuxiliary(null) }}><Dialog.Portal><Dialog.Overlay className="auth-aux-overlay" /><Dialog.Content className="auth-aux-dialog" onCloseAutoFocus={event => { event.preventDefault(); auxiliaryTrigger.current?.focus() }}>
      <Dialog.Close className="auth-close" aria-label="Fechar informações de acesso" disabled={social.isPending}><X size={18} /></Dialog.Close>
      <Dialog.Title>{auxiliary === 'recovery' ? 'Recuperar acesso' : 'Continuar com ' + auxiliary}</Dialog.Title>
      <Dialog.Description>{auxiliary === 'recovery' ? 'Esta demonstração não envia e-mails de recuperação. As credenciais fictícias para teste estão no README do projeto.' : 'Acesso social simulado. Escolha uma conta fictícia; nenhuma conta externa será conectada.'}</Dialog.Description>
      {auxiliary === 'recovery' ? <Button onClick={() => setAuxiliary(null)}>Voltar ao login</Button> : accounts.isPending ? <p role="status">Carregando contas…</p> : accounts.isError ? <Button variant="outline" onClick={() => void accounts.refetch()}>Tentar novamente</Button> : <div className="auth-social-accounts">{accounts.data.items.map(account => <Button key={account.id} variant="outline" disabled={social.isPending} onClick={() => { if (auxiliary === 'Google' || auxiliary === 'Facebook') social.mutate({ provider: auxiliary, account: account.id }, { onSuccess: () => void complete() }) }}>{social.isPending ? 'Entrando…' : account.name}</Button>)}</div>}
      {social.error && <p role="alert" className="auth-error">{apiMessage(social.error)}</p>}
    </Dialog.Content></Dialog.Portal></Dialog.Root>
      </Dialog.Content>
    </Dialog.Portal></Dialog.Root>
  </>
}
export function LoginPage() { return <AuthScreen mode="login" /> }
export function RegisterPage() { return <AuthScreen mode="register" /> }
