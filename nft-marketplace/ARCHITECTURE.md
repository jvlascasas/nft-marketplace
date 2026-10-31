# Arquitetura do Kurio

Este documento descreve a implementação atual. Os comandos de execução, contas fictícias, cenários de falha e reset estão no [README](README.md). Os endpoints e seus payloads estão em [API.md](API.md).

## Organização e fluxo de dados

A aplicação é uma SPA em React e TypeScript. TanStack Router controla rotas e parâmetros; TanStack Query controla consultas e mutations; Axios transporta as chamadas REST. MSW intercepta a rede e executa a simulação no navegador.

```text
Interface React → TanStack Query → Axios → handlers MSW → stores e fixtures
                         ↑                      ↓
                reconciliação REST ← eventos Socket.IO
```

Os componentes não importam fixtures ou stores de mocks. Consultas recebem AbortSignal, e sucessos de negócio dependem da resposta da API simulada. Os handlers validam novamente dados, sessão, estoque e cotação antes de gravar.

| Diretório | Responsabilidade |
| --- | --- |
| `src/app` | Router, QueryClient e layout compartilhado |
| `src/features/catalog` | Início, catálogo, filtros e detalhes |
| `src/features/cart` | Carrinho, cupom e revalidação de cotação |
| `src/features/checkout` | Pagamento, tentativa idempotente, recibo e conexão de eventos |
| `src/features/auth` | Login, cadastro e sincronização de sessão |
| `src/features/account` | Perfil, senha, avatar e carteiras |
| `src/features/favorites` | Favoritos e Lista de interesse |
| `src/components` | Componentes compartilhados e primitivas locais shadcn/ui |
| `src/mocks` | Handlers REST/Socket.IO, persistência, cenários e fixtures |
| `tests/e2e` | Fluxos, falhas, acessibilidade e comparações visuais |
| `scripts` | Execução de testes, assets e auditoria Lighthouse |

## Rotas e estado da URL

As rotas são `/`, `/mercado`, `/nfts/$nftId`, `/carrinho`, `/pagamento`, `/pedidos/$orderId`, `/login`, `/cadastro`, `/perfil`, `/carteiras` e `/lista-de-interesse`. Mercado apresenta o frame de Detalhes do NFT; o detalhe por ID permite abrir outras obras diretamente. Rotas desconhecidas oferecem recuperação por uma página 404.

Busca, categorias, redes, preços, aba, ordenação e paginação pertencem à URL. Valores inválidos são normalizados; conjuntos são ordenados e deduplicados. Alterar filtro reinicia a página. Refresh e histórico reconstroem a seleção. O texto da busca e os preços digitados permanecem como rascunhos até o envio.

O filtro de preço usa dois ranges nativos, arraste e teclado. A escala visual tem 1.000 posições e começa em 0–10 ETH, ampliando-se para valores maiores digitados. O limite superior representa ausência de teto. Valores digitados e enviados à API conservam até 18 casas decimais.

Login e Cadastro preservam um `redirect` interno validado. Destinos externos, barras invertidas, caracteres de controle e ciclos entre as próprias rotas de autenticação são recusados. Após autenticar, a navegação usa replace. Perfil, carteiras e favoritos usam AccountGate; checkout e pedidos verificam a sessão antes de montar dados privados. Os endpoints também exigem autenticação.

## Consultas, cache e mutations

| Recurso | Chave principal |
| --- | --- |
| Catálogo | `['nfts', 'list', parametrosNormalizados, view]` |
| Curadoria | `['nfts', 'curation']` |
| Detalhe | `['nfts', 'detail', nftId]` |
| Carrinho ativo | `['cart', 'active']` |
| Sessão | `['session']` |
| Perfil | `['profile', userId]` |
| Carteiras editáveis | `['wallets', userId, 'settings']` |
| Conexão da carteira | `['wallet-connection', userId]` |
| Favoritos | `['favorites', userId]` |
| Pedido | `['orders', userId, orderId]` |

A política geral usa staleTime de 30 segundos, coleta após cinco minutos sem observadores e revalidação ao focar a janela. Há até uma tentativa adicional de consulta para erro de rede/5xx; HTTP 4xx não é repetido. Mutations não têm retry automático. Sessão e favoritos desabilitam retry de consulta; a sessão usa staleTime de dez segundos e consulta periódica de 30 segundos.

AbortSignal cancela consultas obsoletas. Chaves distintas impedem que uma resposta de filtros anteriores substitua a seleção atual. Skeletons aparecem na primeira carga e em seleções sem cache; dados conhecidos podem permanecer durante a atualização, acompanhados de status acessível.

