# Contratos REST e eventos

Todas as chamadas da interface passam pelo cliente Axios com baseURL /api, timeout de 10 segundos e AbortSignal da consulta TanStack Query. MSW intercepta os endpoints no navegador.

## GET /api/nfts

Query string:

| Parâmetro | Tipo / valores |
| --- | --- |
| q | Texto de até 80 caracteres; procura nome e criador, ignorando acentos e caixa |
| categories | Lista de IDs separada por vírgulas |
| networks | Lista Ethereum, Polygon, Solana separada por vírgulas |
| minPrice / maxPrice | String decimal não negativa em ETH, até 18 casas |
| sort | recent, price-asc, price-desc, popular |
| tab | all, new, trending |
| page | Inteiro de 1 a 1000 |
| view | desktop (padrão) ou mobile; integra a chave de cache da lista |

Categorias: digital-art, photography, music, 3d-art, collectibles, generative, games, memberships, utility.

Filtros de dimensões diferentes usam AND. Valores da mesma dimensão usam OR. A faixa é inclusiva. A aba new exige isNew; trending exige popularidade >= 60. Critérios empatados usam desempate estável por identidade. A página contém até nove NFTs.

Na apresentação mobile inicial (sem filtros, aba all e ordenação recent), a API prioriza Emerald Ape, Sage Nomad, Neon Vessel e Golden Beat, como no frame. Os demais itens continuam paginados sem duplicação. Buscas, filtros e ordenações explícitas por preço/popularidade mantêm os critérios normais. Nft pode incluir badge para o selo editorial do card.

A URL da interface usa a serialização tipada do TanStack Router (arrays JSON). O adaptador catalogQuery converte esses valores para o contrato REST acima. Valores inválidos são normalizados para defaults seguros.

Exemplo:

```json
{
  "items": [{
    "id": "emerald-ape-042",
    "name": "Emerald Ape #042",
    "creator": "Studio Verde",
    "category": "digital-art",
    "network": "Ethereum",
    "price": "1.19",
    "image": "/nfts/emerald-ape.webp",
    "tone": "sage",
    "available": 1,
    "isNew": true,
    "popularity": 59,
    "listedAt": "2026-10-30T00:00:00.000Z",
    "version": 1
  }],
  "total": 36,
  "page": 1,
  "pageSize": 9,
  "totalPages": 4,
  "facets": {
    "categories": { "digital-art": 4 },
    "networks": { "Ethereum": 12 }
  }
}
```

O exemplo de facets foi abreviado: a resposta contém contagens globais de todas as categorias e redes, independentemente da seleção. image=null instrui o componente a exibir um placeholder quadrado. previousPrice é opcional. Quantidades são inteiras. Prices permanecem strings em transporte, cache e interface.

Uma página acima do total retorna items vazio, com o total real preservado; a interface oferece retorno ao catálogo inicial.

## GET /api/curation

Retorna { highlights: Nft[], spotlight: Nft, collectors: Nft[] }. Todos os itens derivam das mesmas fixtures do catálogo, preservando identidade, preço, disponibilidade e versão.

## GET /api/health

Retorna 200 com { "status": "ok", "mode": "mock" }. Endpoint técnico usado para verificar os mocks no build de demonstração.

## Erros disponíveis

422 VALIDATION quando minPrice excede maxPrice. 503 UNAVAILABLE no cenário http-error. Falha de conexão no cenário network-error.

Formato de erro HTTP: { code: string, message: string }. Não há retorno de sucesso falso no cliente quando a simulação falha.

Os contratos de detalhe, carrinho, sessão de demonstração, pedidos e eventos estão descritos nas seções a seguir; as APIs de conta e favoritos estão documentadas ao final.

## GET /api/nfts/:nftId

Retorna NftDetailResponse (src/features/catalog/detail-contracts.ts): nft, gallery, editions, defaultEditionId, about, mobileAbout, description, tokenId, collectionName, attributes, networkDescription, contract, royalties, rating, reviews e related. mobileAbout fornece a descrição compacta do frame mobile.

Cada edição contém id, label, price (string decimal) e available (inteiro). A opção unique está esgotada no cenário padrão; as demais respeitam a disponibilidade do catálogo. gallery contém quatro referências à arte original. related possui três páginas de até cinco itens, sem repetir o próprio NFT.

404 NOT_FOUND quando a identidade não existe. As condições de rede configuradas em nft-marketplace:scenario também se aplicam ao detalhe (slow, http-error e network-error). A seleção de edição e quantidade é local à ficha; Comprar chama a API do carrinho. Favoritos persistem por conta nos endpoints documentados abaixo.

## Carrinho e cotação

