import { setupWorker } from 'msw/browser'
import { lazyHttpHandler } from './lazy-http'
import { checkoutSocketHandler } from './checkout-events'

export const worker = setupWorker(checkoutSocketHandler, lazyHttpHandler)
