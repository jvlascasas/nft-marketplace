import { useId, useRef, useState, type PointerEvent, type SubmitEvent } from 'react'
import { Button } from '../../components/ui/button'
import { ethToWei, formatEth, isEth, weiToEth } from '../../lib/eth'
import { categories, networks, type CatalogParams, type CatalogResponse, type CatalogSearch } from './contracts'

interface Props {
  params: CatalogParams
  facets?: CatalogResponse['facets']
  onChange: (patch: CatalogSearch) => void
}

function PriceFilter({ params, onChange }: Pick<Props, 'params' | 'onChange'>) {
  const id = useId()
  const [min, setMin] = useState(params.minPrice)
  const [max, setMax] = useState(params.maxPrice)
  const [error, setError] = useState('')
  const unit = 10n ** 18n
  function price(value: string) { const normalized = value.replace(',', '.').trim(); return isEth(normalized) ? ethToWei(normalized) : 0n }
  const [extent, setExtent] = useState(() => [price(params.minPrice), price(params.maxPrice)].reduce((limit, value) => value > limit ? ((value + unit - 1n) / unit) * unit : limit, 10n * unit))
  const dragging = useRef<'min' | 'max' | null>(null)
  const lowerControl = useRef<HTMLInputElement>(null)
  const upperControl = useRef<HTMLInputElement>(null)
  const lowerTick = Number(price(min) * 1000n / extent)
  const upperTick = max.trim() ? Number(price(max) * 1000n / extent) : 1000
  function edit(bound: 'min' | 'max', value: string) {
    if (bound === 'min') setMin(value); else setMax(value)
    const amount = price(value)
    setExtent(current => amount > current ? ((amount + unit - 1n) / unit) * unit : current)
    setError('')
  }
  function slide(bound: 'min' | 'max', position: number) {
    const tick = Math.max(0, Math.min(1000, Math.round(position)))
    const limited = bound === 'min' ? Math.min(tick, upperTick) : Math.max(tick, lowerTick)
    edit(bound, bound === 'max' && limited === 1000 ? '' : weiToEth(extent * BigInt(limited) / 1000n).replace('.', ','))
  }
  function trackPosition(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return (event.clientX - rect.left) / rect.width * 1000
  }
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const lower = min.replace(',', '.').trim()
    const upper = max.replace(',', '.').trim()
    if ((lower && !isEth(lower)) || (upper && !isEth(upper))) {
      setError('Use um preço positivo com até 18 casas decimais.')
      return
    }
    if (lower && upper && ethToWei(lower) > ethToWei(upper)) {
      setError('O mínimo deve ser menor ou igual ao máximo.')
      return
    }
    setError('')
    onChange({ minPrice: lower, maxPrice: upper })
  }
  return <form onSubmit={submit} className="price-filter" noValidate>
    <h3>Faixa de preço</h3>
    <div className="price-track" onPointerDown={event => {
      if (event.target instanceof HTMLInputElement) return
      const tick = trackPosition(event)
      const bound = Math.abs(tick - lowerTick) < Math.abs(tick - upperTick) ? 'min' : 'max'
      dragging.current = bound
      event.currentTarget.setPointerCapture(event.pointerId)
      ;(bound === 'min' ? lowerControl : upperControl).current?.focus({ preventScroll: true })
      slide(bound, tick)
    }} onPointerMove={event => { if (dragging.current) slide(dragging.current, trackPosition(event)) }} onPointerUp={() => { dragging.current = null }} onPointerCancel={() => { dragging.current = null }}>
      <span className="price-track-fill" style={{ left: lowerTick / 10 + '%', right: (1000 - Math.max(lowerTick, upperTick)) / 10 + '%' }} />
      <input ref={lowerControl} className={'price-slider price-slider-min' + (lowerTick > 0 ? ' price-slider-front' : '')} type="range" min="0" max="1000" step="1" value={lowerTick} onChange={event => slide('min', Number(event.target.value))} aria-label="Preço mínimo na faixa" aria-valuetext={formatEth(weiToEth(price(min))) + ' ETH'} />
      <input ref={upperControl} className="price-slider" type="range" min="0" max="1000" step="1" value={Math.max(lowerTick, upperTick)} onChange={event => slide('max', Number(event.target.value))} aria-label="Preço máximo na faixa" aria-valuetext={max.trim() ? formatEth(weiToEth(price(max))) + ' ETH' : 'Sem limite'} />
    </div>
    <p className="filter-help">Valores em ETH</p>
    <div className="price-inputs">
      <div><label htmlFor={id + '-min'}>Mínimo</label><input id={id + '-min'} value={min} onChange={event => edit('min', event.target.value)} inputMode="decimal" placeholder="0,00" aria-invalid={!!error} aria-describedby={error ? id + '-error' : undefined} /></div>
      <div><label htmlFor={id + '-max'}>Máximo</label><input id={id + '-max'} value={max} onChange={event => edit('max', event.target.value)} inputMode="decimal" placeholder="Sem limite" aria-invalid={!!error} aria-describedby={error ? id + '-error' : undefined} /></div>
    </div>
    {error && <p className="field-error" id={id + '-error'} role="alert">{error}</p>}
    <Button type="submit" className="mt-3 min-h-9 px-4">Aplicar preço</Button>
  </form>
}

export function Filters({ params, facets, onChange }: Props) {
  return <div className="filters">
    <fieldset><legend>Coleções</legend>
      {categories.map(category => <label className="filter-option" key={category.id}>
        <input type="checkbox" checked={params.categories.includes(category.id)} onChange={event => onChange({ categories: event.target.checked ? [...params.categories, category.id] : params.categories.filter(item => item !== category.id) })} />
        <span>{category.label}</span><span className="filter-count" aria-hidden="true">{facets ? '(' + facets.categories[category.id] + ')' : ''}</span>
      </label>)}
    </fieldset>
    <PriceFilter key={params.minPrice + ':' + params.maxPrice} params={params} onChange={onChange} />
    <fieldset><legend>Rede</legend>
      {networks.map(network => <label className="filter-option" key={network}>
        <input type="checkbox" checked={params.networks.includes(network)} onChange={event => onChange({ networks: event.target.checked ? [...params.networks, network] : params.networks.filter(item => item !== network) })} />
        <span>{network}</span><span className="filter-count" aria-hidden="true">{facets ? '(' + facets.networks[network] + ')' : ''}</span>
      </label>)}
    </fieldset>
  </div>
}
