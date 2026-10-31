import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { AccountGate, AccountShell } from '../account/account-shell'
import { apiMessage, sessionKey } from '../checkout/api'
import type { Session } from '../checkout/contracts'
import { NftCard } from '../catalog/nft-card'
import { Button } from '../../components/ui/button'
import { MobileHomeNavigation } from '../../components/mobile-home-navigation'
import { favoritesOptions, useFavoriteMutation } from './api'

function FavoritesScreen({ userId }: { userId: string }) {
  const { adicionar } = useSearch({ from: '/lista-de-interesse' })
  const favorites = useQuery(favoritesOptions(userId))
  const mutation = useFavoriteMutation(userId, adicionar ?? '')
  const attempted = useRef('')
  const navigate = useNavigate()
  const client = useQueryClient()
  const add = () => mutation.mutate(true, { onSuccess: () => {
    if (client.getQueryData<Session>(sessionKey)?.user?.id === userId) void navigate({ to: '/lista-de-interesse', search: {}, replace: true })
  } })
  useEffect(() => {
    if (adicionar && favorites.isSuccess && attempted.current !== adicionar) { attempted.current = adicionar; add() }
  })
  return <div className="favorites-page"><AccountShell section="favorites">
    <Link className="favorites-back" to="/" search={{}}><ChevronLeft size={20} />Voltar para Início</Link>
    <h1>Lista de interesse</h1><p className="favorites-intro">Seus NFTs favoritos, reunidos em um só lugar.</p>
    {mutation.isPending && <p role="status">Salvando seu favorito…</p>}
    {mutation.error && <div role="alert"><p>{apiMessage(mutation.error)}</p><Button onClick={add}>Tentar salvar novamente</Button><Button variant="outline" onClick={() => { mutation.reset(); void navigate({ to: '/lista-de-interesse', search: {}, replace: true }) }}>Cancelar</Button></div>}
    {favorites.isPending ? <p role="status">Carregando favoritos…</p> : favorites.isError ? <div role="alert"><p>{apiMessage(favorites.error)}</p><Button onClick={() => void favorites.refetch()}>Tentar novamente</Button></div> : favorites.data.items.length ? <div className="favorites-grid">{favorites.data.items.map(nft => <NftCard key={nft.id} nft={nft} />)}</div> : !mutation.isPending && !adicionar && <div className="favorites-empty"><h2>Sua lista ainda está vazia</h2><p>Toque no coração de um NFT para guardá-lo aqui.</p><Button asChild><Link to="/" hash="catalogo" search={{}}>Explorar NFTs</Link></Button></div>}
  </AccountShell><MobileHomeNavigation /></div>
}
export function FavoritesPage() { return <AccountGate>{userId => <FavoritesScreen key={userId} userId={userId} />}</AccountGate> }