Todas as respostas de carrinho usam CartResponse (src/features/cart/contracts.ts): version, items e quote. Cada item contém id estável NFT:edição, nft, editionId, editionLabel, quantity, available, unitPrice e lineTotal. quote contém revision, cartVersion, subtotal, discount, networkFee, networkFeePercent, total e coupon. networkFeePercent é opcional nos snapshots históricos. Valores ETH são strings decimais; quantidades e versões são inteiros.

| Endpoint | Operação |
| --- | --- |
| GET /api/cart | Consulta itens e cotação atual |
| POST /api/cart/items | Upsert com {nftId, editionId, quantity}; garante ao menos a quantidade selecionada, sem duplicar a mesma seleção |
| PATCH /api/cart/items/:itemId | Define {quantity, version} |
| DELETE /api/cart/items/:itemId | Remove o item; corpo {version} |
| POST /api/cart/coupon | Aplica {code, version} |
| DELETE /api/cart/coupon | Remove cupom; corpo {version} |
| POST /api/quote | Revalida inventário/preço/cupom/taxa e retorna o CartResponse atual |
| GET /api/cart/recommendations | Retorna {pages: Nft[][]}, três páginas de cinco itens |

Exemplo inicial de quote: {cartVersion:1, subtotal:"26.83", discount:"0", networkFee:"0.016098", networkFeePercent:"0.06", total:"26.846098", coupon:null}. KURIO10 produz discount:"2.683" e networkFee:"0.0144882" e total:"24.1614882" nesse cenário. Cupons não são acumuláveis. Remover o último item também remove o cupom.

Erros: 422 VALIDATION, INVALID_COUPON, COUPON_EXPIRED ou EMPTY_CART; 404 NOT_FOUND; 409 CART_CONFLICT, EDITION_UNAVAILABLE ou STOCK_CONFLICT; 503 UNAVAILABLE/STORAGE_UNAVAILABLE. Versões obsoletas não são aplicadas. Falhas preservam os dados persistidos e o cliente restaura a remoção otimista. O catálogo, o detalhe e o carrinho compartilham o mesmo inventário e a mesma definição de edições.


## Sessão de demonstração e carteiras

| Endpoint | Contrato |
| --- | --- |
| GET /api/demo-accounts | {items:[{id,name,email}]} com João Moreira e Ana Araújo |
| GET /api/session | {user:{id,name,email} ou null, expiresAt:string ou null} |
| POST /api/session/demo | {account:string}; estabelece sessão de demonstração por uma hora, preservando carrinho do visitante |
| DELETE /api/session | Encerra sessão/conexão; retorna sessão anônima |
| GET /api/wallets | Privado: WalletSettings {version,items:ManagedWallet[]}; campos completos na seção de carteiras |
| GET /api/wallet-connection | Privado: conexão atual ou null |
| POST /api/wallets/:walletId/connect | {approved:boolean,network,provider}; retorna {id,walletId,network,provider} |
| DELETE /api/wallet-connection | Desconecta; retorna {connected:false} |

Providers: WalletConnect, MetaMask, Coinbase Wallet. Redes de liquidação simulada: Ethereum, Polygon. Erros: 401 UNAUTHORIZED/SESSION_CHANGED, 404 NOT_FOUND, 422 CONNECTION_REJECTED/NETWORK_MISMATCH/VALIDATION. Login/cadastro com credenciais e acesso social também estão disponíveis; /session/demo é um atalho de demonstração.

## Cupom JVLasCasas Aprovado

POST /api/cart/coupon aceita o código e o persiste com a grafia canônica. A comparação ignora caixa e espaços nas extremidades. CartQuote.coupon contém {code,percent,appliesTo}; aplica-se um único cupom.

- KURIO10: percent=10, appliesTo=subtotal.
- JVLasCasas Aprovado: percent=50, appliesTo=total (o total final também cai pela metade, pois a taxa é proporcional ao valor após desconto).

Exemplo com o carrinho inicial: {subtotal:"26.83",discount:"13.415",networkFee:"0.008049",networkFeePercent:"0.06",total:"13.423049",coupon:{code:"JVLasCasas Aprovado",percent:50,appliesTo:"total"}}. O recibo conserva esse snapshot. Toda aritmética permanece em wei/BigInt.

A taxa de rede de novos pedidos é `(subtotal - discount) * 6 / 10000`, calculada em wei com BigInt. Frações inferiores a um wei são truncadas. Carrinho vazio tem taxa zero. Recibos anteriores preservam a cotação registrada na compra.

## Pedidos

POST /api/orders exige sessão e header Idempotency-Key (16–100 caracteres alfanuméricos/traços).

