import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { safeReturnTo } from '../auth/contracts'
import { Heart, LogIn, UserRound, Wallet } from 'lucide-react'
import { profileOptions } from '../account/api'
import { AccountAvatar } from '../account/avatar'
import { SheetClose } from '../../components/ui/sheet'
import { Button } from '../../components/ui/button'
import { Sheet } from '../../components/ui/sheet'
import { sessionOptions, useLogout, apiMessage } from './api'
import { MobileIcon } from '../../components/mobile-icon'

export function SessionControl({ compact = false }: { compact?: boolean }) {
  const session = useQuery(sessionOptions)
  const profile = useQuery({ ...profileOptions(session.data?.user?.id ?? ''), enabled: !!session.data?.user })
  const logout = useLogout()
  const navigate = useNavigate()
  const location = useRouterState({ select: state => state.location.href })
  const redirect = safeReturnTo(location)
  if (!session.data?.user) return <Button asChild className={'login-button' + (compact ? ' mobile-account-button' : '')}><Link to="/login" search={redirect === '/' ? {} : { redirect }} data-auth-trigger>{compact ? <MobileIcon name="user" /> : <LogIn size={16} strokeWidth={1.5} />}<span className={compact ? 'sr-only' : undefined}>Entrar</span></Link></Button>
  return <Sheet title="Sua conta" description={session.data.user.name} trigger={<Button className={'login-button' + (compact ? ' mobile-account-button' : '')}>{profile.data?.profile.avatar ? <AccountAvatar className="account-menu-avatar" avatar={profile.data.profile.avatar} name={session.data.user.name} /> : compact ? <MobileIcon name="user" /> : <UserRound size={16} />}<span className={compact ? 'sr-only' : undefined}>Conta</span></Button>}>
    <p className="mt-8 text-muted-foreground">{session.data.user.email}</p>
    <nav className="account-menu-links" aria-label="Navegação da conta"><SheetClose><Link to="/perfil"><UserRound size={18} />Dados do perfil</Link></SheetClose><SheetClose><Link to="/carteiras"><Wallet size={18} />Carteiras</Link></SheetClose><SheetClose><Link to="/lista-de-interesse" search={{}}><Heart size={18} />Lista de interesse</Link></SheetClose></nav>
    <Button className="mt-6" disabled={logout.isPending} onClick={() => logout.mutate(undefined, { onSuccess: () => void navigate({ to: '/', search: {} }) })}>{logout.isPending ? 'Saindo…' : 'Sair da conta'}</Button>
    {logout.error && <p role="alert">{apiMessage(logout.error)}</p>}
  </Sheet>
}
