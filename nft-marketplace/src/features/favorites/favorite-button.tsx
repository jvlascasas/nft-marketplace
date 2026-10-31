import { useIsMutating, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Sheet, SheetClose } from '../../components/ui/sheet'
import { Button } from '../../components/ui/button'
import type { Nft } from '../catalog/contracts'
import type { Session } from '../checkout/contracts'
import { apiMessage, sessionKey, sessionOptions } from '../checkout/api'
import { favoritesOptions, useFavoriteMutation } from './api'

export function FavoriteButton({ nft, className = '', label = false }: { nft: Nft; className?: string; label?: boolean }) {
  const session = useQuery(sessionOptions)
  const userId = session.data?.user?.id ?? ''
  const favorites = useQuery({ ...favoritesOptions(userId), enabled: !!userId })
  const mutation = useFavoriteMutation(userId, nft.id)
  const pending = useIsMutating({ mutationKey: ['favorites', userId, nft.id] }) > 0
  const client = useQueryClient()
  const navigate = useNavigate()
  const selected = !!userId && !!favorites.data?.items.some(item => item.id === nft.id)
  const text = selected ? 'Remover dos favoritos' : 'Favoritar'
  const contents = <><img src={'/mobile-icons/' + (selected ? 'heart.png' : 'heart-outline.png')} width={20} height={18} alt="" aria-hidden="true" />{label && <span>{selected ? 'Favoritado' : 'Favoritar'}</span>}</>
  const style = 'favorite-button ' + className
  if (!session.isPending && !session.isError && !userId) return <Sheet title="Entre para salvar favoritos" description="Continue com sua conta de colecionador." trigger={<button type="button" className={style} aria-label={'Favoritar ' + nft.name} aria-pressed={false}>{contents}</button>}>
    <div className="account-prompt"><h2>{nft.name}</h2><p>Seus favoritos ficam vinculados à sua conta.</p><SheetClose><Button asChild><Link to="/login" search={{ redirect: '/lista-de-interesse?adicionar=' + encodeURIComponent(nft.id) }}>Entrar para continuar</Link></Button></SheetClose></div>
  </Sheet>
  const error = mutation.error ?? favorites.error ?? session.error
  return <span className={'favorite-control ' + (label ? 'favorite-control-labeled' : '')}>
    <button type="button" className={style} aria-label={text + ' ' + nft.name} aria-pressed={selected} aria-busy={pending} disabled={session.isPending || (!!userId && favorites.isPending) || pending} onClick={() => {
      if (session.isError) { void session.refetch(); return }
      if (favorites.isError) { void favorites.refetch(); return }
      mutation.mutate(!selected, { onSuccess: () => {
        if (!selected && client.getQueryData<Session>(sessionKey)?.user?.id === userId) void navigate({ to: '/lista-de-interesse', search: {} })
      } })
    }}>{contents}</button>
    {error && <span role="alert" className="favorite-error">{apiMessage(error)} Clique no coração para tentar novamente.</span>}
  </span>
}