O carrinho usa uma chave ativa compartilhada. A troca de sessão cancela consultas e remove todos os caches privados, incluindo essa chave. Mutations de carrinho e configurações conferem o proprietário ativo antes de escrever respostas no cache. Chaves de perfil, carteiras, favoritos e pedidos incluem o usuário.

As mutations de carrinho compartilham uma scope para serialização no cliente. A remoção de item é otimista: guarda snapshot, remove a linha e restaura o estado em falhas. Totais ficam em skeleton durante a mutation. Um conflito HTTP 409 provoca nova consulta. Favoritos aguardam confirmação REST antes de preencher o coração e descartam respostas com versão anterior à já conhecida.

## Sessão, contas e armazenamento

A sessão fictícia dura uma hora e persiste após refresh. Cadastro e login transferem o carrinho do visitante para a conta; linhas equivalentes usam a maior quantidade, evitando duplicação da seleção. A transferência esvazia o carrinho visitante. Logout remove a conexão da carteira e o cache privado. Expiração retorna acesso anônimo, preservando dados persistidos e rascunhos por usuário para a retomada.

As contas de demonstração são João Moreira e Ana Araújo. IDs técnicos antigos permanecem estáveis para preservar a propriedade dos dados. A migração altera apenas valores padrão antigos, sem reescrever personalizações ou snapshots de pedidos.

Contas persistem em `kurio:mock-accounts:v1`; senhas usam PBKDF2/SHA-256, salt aleatório de 16 bytes, 210.000 iterações e resultado de 256 bits. A senha em claro não é persistida. Auth mutations têm gcTime zero, e MSW não registra esses requests no console. Web Crypto requer localhost ou HTTPS.

| Estado | Persistência da simulação |
| --- | --- |
| Sessão | localStorage, `kurio:mock-session:v1` |
| Carrinho | localStorage, chave visitante e sufixo de usuário |
| Perfil e credenciais | localStorage, registro da conta |
| Carteiras e favoritos | localStorage, chaves por usuário |
| Inventário | localStorage, `kurio:mock-inventory:v1` |
| Pedidos e idempotência | localStorage, `kurio:mock-orders:v1` |
| Conexão da carteira | sessionStorage, chave por usuário |
| Rascunho e tentativa de checkout | sessionStorage, chaves por usuário |

Inventário é compartilhado entre as contas e abas da mesma origem no navegador. Compras confirmadas reduzem o estoque, e atualizar a página não o restaura. Outros navegadores e dispositivos têm sua própria simulação. A edição única já começa esgotada nas fixtures. O reset documentado remove também contas criadas e pedidos.

BroadcastChannel comunica mudanças de sessão, conta e favoritos. A aba de origem ignora sua própria mensagem; outras abas reconciliam os recursos por REST. Não são transmitidas senhas ou payloads completos de perfil nesse canal.

## Carrinho, valores e cupons

O mock persiste identidade do NFT, edição, quantidade, versão e cupom. Preço, estoque e totais são reconstruídos a partir do inventário atual. A soma das edições do mesmo NFT não pode ultrapassar seu estoque. Adicionar é um upsert de quantidade mínima; alterações explícitas usam PATCH com versão.

Valores ETH trafegam como strings decimais e são calculados com BigInt em wei. Quantidades são inteiras. Comparações, descontos e totais não dependem de ponto flutuante. A exibição conserva a precisão e usa vírgula decimal.

A taxa de rede é **0,06% sobre o subtotal após desconto**, antes de somar a própria taxa:

```text
desconto = subtotal × percentualDoCupom / 100
base = subtotal − desconto
taxa = base × 6 / 10000
total = base + taxa
```

As divisões são inteiras em wei; frações menores que um wei são truncadas. Carrinho vazio tem taxa zero. KURIO10 reduz o subtotal em 10%; JVLasCasas Aprovado reduz em 50%, e a taxa é recalculada sobre a base menor. Cupons não se acumulam. O carrinho inicial de 26,83 ETH tem taxa de 0,016098 ETH e total de 26,846098 ETH. Com 50%, o total é 13,423049 ETH.

## Checkout, carteira e pedido

O pagamento aguarda perfil e carteiras da conta para preencher os campos. O rascunho guarda uma referência dos valores automáticos: dados que o usuário não editou podem ser atualizados a partir da conta, enquanto alterações manuais, inclusive campos esvaziados, são preservadas.

As carteiras são fictícias, pertencem à conta e têm redes compatíveis. Trocar rede, carteira ou provedor invalida a conexão anterior. Aprovar, recusar ou desconectar passa pela API. A rede de liquidação é Ethereum ou Polygon; não há bridge nem conversão dos ativos informativos do catálogo. Todos os preços continuam em ETH.

