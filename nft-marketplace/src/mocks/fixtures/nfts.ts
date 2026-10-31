import { categories, networks, type Nft } from '../../features/catalog/contracts'

const names = [
  'Emerald Ape #042', 'Sage Nomad #009', 'Neon Vessel #552',
  'Cosmic Bloom #118', 'Violet Nomad #314', 'Ivory Baron #088',
  'Golden Beat #207', 'Golden Echo #096', 'Golden Signal #160',
  'Mint Wanderer #021', 'Velvet Orbit #303', 'Amber Soul #071',
  'Forest Keeper #080', 'Silent Wave #016', 'Electric Muse #121',
  'Copper Dream #040', 'Lunar Nomad #206', 'Jade Rhythm #017',
  'Emerald Vision #104', 'Sage Journey #077', 'Neon Horizon #250',
  'Cosmic Path #092', 'Violet Reverie #013', 'Ivory Muse #411',
  'Golden Frequency #090', 'Golden Hour #019', 'Golden Memory #054',
  'Mint Horizon #088', 'Velvet Echo #115', 'Amber Orbit #007',
  'Forest Bloom #210', 'Silent Motion #081', 'Electric Soul #059',
  'Copper Light #064', 'Lunar Garden #321', 'Jade Signal #093',
]
const prices = ['1.19', '1.69', '1.99', '1.29', '1.39', '1.79', '0.99', '0.79', '0.39', '2.10', '0.25', '3.75']
const creators = ['Studio Verde', 'Sage Collective', 'Neon Studio', 'Cosmic Lab']
const tones = ['sage', 'ivory', 'mint', 'ivory', 'ivory', 'mint', 'sand', 'sand', 'sand'] as const

const artworkByTone = {
  sage: '/nfts/emerald-ape.webp',
  ivory: '/nfts/sage-nomad.webp',
  mint: '/nfts/ivory-baron.webp',
  sand: '/nfts/golden-beat.webp',
} as const
export const nftFixtures: Nft[] = names.map((name, index) => ({
  id: name.toLowerCase().replace(/ #/g, '-').replace(/ /g, '-'),
  name,
  creator: creators[index % creators.length],
  category: categories[index % categories.length].id,
  network: networks[index % networks.length],
  price: prices[index % prices.length],
  ...(index === 2 ? { previousPrice: '2.29', badge: 'RARO' } : {}),
  image: artworkByTone[tones[index % tones.length]],
  tone: tones[index % tones.length],
  available: index === 0 ? 3 : index === 4 ? 8 : index === 5 ? 10 : index === 17 ? 0 : 1 + index % 8,
  isNew: index % 3 === 0,
  popularity: (index * 37 + 59) % 100,
  listedAt: new Date(Date.UTC(2026, 9, 30 - index)).toISOString(),
  version: 1,
}))
