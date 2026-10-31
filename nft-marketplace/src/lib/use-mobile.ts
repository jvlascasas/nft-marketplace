import { useSyncExternalStore } from 'react'

const query = '(max-width: 640px)'
function subscribe(onChange: () => void) {
  const media = matchMedia(query)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
export function useMobile() { return useSyncExternalStore(subscribe, () => matchMedia(query).matches, () => false) }
