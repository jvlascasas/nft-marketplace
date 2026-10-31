import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { ChevronLeft, Mail, Minus, Plus, Search, Star, X } from 'lucide-react'
import { Artwork } from '../../components/artwork'
import { InfoAction } from '../../components/info-action'
import { SocialIcon } from '../../components/social-icon'
import { Button } from '../../components/ui/button'
import { FavoriteButton } from '../favorites/favorite-button'
import { Skeleton } from '../../components/ui/skeleton'
import { formatEth } from '../../lib/eth'
import { nftDetailOptions } from './detail-api'
import type { NftDetailResponse } from './detail-contracts'
import { RelatedCollection } from './related-collection'
import { BuyButton } from '../cart/buy-button'
import { useMobile } from '../../lib/use-mobile'
import { MobileIcon } from '../../components/mobile-icon'

function Breadcrumb() {
  return <nav className="detail-breadcrumb" aria-label="Localização"><Link to="/" search={{}}>Início</Link><span aria-hidden="true">/</span><Link to="/mercado" aria-current="page">Mercado</Link></nav>
}

function Gallery({ detail }: { detail: NftDetailResponse }) {
  const [selected, setSelected] = useState(0)
  const image = detail.gallery[selected]
  const art = { ...detail.nft, image: image.src, name: image.alt }
  return <div className="nft-gallery" aria-label="Galeria do NFT">
    <div className="gallery-thumbnails" role="group" aria-label="Selecionar imagem">
      {detail.gallery.map((item, index) => <button key={item.id} aria-label={'Imagem ' + (index + 1) + ' de ' + detail.gallery.length} aria-pressed={selected === index} onClick={() => setSelected(index)}><Artwork nft={{ ...detail.nft, image: item.src, name: item.alt }} /></button>)}
    </div>
    <div className="gallery-main">
      <Artwork nft={art} priority />
      <Dialog.Root>
        <Dialog.Trigger asChild><button className="gallery-zoom" aria-label="Ampliar imagem"><Search size={25} strokeWidth={1.5} /></button></Dialog.Trigger>
        <Dialog.Portal><Dialog.Overlay className="sheet-overlay" /><Dialog.Content className="gallery-lightbox">
          <Dialog.Title className="sr-only">{detail.nft.name}</Dialog.Title><Dialog.Description className="sr-only">Imagem ampliada da obra selecionada.</Dialog.Description>
          <Artwork nft={art} priority /><Dialog.Close className="lightbox-close icon-button" aria-label="Fechar imagem ampliada"><X size={22} /></Dialog.Close>
        </Dialog.Content></Dialog.Portal>
      </Dialog.Root>
    </div>
  </div>
}

function DetailScreen({ detail }: { detail: NftDetailResponse }) {
  const mobile = useMobile()
  const [editionId, setEditionId] = useState(detail.defaultEditionId)
  const [requestedQuantity, setQuantity] = useState(1)
  const [tab, setTab] = useState('details')
  const edition = detail.editions.find(item => item.id === editionId)!
  const quantity = Math.min(requestedQuantity, Math.max(edition.available, 1))
  const nft = detail.nft
  return <div className="detail-page">
    <div className="mobile-detail-toolbar"><Link to="/" search={{}} aria-label="Voltar para Início"><ChevronLeft size={19} strokeWidth={1.5} /></Link><FavoriteButton nft={detail.nft} className="mobile-detail-favorite" /></div>
    <Breadcrumb />
    <section className="nft-detail-layout" aria-label="Informações do NFT">
      <Gallery detail={detail} />
      <div className="nft-purchase-info">
        <div className="detail-heading"><h1>{nft.name}</h1>{mobile && <Dialog.Root><Dialog.Trigger className="mobile-detail-rating" onClick={() => setTab('reviews')} aria-label={detail.rating.replace('.', ',') + ' de 5 estrelas; ' + detail.reviews.length + ' avaliações de colecionadores'}><Star size={13} fill="currentColor" /><span>{detail.rating}</span><span>({detail.reviews.length})</span></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="sheet-overlay" /><Dialog.Content className="mobile-information-dialog"><Dialog.Close className="icon-button mobile-information-close" aria-label="Fechar detalhes e avaliações"><X size={20} /></Dialog.Close><Dialog.Title>Detalhes e avaliações</Dialog.Title><Dialog.Description>Conheça a procedência da obra e a opinião dos colecionadores.</Dialog.Description><DetailInformation detail={detail} tab={tab} setTab={setTab} /><RelatedCollection pages={detail.related} /></Dialog.Content></Dialog.Portal></Dialog.Root>}</div>
        <div className="detail-price-row"><p className="detail-price">{formatEth(edition.price)} ETH</p><button className="review-summary" onClick={() => { setTab('reviews'); document.getElementById('nft-information')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} aria-label={detail.rating.replace('.', ',') + ' de 5 estrelas; ' + detail.reviews.length + ' avaliações de colecionadores'}>
          <span className="rating-stars" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={16} fill="currentColor" strokeWidth={1} />)}</span><span>{detail.reviews.length} avaliações de colecionadores</span>
        </button></div>
        <div className="detail-about"><h2>Sobre este NFT:</h2><p className="desktop-detail-about">{detail.about}</p><p className="mobile-detail-about">{detail.mobileAbout}</p></div>
        <fieldset className="edition-selector"><legend>Edição:</legend><div>{detail.editions.map(item => <button key={item.id} aria-pressed={editionId === item.id} disabled={!item.available} title={!item.available ? 'Edição esgotada' : undefined} onClick={() => { setEditionId(item.id); setQuantity(1) }}>{item.label}{!item.available && <span className="sr-only"> — esgotada</span>}</button>)}</div></fieldset>
        <div className="detail-purchase-row">
          <div className="quantity-control" role="group" aria-label="Quantidade">
            <span className="mobile-quantity-label">Qtd.</span>
            <button aria-label="Diminuir quantidade" disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)}><Minus size={14} /></button>
            <output aria-label="Quantidade selecionada">{quantity}</output>
            <button aria-label="Aumentar quantidade" disabled={quantity >= edition.available} onClick={() => setQuantity(quantity + 1)}><Plus size={14} /></button>
          </div>
          <p className="mobile-purchase-price">{formatEth(edition.price)} ETH</p>
          <div className="detail-purchase-actions"><BuyButton nftId={nft.id} editionId={edition.id} quantity={quantity} disabled={edition.available === 0} /><FavoriteButton nft={detail.nft} className="detail-favorite" label /><Link to="/carrinho" aria-label="Carrinho" className="mobile-detail-cart"><MobileIcon name="shop" /></Link></div>
        </div>
        {edition.available === 0 && <p className="edition-sold-out" role="status">Esta edição está esgotada.</p>}
        <dl className="detail-metadata"><div><dt>ID do token:</dt><dd>{detail.tokenId}</dd></div><div><dt>Coleção:</dt><dd>{detail.collectionName}</dd></div><div><dt>Atributos:</dt><dd>{detail.attributes.join(', ')}</dd></div></dl>
        <div className="detail-share"><span>Compartilhar este NFT:</span><InfoAction title="Compartilhar no LinkedIn"><SocialIcon name="LinkedIn" /><span className="sr-only">LinkedIn</span></InfoAction><InfoAction title="Compartilhar por e-mail"><Mail size={15} /><span className="sr-only">E-mail</span></InfoAction><InfoAction title="Compartilhar no Twitter"><SocialIcon name="Twitter" /><span className="sr-only">Twitter</span></InfoAction></div>
      </div>
    </section>
    {!mobile && <><DetailInformation detail={detail} tab={tab} setTab={setTab} /><RelatedCollection pages={detail.related} /></>}
  </div>
}

