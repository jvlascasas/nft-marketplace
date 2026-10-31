import { useContext } from 'react'
import { RealtimeContext } from './realtime-context'
export function useMarketplaceRealtime() { return useContext(RealtimeContext) }
export function useCheckoutRealtime(userId: string) {
 const state = useMarketplaceRealtime()
 return state.owner === userId ? state : { ...state, connected: false, updatedOrder: '', inventoryEvent: null }
}