Body CheckoutInput:

~~~ts
{
  collector: {
    displayName: string, username: string, profileName: string, email: string,
    walletAddress: string, secondaryAddress: string, referralCode: string,
    ensName: string, note: string
  },
  walletId: string,
  network: 'Ethereum' | 'Polygon',
  provider: 'WalletConnect' | 'MetaMask' | 'Coinbase Wallet',
  connectionId: string,
  cartVersion: number,
  quoteRevision: string,
  total: string
}
~~~

O servidor valida dados, sessão, carteira cadastrada/conectada, rede, disponibilidade e a cotação atual. Retorna Order com id, userId, version, status, createdAt, transactionId, network, provider, wallet, collector, items, quote e declineReason. Items/quote/wallet/collector são snapshots. A primeira resposta é pending; confirmed e declined são terminais.

| Endpoint | Operação |
| --- | --- |
| POST /api/orders | Cria uma tentativa idempotente ou recupera o pedido existente da mesma chave/conteúdo |
| GET /api/orders/:orderId | Consulta privada e reconciliação do status/recibo |
| GET /api/orders/by-attempt/:key | Recupera a tentativa após timeout ou refresh, sem criar compra |

A mesma chave com payload diferente retorna 409 IDEMPOTENCY_CONFLICT. Cotação alterada retorna 409 QUOTE_CHANGED; estoque insuficiente, 409 STOCK_CONFLICT; carteira desconectada, 409 WALLET_DISCONNECTED. Outros erros: 401, 404, 422 e 503. Pedido de outra conta retorna 404.

Sucesso confirma após 1,8 s; payment-declined recusa no mesmo prazo. order-pending aguarda 60 s. order-timeout persiste o pedido e adia apenas a resposta HTTP por 11 s, permitindo testar o timeout Axios de 10 s e a recuperação por GET.

Na confirmação, apenas as quantidades compradas saem do carrinho e do inventário. Recusa não remove itens. O recibo não é reconstruído a partir dos preços atuais do catálogo.

## Eventos Socket.IO

Transporte websocket, path /kurio-events/, interceptado pelo MSW com @mswjs/socket.io-binding. Não existe conexão blockchain ou servidor Socket.IO externo.

- order.updated: {eventId:string,orderId:string,userId:string,version:number}.
- nft.updated: {eventId:string,nftId:string,version:number}.

O cliente aceita somente eventos compatíveis com a sessão e versões mais recentes; reconcilia o recurso por REST. A conexão inicial transmite versões de inventário alteradas; a reconexão invalida recursos ativos e provoca reconciliação REST. Pedidos pendentes têm polling REST de recuperação a cada 1,2 s.


## Login e Cadastro

| Endpoint | Requisição | Resposta |
| --- | --- | --- |
| POST /api/session/login | {email,password} | 200 Session |
| POST /api/accounts | {username,email,password,confirmPassword} | 201 Session, com acesso automático |
| POST /api/session/social | {provider:"Google" ou "Facebook",account:demoUserId} | 200 Session fictícia |
| POST /api/session/demo | {account:demoUserId} | Atalho de demonstração preservado para os testes de pagamento |
| DELETE /api/session | Sem corpo | Session anônima |

Session: {user:{id,name,email} ou null,expiresAt:string ou null}. Registro novo usa username como nome público inicial; a edição está disponível no recurso de perfil. Cada identidade tem carteiras e carrinho separados.

Validações: username 3–30 caracteres [a-zA-Z0-9_.-]; e-mail com formato válido e até 254 caracteres; senha 8–128 caracteres, contendo letra e número; confirmação idêntica. Login exige senha não vazia, sem impor novamente a política de criação. E-mail é normalizado com trim/lowercase; senha não é normalizada.

Erros: 422 VALIDATION, 401 INVALID_CREDENTIALS/UNAUTHORIZED, 409 ACCOUNT_CONFLICT/USERNAME_CONFLICT/SESSION_CHANGED e 503 UNAVAILABLE. O formato pode incluir fields:{email?:string,username?:string,password?:string,confirmPassword?:string}, além de code/message. INVALID_CREDENTIALS não revela se o e-mail existe. registration-conflict reproduz o conflito de e-mail deterministicamente.

Não há GET público com hashes/credenciais cadastradas, nem endpoint real de recuperação de senha. As credenciais públicas das duas fixtures estão documentadas no README. Senhas cadastradas persistem apenas como hashes PBKDF2 com salt individual, na camada MSW.


## Perfil e senha

