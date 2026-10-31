import { editionsFor } from './inventory'
import { http, HttpResponse } from 'msw'
import type { NftDetailResponse } from '../features/catalog/detail-contracts'
import { getNfts } from './inventory-state'
import { simulateNetwork } from './scenarios'

export const detailHandlers = [
  http.get('/api/nfts/:nftId', async ({ request, params }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const nft = getNfts().find(item => item.id === params.nftId)
    if (!nft) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Este NFT não foi encontrado.' }, { status: 404 })
    const token = nft.name.split('#')[1]
    const reviewAuthors = ['Marina Costa', 'Lucas Almeida', 'Beatriz Santos', 'Rafael Lima', 'Camila Rocha']
    const reviewTexts = ['Uma peça cheia de personalidade. Os detalhes da arte são incríveis.', 'Adorei as cores e a identidade da coleção.', 'Uma ótima adição à minha coleção digital.']
    const related = (indices: number[]) => indices.map(index => getNfts()[index]).filter(item => item.id !== nft.id)
    return HttpResponse.json<NftDetailResponse>({
      nft,
      gallery: Array.from({ length: 4 }, (_, index) => ({ id: 'view-' + (index + 1), src: nft.image, alt: nft.name + ' — imagem ' + (index + 1) })),
      editions: editionsFor(nft),
      defaultEditionId: 'fifty',
      about: 'Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores.',
      mobileAbout: 'Um colecionável digital 1/50 finalizado à mão da coleção Kurio Editions, verificado na ' + nft.network + '.',
      description: [
        nft.name + ' é uma obra digital 1/50 finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na ' + nft.network + '. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.',
        'A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.',
      ],
      tokenId: '#' + token?.padStart(4, '0'),
      collectionName: 'Kurio Apes',
      attributes: nft.tone === 'sage' ? ['Óculos', 'Esmeralda', 'Raro'] : nft.tone === 'ivory' ? ['Chapéu', 'Violeta', 'Raro'] : nft.tone === 'mint' ? ['Terno', 'Marfim', 'Raro'] : ['Fone', 'Dourado', 'Raro'],
      networkDescription: 'Cunhada na ' + nft.network + ' com procedência imutável e metadados armazenados no IPFS.',
      contract: '0x7A42...19E8 · Contrato inteligente ERC-721 verificado.',
      royalties: 'Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.',
      rating: '4.8',
      reviews: Array.from({ length: 19 }, (_, index) => ({
        id: 'review-' + (index + 1),
        author: reviewAuthors[index % reviewAuthors.length],
        rating: index % 5 === 0 ? 4 : 5,
        text: reviewTexts[index % reviewTexts.length],
        date: '2026-09-' + String(28 - index).padStart(2, '0'),
      })),
      related: [
        related([0, 1, 2, 3, 4, 5]).slice(0, 5),
        related([3, 4, 5, 6, 8, 7]).slice(0, 5),
        related([9, 10, 11, 12, 13, 14]).slice(0, 5),
      ],
    })
  }),
]
