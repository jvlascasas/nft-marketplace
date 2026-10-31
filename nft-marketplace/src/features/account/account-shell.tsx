import { type ReactNode } from 'react'
import { Link, useNavigate, useRouterState, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CircleHelp, Download, Heart, LogOut, ShoppingBag, UserRound, Wallet, Activity } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { InfoAction } from '../../components/info-action'
import { apiMessage, sessionOptions, useLogout } from '../checkout/api'
import { safeReturnTo, type AuthSearch } from '../auth/contracts'

export function AccountSidebar({ section }: { section: 'profile' | 'wallets' | 'favorites' }) {
  const logout = useLogout()
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as AuthSearch
  return <aside className="account-sidebar"><h2>Meu perfil</h2><nav aria-label="Menu da conta">
    <Link to="/perfil" search={search} className={section === 'profile' ? 'selected' : ''} aria-current={section === 'profile' ? 'page' : undefined}><UserRound size={16} />Dados do perfil</Link>
    <Link to="/carteiras" search={search} className={section === 'wallets' ? 'selected' : ''} aria-current={section === 'wallets' ? 'page' : undefined}><Wallet size={16} />Carteiras</Link>
    <InfoAction title="Atividade"><Activity size={16} />Atividade</InfoAction>
    <Link to="/lista-de-interesse" search={{}} className={section === 'favorites' ? 'selected' : ''} aria-current={section === 'favorites' ? 'page' : undefined}><Heart size={16} />Lista de interesse</Link>
    {[{ label: 'Ofertas', icon: ShoppingBag }, { label: 'Arquivos baixados', icon: Download }, { label: 'Suporte', icon: CircleHelp }].map(item => <InfoAction key={item.label} title={item.label}><item.icon size={16} />{item.label}</InfoAction>)}
  </nav><button className="account-signout" disabled={logout.isPending} onClick={() => logout.mutate(undefined, { onSuccess: () => void navigate({ to: '/', search: {} }) })}><LogOut size={16} />{logout.isPending ? 'Saindo…' : 'Sair'}</button>{logout.error && <p role="alert">{apiMessage(logout.error)}</p>}</aside>
}
export function AccountShell({ section, children }: { section: 'profile' | 'wallets' | 'favorites'; children: ReactNode }) {
  const search = useSearch({ strict: false }) as AuthSearch
  return <div className="account-layout"><AccountSidebar section={section} /><div className="account-content">{search.redirect && <Link className="account-return" to={safeReturnTo(search.redirect)}>Voltar ao pagamento</Link>}{children}</div></div>
}
export function AccountLoading() {
  return <div className="account-layout" aria-busy="true"><Skeleton className="h-[400px] w-full" /><div><Skeleton className="mb-8 h-6 w-60" /><div className="account-fields">{[0, 1, 2, 3, 4, 5].map(index => <Skeleton className="h-16 w-full" key={index} />)}</div><Skeleton className="mt-6 h-72 w-1/2" /></div><span role="status" className="sr-only">Carregando sua conta…</span></div>
}
export function AccountAccess() {
  const href = useRouterState({ select: state => state.location.href })
  return <section className="account-access"><h1>Entre para acessar sua conta</h1><p>Acesse seu perfil, suas carteiras e sua lista de interesse.</p><Button asChild><Link to="/login" search={{ redirect: safeReturnTo(href) }}>Entrar para continuar</Link></Button></section>
}
export function AccountGate({ children }: { children: (userId: string) => ReactNode }) {
  const session = useQuery(sessionOptions)
  if (session.isPending) return <AccountLoading />
  if (session.isError) return <section className="account-access" role="alert"><h1>Não foi possível consultar sua sessão</h1><Button onClick={() => void session.refetch()}>Tentar novamente</Button></section>
  if (!session.data.user) return <AccountAccess />
  return children(session.data.user.id)
}
