import { useId, useState, type SubmitEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { SocialIcon } from './social-icon'
import { InfoAction } from './info-action'

function Newsletter() {
  const id = useId()
  const [notice, setNotice] = useState(false)
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(true)
  }
  return <div className="footer-newsletter">
    <h2>Antecipe-se ao próximo lançamento</h2>
    <form onSubmit={submit}>
      <label htmlFor={id} className="sr-only">Seu e-mail</label>
      <div className="newsletter-input"><input id={id} name="email" type="email" placeholder="Digite seu e-mail..." required aria-describedby={notice ? id + '-notice' : undefined} /><button type="submit">Enviar</button></div>
    </form>
    <p>Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
    {notice && <p id={id + '-notice'} className="newsletter-notice" role="status">A newsletter está indisponível nesta demonstração. Nenhum e-mail foi enviado.</p>}
  </div>
}

export function SiteFooter({ compactOnMobile = false, hideOnMobile = false }: { compactOnMobile?: boolean; hideOnMobile?: boolean }) {
  return <footer className={'site-footer page-width' + (compactOnMobile ? ' cart-route-footer' : '') + (hideOnMobile ? ' mobile-catalog-hidden' : '')}>
    <div className="footer-shell">
      <section className="footer-highlights" aria-label="Para sua coleção">
        {[
          { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
          { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
          { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
        ].map(item => <div className="footer-highlight" key={item.title}><span className="footer-letter" aria-hidden="true">{item.letter}</span><h2>{item.title}</h2><p>{item.text}</p></div>)}
        <Newsletter />
      </section>
      <div className="footer-contact">
        <Link to="/" search={{}} className="brand" aria-label="Kurio, página inicial">KURIO</Link>
        <p>Feito para colecionadores,<br />criadores e cultura</p>
        <span>contato@email.com</span>
        <span>+55 11 4062 8922</span>
      </div>
      <div className="footer-links-grid">
        <nav aria-label="Meu perfil"><h2>Meu perfil</h2><Link to="/perfil">Meu perfil</Link><InfoAction title="Minha coleção">Minha coleção</InfoAction><InfoAction title="Atividade">Atividade</InfoAction><InfoAction title="Estúdio do criador">Estúdio do criador</InfoAction><Link to="/lista-de-interesse" search={{}}>Lista de interesse</Link></nav>
        <nav aria-label="Central de ajuda"><h2>Central de ajuda</h2>{['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'].map(label => <InfoAction key={label} title={label}>{label}</InfoAction>)}</nav>
        <nav aria-label="Coleções"><h2>Coleções</h2>{[
          { id: 'digital-art', label: 'Arte digital' },
          { id: 'photography', label: 'Fotografia' },
          { id: 'music', label: 'Música' },
          { id: '3d-art', label: 'Arte 3D' },
          { id: 'utility', label: 'Utilidade' },
        ].map(category => <Link key={category.id} to="/" search={{ categories: [category.id as 'digital-art' | 'photography' | 'music' | '3d-art' | 'utility'] }} hash="catalogo">{category.label}</Link>)}</nav>
        <div className="footer-social"><h2>Redes sociais</h2><div className="social-buttons">{[
          { name: 'Facebook' }, { name: 'Instagram' }, { name: 'Twitter' }, { name: 'LinkedIn' }, { name: 'YouTube' },
        ].map(({ name }) => <a key={name} href="https://www.linkedin.com/in/joão-victor-las-casas" target="_blank" rel="noopener noreferrer" className="social-button"><SocialIcon name={name} /><span className="sr-only">{name} — LinkedIn de João Victor Las Casas (abre em nova aba)</span></a>)}</div>
          <h2 className="wallets-heading">Carteiras compatíveis</h2><p className="wallet-badges">METAMASK · WALLETCONNECT · COINBASE</p>
        </div>
      </div>
    </div>
    <p className="footer-copyright">© 2026 Kurio. Propriedade digital para todos.<span className="sr-only"> Ambiente de demonstração, com dados e contatos fictícios.</span></p>
  </footer>
}