Confirmar compra valida o formulário e consulta `/api/quote`. Mudanças em estoque, preço, cupom ou taxa exigem nova revisão. `quote.revision` identifica a cotação; o servidor confere versão do carrinho, revision e total. A conexão também é verificada novamente antes de criar o pedido.

Cada tentativa recebe uma chave aleatória de idempotência, persistida com o payload antes do POST. O mock associa usuário, chave, conteúdo e pedido. Repetir o mesmo envio recupera a operação; reutilizar a chave com outro conteúdo retorna conflito. Guards síncronos e o estado de mutation bloqueiam cliques repetidos.

Após timeout, o cliente consulta `/orders/by-attempt/:key`; não cria automaticamente outra compra. Um 404 definitivo libera nova revisão. Falha de rede mantém a tentativa para recuperação. O pedido nasce pending e termina confirmed ou declined. O instante de resolução é persistido, permitindo recuperação após refresh.

Confirmação remove apenas as quantidades compradas e reduz o inventário uma única vez. Recusa preserva itens. O recibo usa snapshots de itens, preços, desconto, taxa, carteira e colecionador. Mudanças posteriores no catálogo ou na regra de taxa não alteram recibos antigos. O explorador informa que a transação é simulada e permite copiar seu ID.

## Tempo real e reconexão

O provider global mantém uma conexão Socket.IO para a sessão atual, incluindo visitante. O transporte é WebSocket em `/kurio-events/`, interceptado por `ws.link` do MSW e adaptado com `@mswjs/socket.io-binding`. O cliente é importado depois da ativação do MSW para usar o transporte interceptado. Não é necessário um servidor externo.

`nft.updated` contém eventId, nftId e version; `order.updated` contém eventId, orderId, userId e version. Os mocks persistem a mudança antes de emitir. A UI invalida consultas e recebe o estado atualizado por REST, sem setters chamados diretamente pelos mocks.

O cliente compara a versão recebida com versões conhecidas no cache e na conexão. Duplicatas e eventos antigos são descartados; eventos de pedido de outro usuário também. A troca de sessão desativa callbacks anteriores, remove listeners e desconecta o socket.

Após reconexão, recursos ativos de catálogo, carrinho, favoritos e pedidos da conta são reconciliados por REST. A conexão inicial envia as versões de inventário alteradas para cobrir dados já presentes no cache. Pedidos pendentes têm polling REST de recuperação a cada 1,2 segundo; pedidos terminais deixam de fazer polling.

Um canal BroadcastChannel interno aos mocks representa o servidor compartilhado entre abas. Ele entrega os eventos pelo Socket.IO de cada aba; não escreve no cache React. O controle de testes permite atualização de inventário, replay de versões e desconexão temporária, mantendo REST e eventos na mesma simulação.

## Perfil, avatar e carteiras

Perfil e senha são validados antes de uma única gravação da conta. Há unicidade de e-mail e username, versão para detectar conflito e verificação da senha atual. Avatar aceita PNG/JPEG/WebP, até 512 KB e 4096 px, com validação de decodificação na camada MSW. É armazenado como data URL; não existe serviço externo de upload.

A conta começa com carteira principal. A secundária pode ser cadastrada ou vinculada à principal pela opção explícita correspondente. Atualizações usam a versão do conjunto, invalidam a conexão e sincronizam o apelido com o perfil. Se outra aba modifica dados, rascunhos são preservados e conflitos exigem recarga explícita.

## CSS, responsividade e acessibilidade

`src/index.css` é a única entrada de estilos. Ela declara fontes, tokens, base e a ordem dos arquivos de componentes e funcionalidades. As páginas não importam CSS durante a navegação. Assim, abrir uma rota privada não introduz novas regras na cascata da página seguinte.

Layout compartilhado, arte, navegação mobile, rodapé, filtros, hero, cards e catálogo têm arquivos próprios. Os arquivos de cada funcionalidade mantêm a base e os ajustes de breakpoint; regras repetidas do mesmo seletor no mesmo contexto foram consolidadas. Estilos específicos usam classes do componente ou da página. Tailwind atende utilitários e primitivas; CSS local descreve as composições do Figma.

O breakpoint de 640 px ativa as composições mobile. Outros breakpoints reduzem colunas e espaçamentos conforme o componente; conta usa transições próprias para sidebar e formulários. As larguras principais de verificação são 390, 768 e 1440 px.

