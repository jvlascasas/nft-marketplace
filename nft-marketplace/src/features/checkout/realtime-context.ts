import { createContext } from 'react'
import type { NftEvent } from './contracts'

export interface RealtimeState { owner: string | null; connected: boolean; updatedOrder: string; inventoryEvent: NftEvent | null; notice: string }
export const RealtimeContext = createContext<RealtimeState>({ owner: null, connected: false, updatedOrder: '', inventoryEvent: null, notice: '' })
