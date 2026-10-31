const icons = {
  home: { file: 'home.png', width: 20, height: 20 },
  heart: { file: 'heart.png', width: 20, height: 18 },
  filter: { file: 'filter.png', width: 22, height: 22 },
  explore: { file: 'explore.png', width: 27, height: 24 },
  shop: { file: 'shop.svg', width: 20, height: 20 },
  user: { file: 'user.svg', width: 20, height: 20 },
} as const

export function MobileIcon({ name }: { name: keyof typeof icons }) {
  const icon = icons[name]
  return <img className="mobile-asset-icon" src={'/mobile-icons/' + icon.file} width={icon.width} height={icon.height} alt="" aria-hidden="true" draggable={false} />
}