Acessibilidade inclui landmarks, link de salto, labels, erros associados, foco visível e status de mutations/eventos. Diálogos Radix contêm e devolvem o foco e fecham por Escape. Skeletons reservam dimensões, usam shimmer e respeitam movimento reduzido. O carrossel tem controles rotulados, não usa autoplay e aceita gesto horizontal no mobile, preservando rolagem vertical e pinch zoom.

## Figma, assets e decisões de UX

Referência: [Frontend Challenge no Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge).

- As quatro artes fornecidas estão no projeto. Os PNGs originais foram preservados e versões WebP são usadas para reduzir download. Obras adicionais reutilizam essas artes nas fixtures. Assets indisponíveis têm placeholders proporcionais; nenhuma arte foi gerada.
- A fonte local é Roboto Mono. A equivalência exata com a fonte do arquivo de referência não foi confirmada.
- Proporções de banners e artigos são 288:250 e 268:196. A galeria repete a arte frontal fornecida; não inventa outros ângulos.
- O mobile mostra somente a arte maior no destaque e não oferece favorito nesse banner. Favoritos de catálogo e detalhes levam à Lista de interesse da conta.
- O mock prioriza os mesmos itens e quantidades de carrinho em todos os tamanhos, mesmo quando os frames ilustram dados diferentes. Contagens e totais vêm dos dados reais da simulação.
- Código de indicação e avatar são opcionais. Labels, controles de preço, áreas de toque e ajustes de contraste complementam a composição visual para permitir operação acessível.
- No mobile, o pagamento abre os dados completos em diálogo e mostra um resumo compacto. O carrinho permite aplicar cupom; o recibo apresenta os valores detalhados.
- Google usa o token fornecido e abre acesso social simulado. Todos os ícones sociais do rodapé abrem o LinkedIn informado pelo autor; o favicon usa a logo Jungle Gaming fornecida.
- Editorial, suporte, atividade e newsletter não têm backend. Ações auxiliares informam seus limites e não confirmam envios inexistentes.

## Testes, auditoria e publicação

Playwright inicia seu próprio Vite no global setup e encerra o servidor no teardown. Cada teste usa um contexto isolado. A suíte cobre fluxos, falhas, persistência, conflitos, teclado, screenshots e eventos pelo cliente Socket.IO. Um teste de navegação verifica que visitar Perfil e Carteiras e voltar ao Início não altera sua apresentação, inclusive após refresh. Os testes de acessibilidade usam axe; reflow equivalente a 200% também possui cenários próprios. Ter um teste escrito não significa que a versão final foi homologada: o relatório da execução deve acompanhar a entrega.

A configuração Lighthouse prevê três medições de Início e Detalhe nos perfis mobile e desktop, com build otimizado e mocks ativos. HTML/JSON, medianas, LCP, CLS, TBT, versões e condições ficam em `reports/lighthouse`. Diagnósticos de uma execução ficam separados em `work/lighthouse-diagnostic` e não substituem as 12 medições finais. As metas continuam sendo 90/95/95/90 para Performance/Acessibilidade/Boas práticas/SEO.

O build mantém os recursos da demonstração, fontes locais e imagens. A compressão Brotli é gerada em writeBundle, depois que o Vite finaliza os arquivos e resolve seus marcadores de preload. O preview negocia esses arquivos `.br`. `npm run test:preview` verifica a igualdade dos assets descomprimidos e exercita o build em três tamanhos, incluindo uma compra e refresh do recibo. A hospedagem pública precisa ser validada com sua própria configuração de compressão e rotas.

O deploy ainda não foi realizado. `vercel.json` define instalação, build, diretório de saída e fallback da SPA para Vercel. A entrega exige repositório remoto e URL pública correspondentes ao mesmo código, com HTTPS, mocks habilitados e fallback da SPA para acesso direto/refresh. Depois da publicação, devem ser verificados login, favoritos, compra, recibo e eventos nessa URL. Os links serão registrados no README quando existirem.

## Limitações conhecidas

A simulação não oferece autenticação de produção, blockchain, OAuth real, envio de e-mail ou pagamento real. localStorage é editável pelo visitante e não substitui um banco ou um limite de segurança. Web Locks serializa as operações críticas entre abas quando disponível; o fallback é local ao contexto. Gravações em múltiplos recursos não têm transação de banco.

A organização por funcionalidades ainda tem acoplamentos: sessão e contratos compartilhados ficam no módulo de checkout, e alguns stores de mocks têm dependências circulares. Esses pontos merecem uma refatoração específica, separada da consolidação de estilos. A validação final da suíte, as medianas Lighthouse e o deploy devem ser conferidos antes de declarar o desafio integralmente concluído.
