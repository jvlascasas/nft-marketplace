import { controlHandlers } from './control-handlers'
import { favoriteHandlers } from './favorite-handlers'
import { cartHandlers } from './cart-handlers'
import { authHandlers } from './auth-handlers'
import { accountHandlers } from './account-handlers'
import { checkoutHandlers } from './checkout-handlers'
import { checkoutSocketHandler } from './checkout-events'
import { detailHandlers } from './detail-handlers'
import { catalogHandlers } from './catalog-handlers'
import { delay, http, HttpResponse } from 'msw'
import type { SystemStatus } from '../features/system/api'

export const handlers = [...controlHandlers, ...favoriteHandlers, checkoutSocketHandler, ...accountHandlers, ...authHandlers, ...checkoutHandlers, ...cartHandlers, ...catalogHandlers, ...detailHandlers,
  http.get('/api/health', async () => {
    await delay(350)
    return HttpResponse.json<SystemStatus>({ status: 'ok', mode: 'mock' })
  }),
]