function DetailInformation({ detail, tab, setTab }: { detail: NftDetailResponse; tab: string; setTab: (tab: string) => void }) {
  return <Tabs.Root id="nft-information" value={tab} onValueChange={setTab} className="nft-information">
      <Tabs.List className="detail-tabs" aria-label="Informações e avaliações"><Tabs.Trigger value="details">Detalhes do NFT</Tabs.Trigger><Tabs.Trigger value="reviews">Avaliações de colecionadores ({detail.reviews.length})</Tabs.Trigger></Tabs.List>
      <Tabs.Content value="details" className="detail-tab-content">
        {detail.description.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        <dl className="detail-provenance"><div><dt>Rede:</dt><dd>{detail.networkDescription}</dd></div><div><dt>Contrato:</dt><dd>{detail.royalties}</dd></div><div><dt>Direitos autorais:</dt><dd>{detail.contract}</dd></div></dl>
      </Tabs.Content>
      <Tabs.Content value="reviews" className="detail-tab-content review-list">
        {detail.reviews.map(review => <article key={review.id}><div><h3>{review.author}</h3><span aria-label={review.rating + ' de 5 estrelas'}>{'★'.repeat(review.rating)}</span></div><p>{review.text}</p><time dateTime={review.date}>{review.date.split('-').reverse().join('/')}</time></article>)}
      </Tabs.Content>
    </Tabs.Root>
}

export function NftDetailPage({ nftId }: { nftId: string }) {
  const detail = useQuery(nftDetailOptions(nftId))
  if (detail.isPending) return <div className="detail-page" aria-busy="true"><Breadcrumb /><p className="sr-only" role="status">Carregando NFT…</p><div className="nft-detail-layout detail-skeleton"><Skeleton className="aspect-square w-full" /><div><Skeleton className="mb-4 h-9 w-3/4" /><Skeleton className="mb-6 h-7 w-1/3" /><Skeleton className="mb-4 h-24 w-full" /><Skeleton className="mb-6 h-10 w-3/4" /><Skeleton className="h-20 w-full" /></div></div><Skeleton className="mt-24 h-64 w-full" /></div>
  if (detail.isError) {
    const missing = isAxiosError(detail.error) && detail.error.response?.status === 404
    return <section className="stage-page"><h1>{missing ? 'NFT não encontrado' : 'Não foi possível carregar o NFT'}</h1><p>{missing ? 'A obra não está disponível neste endereço.' : 'Verifique sua conexão e tente novamente.'}</p>{!missing && <Button onClick={() => void detail.refetch()}>Tentar novamente</Button>}<Button asChild variant="outline" className="ml-3"><Link to="/" search={{}}>Voltar ao início</Link></Button></section>
  }
  return <DetailScreen key={detail.data.nft.id} detail={detail.data} />
}
