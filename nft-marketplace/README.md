# Kurio — Marketplace de NFTs

Projeto do desafio frontend de marketplace de NFTs, feito em React e TypeScript a partir dos layouts do Figma. A aplicação permite explorar o catálogo, favoritar obras, montar o carrinho, concluir uma compra simulada e gerenciar a conta do colecionador.

APIs, autenticação, carteiras, pagamentos e eventos são simulados com MSW. Não é necessário conectar uma extensão de carteira ou contratar um backend para executar o projeto.

## Rodando pela primeira vez

Use Node.js 24 e npm. Na raiz do projeto, execute:

```sh
npm ci
npm run test:install
npm run dev
```

O último comando mantém o servidor aberto. Acesse o endereço mostrado pelo Vite; para executar outros comandos, abra outro terminal.

`test:install` baixa o Chromium usado nos testes e no Lighthouse. Os scripts guardam o navegador em `node_modules/.cache/ms-playwright`, sem exigir uma instalação global. É possível escolher outro diretório com `PLAYWRIGHT_BROWSERS_PATH`.

O arquivo `.env` já habilita `VITE_ENABLE_MOCKS=true`. O mesmo valor está em `.env.example` e deve permanecer habilitado no build de demonstração. Nenhuma dessas configurações contém credenciais privadas. Para iniciar explicitamente com mocks, use `npm run dev:mocks`.

Para conferir a versão otimizada:

```sh
npm run build
npm run preview
```

## Contas para testar

| Conta | E-mail | Senha |
| --- | --- | --- |
| João Moreira | joao@kurio.test | Kurio@2026 |
| Ana Araújo | ana@kurio.test | Kurio@2026 |

Também é possível criar uma conta. O cadastro já inicia a sessão e retorna ao fluxo anterior. A sessão dura uma hora e permanece após atualizar a página. Sair ou trocar de conta remove os dados privados do cache; a troca também é reconhecida nas outras abas.

Google e Facebook abrem um seletor de contas de demonstração. A recuperação de senha mostra as orientações de acesso e não envia e-mail. As senhas cadastradas são armazenadas como hashes PBKDF2, com salt individual, na camada de mocks.

## Um roteiro para conhecer a aplicação

1. No Início, combine busca, categorias, redes, faixa de preço e ordenação. Os filtros ficam na URL, inclusive ao atualizar a página ou usar Voltar e Avançar.
2. Abra um NFT ou clique em Mercado. Escolha uma edição, ajuste a quantidade e adicione ao carrinho. Edições esgotadas ficam indisponíveis.
3. Confira o carrinho. É possível alterar quantidades, remover itens e aplicar um cupom. O cenário inicial tem três NFTs e total de **26,846098 ETH**.
4. Clique em **Conectar e finalizar** e entre com uma conta. Se já estiver conectado, o botão mostra **Finalizar**. Os itens do visitante acompanham o login.
5. No pagamento, confira os dados preenchidos a partir da conta, escolha uma carteira e uma rede e autorize a conexão simulada. Revise o pedido antes de finalizar.
6. Aguarde a confirmação. O recibo usa os dados salvos no pedido; uma mudança posterior no catálogo não altera o valor comprado. Em caso de falha, os itens são preservados.

Pelo botão Conta, acesse Perfil, Carteiras e Lista de interesse. O coração de cada NFT salva ou remove o favorito da conta. Quem ainda não entrou pode fazer o login e continuar com a obra escolhida. No mobile, o destaque do Início troca de imagem ao deslizar o dedo e também pelos pontos de navegação.

<details>
<summary>Um detalhe para quem chegou até aqui…</summary>

O cupom **JVLasCasas Aprovado** dá **50% de desconto no total da compra, incluindo a taxa de rede**. Ele funciona no carrinho e no pagamento, permanece após refresh e aparece no recibo. Não é acumulável com outros cupons.

</details>

## Testes e verificações

```sh
npm run typecheck
npm run lint
npm run test:e2e
npm run test:report
npm run test:preview
```

A suíte completa usa Chromium em 390, 768 e 1440 px. Há testes específicos para os frames mobile e desktop; os testes que não se aplicam a um projeto são pulados explicitamente. Os testes de conta também exercitam os formulários em mobile e tablet.

