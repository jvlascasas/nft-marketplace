import { Link } from '@tanstack/react-router'
import { useRef, useState, type PointerEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Artwork } from '../../components/artwork'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { curationOptions } from './api'
import { useMobile } from '../../lib/use-mobile'

export function Hero() {
  const curation = useQuery(curationOptions)
  const [slide, setSlide] = useState(0)
  const mobile = useMobile()
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null)
  const highlights = curation.data?.highlights ?? []
  const selected = highlights[slide]
  function startSwipe(event: PointerEvent<HTMLElement>) {
    if (!mobile || event.pointerType !== 'touch' || !event.isPrimary || (event.target as HTMLElement).closest('a, button')) return
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
  }
  function finishSwipe(event: PointerEvent<HTMLElement>) {
    const start = gesture.current
    gesture.current = null
    if (!start || start.id !== event.pointerId || highlights.length < 2) return
    const horizontal = event.clientX - start.x
    const vertical = event.clientY - start.y
    if (Math.abs(horizontal) >= 40 && Math.abs(horizontal) > Math.abs(vertical) * 1.3) {
      setSlide(current => (current + (horizontal < 0 ? 1 : -1) + highlights.length) % highlights.length)
    }
  }
  return <section className="hero" aria-label="Destaques" onPointerDown={startSwipe} onPointerUp={finishSwipe} onPointerCancel={() => { gesture.current = null }}>
    <div className="hero-copy">
      <p className="hero-eyebrow">Bem-vindo à Kurio</p>
      <h1><span className="hero-desktop-title">SEJA DONO DO FUTURO<br />DA ARTE DIGITAL</span><span className="hero-mobile-title">SEJA DONO DA<br />CULTURA DIGITAL</span></h1>
      <p className="hero-description hero-desktop-description">Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e torne-se uma parte da cultura da internet.</p>
      <p className="hero-description hero-mobile-description">Descubra NFTs selecionados de criadores do mundo todo.</p>
      <Button asChild className="hero-cta"><Link to="/mercado" search={{}}>EXPLORAR <ArrowRight size={16} aria-hidden="true" /></Link></Button>
      <div className="hero-pagination">
        <div className="hero-dots" aria-label="Selecionar destaque">
          {highlights.map((nft, index) => <button key={nft.id} aria-label={'Destaque ' + (index + 1) + ': ' + nft.name} aria-pressed={slide === index} onClick={() => setSlide(index)}><span /></button>)}
        </div>
        {highlights.length > 1 && <div className="hero-arrows"><button className="icon-button" aria-label="Destaque anterior" onClick={() => setSlide((slide + highlights.length - 1) % highlights.length)}><ArrowLeft size={16} /></button><button className="icon-button" aria-label="Próximo destaque" onClick={() => setSlide((slide + 1) % highlights.length)}><ArrowRight size={16} /></button></div>}
      </div>
    </div>
    <div className="hero-art" aria-busy={curation.isPending}>
      {curation.isPending ? <><Skeleton className="aspect-square w-full rounded-3xl" /><span className="sr-only">Carregando destaque…</span></> : curation.isError ? <div className="hero-error"><p>Não foi possível carregar o destaque.</p><Button variant="outline" onClick={() => void curation.refetch()}>Tentar novamente</Button></div> : selected && <><Artwork nft={selected} priority /><p className="hero-caption" aria-live="polite">{selected.name}<span>EDIÇÃO SELECIONADA</span></p></>}
    </div>
  </section>
}