| Endpoint | Contrato |
| --- | --- |
| GET /api/profile | Privado: {profile,session} |
| PATCH /api/profile | Salva campos e senha opcional, com versão; retorna {profile,session} |
| POST /api/profile/password | {version,currentPassword,newPassword,confirmPassword}; retorna {profile,session} |

Profile: {userId,version,displayName,username,email,ensName,walletNickname,avatar}. avatar é data URL PNG/JPEG/WebP ou null. PATCH recebe todos os campos editáveis, version e, opcionalmente, password:{currentPassword,newPassword,confirmPassword}. O proprietário é sempre derivado da sessão; userId no corpo não concede acesso a outra conta.

Validações: displayName 2–80 caracteres; username conforme Cadastro; e-mail até 254; ENS terminado em .eth; apelido até 50; avatar até 512 KB/4096 px e decodificável. Senha atual deve conferir; nova segue 8–128 caracteres com letras/números, diferente da atual e idêntica à confirmação. Sem campos de senha preenchidos, a credencial permanece.

Erros: 401 UNAUTHORIZED/SESSION_CHANGED; 409 PROFILE_CONFLICT/ACCOUNT_CONFLICT/USERNAME_CONFLICT; 422 VALIDATION/INVALID_PASSWORD/INVALID_AVATAR; 503 UNAVAILABLE/STORAGE_UNAVAILABLE. fields relaciona nomes de campos às mensagens. Senha inválida impede salvar os demais campos da mesma tentativa.

## Cadastro e edição de carteiras

GET /api/wallets retorna WalletSettings: {version,items:ManagedWallet[]}. Cada item inclui os campos de Wallet do checkout e displayName,nickname,profileName,email,referralCode,secondaryAddress,provider,network,sameAsPrimary. O cenário inicial tem primary e não tem secondary.

| Endpoint | Contrato |
| --- | --- |
| POST /api/wallets | {version,wallet:ManagedWallet}, para primary/secondary ainda inexistente |
| PATCH /api/wallets/:walletId | {version,wallet:ManagedWallet}, para editar primary/secondary |

Retornam WalletSettings atualizado. A API valida os metadados e restringe carteira/rede a valores suportados. sameAsPrimary=true em secondary usa os valores confirmados da principal e acompanha suas próximas alterações. O cliente não pode usar um ID de carteira arbitrário.

Erros: 401; 404 NOT_FOUND; 409 WALLET_CONFLICT; 422 VALIDATION/DUPLICATE_WALLET; 503. Alterações invalidam a conexão simulada e passam a ser usadas pelo checkout. O apelido da principal é refletido no perfil.

profile-error e wallets-error reproduzem falhas ao salvar configurações. GET continua disponível para confirmar que os dados persistidos não foram alterados.


## Favoritos por conta

Todos os endpoints exigem sessão ativa.

| Endpoint | Resultado |
| --- | --- |
| GET /api/favorites | {version, items: Nft[]} da conta autenticada |
| PUT /api/favorites/:nftId | Adiciona a obra de forma idempotente e devolve a lista atualizada |
| DELETE /api/favorites/:nftId | Remove a obra de forma idempotente e devolve a lista atualizada |

`version` avança somente quando a lista muda. IDs inexistentes retornam 404; sessão ausente ou alterada durante a operação retorna 401. Erros de rede/armazenamento não confirmam inclusões na interface. A persistência guarda IDs por conta, e os itens são resolvidos a partir do inventário atual. Leituras e escritas compartilham o bloqueio da conta para evitar perda de inclusões entre abas.

Após salvar, o cliente emite `favorites.updated` pelo BroadcastChannel local, contendo apenas `userId` e a origem da aba. Outras abas da mesma conta invalidam a consulta e buscam a lista novamente pela API.


## Controle determinístico dos mocks

Disponível com MSW habilitado, para demonstrar eventos e testar recuperação. A interface de produto não depende destes endpoints.

| Endpoint / ação | Contrato |
| --- | --- |
| GET /api/mock/control | Estatísticas de conexões e frames emitidos |
| POST /api/mock/control, action=inventory | {nftId,price?:string,available?:number,copies?:number}; persiste e emite nft.updated |
| POST /api/mock/control, action=replay-nft | {nftId,version,copies?:number}; reenvia versão existente |
| POST /api/mock/control, action=replay-order | {orderId,version,copies?:number}; exige pedido da conta atual |
| POST /api/mock/control, action=disconnect | {durationMs?:number}; interrompe o socket por até 120 segundos |

`copies` aceita 1–10 eventos. `eventId` é estável por recurso/versão: `nft:<id>:<version>` ou `order:<id>:<version>`. Atualizações de inventário e pedido são reconciliadas pelas mesmas rotas REST usadas pela aplicação.
