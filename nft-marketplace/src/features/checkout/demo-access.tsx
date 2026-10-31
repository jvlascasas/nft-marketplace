import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useRouterState } from '@tanstack/react-router'
import { safeReturnTo } from '../auth/contracts'
import { Button } from '../../components/ui/button'
import { demoAccountsOptions, useDemoLogin, apiMessage } from './api'

export function DemoAccess({ onComplete }: { onComplete?: () => void }) {
  const accounts = useQuery(demoAccountsOptions)
  const login = useDemoLogin()
  const [account, setAccount] = useState('')
  return <div className="demo-access">
    <p>Use uma conta fictícia para testar o pagamento. Nenhuma extensão ou carteira real será conectada.</p>
    {accounts.isPending ? <p role="status">Carregando contas…</p> : accounts.isError ? <Button variant="outline" onClick={() => void accounts.refetch()}>Recarregar contas</Button> : <>
      <label htmlFor="demo-account">Conta de demonstração</label>
      <select id="demo-account" value={account || accounts.data.items[0]?.id} onChange={event => setAccount(event.target.value)} disabled={login.isPending}>{accounts.data.items.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
      <Button disabled={login.isPending} onClick={() => login.mutate(account || accounts.data.items[0].id, { onSuccess: onComplete })}>{login.isPending ? 'Entrando…' : 'Continuar com conta de demonstração'}</Button>
    </>}
    {login.error && <p role="alert">{apiMessage(login.error)}</p>}
  </div>
}
export function CheckoutAccess() {
  const location = useRouterState({ select: state => state.location.href })
  const redirect = safeReturnTo(location)
  return <section className="checkout-access"><h1>Entre para continuar</h1><p>Seu carrinho está salvo. Acesse uma conta para revisar e finalizar o pedido.</p><div className="flex flex-wrap gap-3"><Button asChild><Link to="/login" search={{ redirect }}>Entrar com e-mail e senha</Link></Button><Button asChild variant="outline"><Link to="/cadastro" search={{ redirect }}>Criar conta</Link></Button></div><DemoAccess /></section>
}