Para executar uma parte:

```sh
npm run test:e2e -- --project=mobile
npm run test:e2e -- tests/e2e/account.spec.ts --project=tablet
npm run test:realtime
npm run test:a11y
```

Cada teste começa em um contexto isolado. Os cenários sensíveis a tempo usam o relógio do Playwright. O Vite dos testes abre na porta 4174 e é encerrado pela própria suíte; o servidor de desenvolvimento pode continuar na porta 5173.

O relatório HTML fica em `playwright-report`. Falhas geram screenshot e trace em `test-results`. Os resultados do axe são anexados aos testes de acessibilidade. As baselines visuais ficam em `tests/e2e/*-snapshots` e foram produzidas no Windows. Uma alteração de layout deve ter suas diferenças revisadas antes de atualizar esses arquivos.

`test:preview` gera o build e abre um preview isolado na porta 4177. Ele confere se os arquivos Brotli reproduzem exatamente os assets finais e testa estilos, imagens, conexão de eventos, compra e refresh do recibo em 390, 768 e 1440 px. Esse teste complementa a suíte E2E e não substitui a verificação da URL publicada.

## Reproduzindo falhas

No Console do navegador, escolha o cenário antes da ação que deseja testar:

```js
localStorage.setItem('nft-marketplace:scenario', 'payment-declined')
```

| Cenário | O que muda |
| --- | --- |
| default | 36 NFTs e latência de 250 ms |
| slow | Latência de 2,5 segundos |
| variable-delay | Buscas curtas demoram mais, permitindo testar respostas fora de ordem |
| http-error / network-error | Erro HTTP 503 ou falha de conexão nas APIs |
| empty / cart-empty | Catálogo vazio ou carrinho inicial vazio |
| cart-error | Recusa alterações no carrinho, incluindo rollback da remoção otimista |
| session-expired | Expira a sessão; restaure default para entrar novamente |
| registration-conflict | Devolve conflito no cadastro |
| profile-error / wallets-error | Recusa alterações de perfil ou carteira |
| wallet-rejected | Recusa a conexão da carteira |
| payment-declined | Recusa o pedido e mantém o carrinho |
| order-timeout | Cria o pedido, interrompe a resposta e permite recuperar a mesma tentativa |
| order-pending | Mantém o pedido pendente por 60 segundos |
| price-changed / stock-changed | Altera preço ou disponibilidade na revalidação da compra |

`KURIO10` dá 10% sobre o subtotal. `INVALIDO` é recusado; `EXPIRADO` e `KURIO2025` representam cupons expirados.

Restaure `default` e tente novamente para sair de um cenário de erro. Mudar o cenário não desfaz uma compra ou uma alteração já salva. `cart-empty` só vale ao criar um carrinho; faça o reset abaixo para voltar ao estado inicial.

## Atualizações em tempo real

Uma conexão Socket.IO acompanha a navegação. Mudanças de preço e estoque atualizam catálogo, detalhe, favoritos e carrinho; uma cotação alterada exige nova revisão do pedido. Eventos repetidos ou antigos são descartados. Após reconectar, as telas consultam a API para recuperar o que mudou durante a interrupção.

Para mudar um NFT enquanto a página está aberta, use o endpoint de controle dos mocks:

```js
await fetch('/api/mock/control', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'inventory',
    nftId: 'emerald-ape-042',
    price: '1.49',
    available: 3,
  }),
})
```

O mesmo endpoint aceita `replay-nft`, `replay-order` e `disconnect`. Os formatos completos estão em `API.md`. Esses controles alteram o servidor simulado e passam pelo cliente Socket.IO; não chamam setters da interface. Eles só existem quando o MSW está habilitado.

## Reset dos dados

Para voltar às contas e ao inventário iniciais, execute no Console:

```js
Object.keys(localStorage)
  .filter(key => key.startsWith('kurio:mock-'))
  .forEach(key => localStorage.removeItem(key))
Object.keys(sessionStorage)
  .filter(key => key.startsWith('kurio:'))
  .forEach(key => sessionStorage.removeItem(key))
localStorage.removeItem('nft-marketplace:scenario')
location.reload()
```

Isso também remove contas criadas, favoritos, avatares, carteiras, pedidos e rascunhos. A recarga encerra conexões e controles temporários da simulação.

## Lighthouse

```sh
npm run audit:lighthouse
```

O comando gera o build e inicia um preview próprio na porta 4176. São três medições de Início e Detalhes em cada perfil, mobile e desktop: **12 medições no total**. Cada medição começa com um perfil novo do Chromium e usa os parâmetros oficiais de throttling do Lighthouse.

Os relatórios HTML e JSON ficam em `reports/lighthouse`. `summary.json` registra todas as notas, medianas, LCP, CLS, TBT, configurações, versões, ambiente e hash do build. O resumo legível está no README dessa pasta. O comando retorna erro se alguma mediana não atingir as metas: Performance 90, Acessibilidade 95, Boas práticas 95 e SEO 90.

Execute a auditoria sem rodar os testes ou outras tarefas pesadas ao mesmo tempo. Para uma investigação rápida, sem substituir os relatórios da entrega:

```sh
npm run audit:lighthouse -- --runs=1 --profile=mobile
```

Os diagnósticos ficam em `work/lighthouse-diagnostic`. As auditorias usam os mesmos mocks, imagens, fontes e fluxos do restante da aplicação.

## Publicação

A aplicação ainda não tem uma URL pública. A configuração local para Vercel está em `vercel.json`: instalação com `npm ci`, build com `npm run build`, saída em `dist` e fallback para que as rotas da SPA aceitem acesso direto e refresh. A configuração segue a [documentação de Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas).

Para publicar:

1. Crie o repositório no GitHub e envie código, lockfile, assets, mocks, testes e baselines. Os arquivos de trabalho, dependências e resultados temporários ficam fora pelo `.gitignore`.
2. Importe esse repositório na Vercel, usando como raiz a pasta que contém `package.json`.
3. Mantenha `VITE_ENABLE_MOCKS=true` no ambiente de build de produção e de preview. A demonstração depende dos handlers REST e Socket.IO do MSW.
4. Depois do deploy, abra diretamente e atualize `/mercado`, `/carrinho`, `/login`, `/perfil` e `/pagamento`. Teste login, favorito, compra e recibo na URL HTTPS publicada, além das atualizações de inventário descritas acima.
5. Registre aqui os links do repositório e da aplicação, junto com os relatórios finais de testes e Lighthouse. Até essa verificação, o passo de entrega permanece aberto.

## Organização e decisões

- `src/features`: catálogo, carrinho, checkout, autenticação, conta e favoritos.
- `src/components`: elementos compartilhados e componentes adaptados de shadcn/ui.
- `src/mocks`: handlers REST, eventos, fixtures e persistência da simulação.
- `src/lib`: cliente Axios, valores em ETH e utilitários.
- `tests/e2e`: fluxos, falhas, acessibilidade e regressão visual.
- `scripts`: execução dos testes, otimização dos assets e auditoria Lighthouse.

Os estilos entram por `src/index.css`, com ordem explícita. Layout, rodapé, navegação e funcionalidades têm suas próprias folhas; novas regras devem ficar no arquivo do componente e no breakpoint correspondente. As páginas não carregam CSS ao navegar.

Os valores em ETH trafegam como strings e são calculados com BigInt em wei. A API é responsável pela cotação e pela confirmação da compra. A chave de idempotência permite recuperar um envio interrompido sem criar outro pedido.

As artes recebidas foram mantidas no projeto; versões WebP reduzem o tamanho de download, e os PNGs originais continuam disponíveis. Imagens não fornecidas usam placeholders proporcionais. As fontes são locais. Nenhuma arte foi gerada para preencher o layout.

Os ajustes de contraste, tamanho dos alvos de toque, foco e reflow estão descritos em `ARCHITECTURE.md`. Os contratos REST e eventos estão em `API.md`. A publicação e os links de entrega serão acrescentados depois do deploy.

A taxa de rede é de **0,06% sobre o valor dos NFTs após os descontos**, antes de acrescentar a própria taxa. Por exemplo, 26,83 ETH em obras geram 0,016098 ETH de taxa e totalizam 26,846098 ETH. O cupom de 50% também reduz essa base e a taxa proporcionalmente. Os cálculos usam wei/BigInt, com descarte de frações menores que 1 wei. Recibos antigos mantêm os valores salvos na compra.
