import { expect, test, type Page } from '@playwright/test'

const nftId = 'emerald-ape-042'
async function control(page: Page, body: Record<string, unknown>) {
  return page.evaluate(async body => {
    const response = await fetch('/api/mock/control', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const result = await response.json()
    if (!response.ok) throw new Error(JSON.stringify(result))
    return result
  }, body)
}
async function connected(page: Page) { await expect(page.getByTestId('realtime-connection')).toHaveText('Conexão do marketplace ativa.') }
async function login(page: Page, route = '/pagamento') {
  await page.goto('/login?redirect=' + encodeURIComponent(route))
  const form = page.getByRole('dialog', { name: 'Login', exact: true })
  await form.getByLabel('E-mail', { exact: true }).fill('joao@kurio.test')
  await form.getByLabel('Senha', { exact: true }).fill('Kurio@2026')
  await form.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(form).toBeHidden()
  await connected(page)
}
async function review(page: Page) {
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  const connection = page.getByRole('dialog', { name: 'Conectar Coinbase Wallet', exact: true })
  if (await connection.isVisible()) await connection.getByRole('button', { name: 'Conectar carteira', exact: true }).click()
  else {
    await expect.poll(async () => await connection.isVisible() || await page.getByRole('dialog', { name: 'Revise seu pedido', exact: true }).isVisible()).toBe(true)
    if (await connection.isVisible()) await connection.getByRole('button', { name: 'Conectar carteira', exact: true }).click()
  }
  await expect(page.getByRole('dialog', { name: 'Revise seu pedido', exact: true })).toBeVisible()
}

test('visitante recebe preço pelo Socket.IO; eventos antigos e duplicados não repetem consultas', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-31T12:00:00Z') })
  await page.goto('/')
  await expect(page.getByTestId('nft-card')).toHaveCount(9)
  await connected(page)
  let reads = 0
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/nfts') reads++ })
  await control(page, { action: 'inventory', nftId, price: '1.49', copies: 3 })
  await expect(page.getByTestId('nft-price').first()).toHaveText('1,49 ETH')
  await expect(page.locator('.realtime-notice')).toContainText('atualizados')
  const afterUpdate = reads
  await control(page, { action: 'replay-nft', nftId, version: 1, copies: 3 })
  await control(page, { action: 'replay-nft', nftId, version: 2, copies: 3 })
  await page.clock.runFor(1000)
  expect(reads).toBe(afterUpdate)
  await expect(page.getByTestId('nft-price').first()).toHaveText('1,49 ETH')
  const stats = await page.evaluate(async () => (await fetch('/api/mock/control')).json())
  expect(stats.frames.nft).toBeGreaterThanOrEqual(9)
  expect(stats.connections).toBe(1)
})

test('detalhe atualiza preço e esgotamento sem recarregar', async ({ page }) => {
  await page.goto('/mercado'); await connected(page)
  await control(page, { action: 'inventory', nftId, price: '1.49', available: 0 })
  await expect(page.locator((page.viewportSize()!.width <= 640) ? '.mobile-purchase-price' : '.detail-price')).toHaveText('1,49 ETH')
  await expect(page.getByRole('button', { name: page.viewportSize()!.width <= 640 ? 'Comprar NFT' : 'COMPRAR', exact: true })).toBeDisabled()
  await expect(page.getByText('Esta edição está esgotada.', { exact: true })).toBeVisible()
})

test('carrinho recebe preço e disponibilidade enquanto está aberto', async ({ page }) => {
  await page.goto('/carrinho'); await connected(page)
  await expect(page.getByTestId('cart-total')).toHaveText('26,846098 ETH')
  await control(page, { action: 'inventory', nftId, price: '1.49', available: 1 })
  await expect(page.getByTestId('cart-total')).toHaveText('27,446578 ETH')
  await expect(page.getByTestId('cart-item').first().getByRole('button', { name: /Aumentar quantidade/ })).toBeDisabled()
  await expect(page.locator('.realtime-notice')).toContainText('disponibilidade')
})

test('revisão aberta exige nova confirmação após mudar a cotação pelo socket', async ({ page }) => {
  await login(page); await review(page)
  await control(page, { action: 'inventory', nftId, price: '1.49' })
  await expect(page.getByRole('dialog', { name: 'Revise seu pedido', exact: true })).toBeHidden()
  await expect(page.locator('.checkout-notice')).toContainText('cotação mudou')
  await expect(page.getByTestId('checkout-total')).toHaveText('27,446578 ETH')
  await review(page)
  await expect(page.getByRole('dialog', { name: 'Revise seu pedido', exact: true })).toContainText('27,446578 ETH')
})

test('reconexão recupera por REST a atualização perdida enquanto o socket esteve fora', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-31T12:00:00Z') })
  await page.goto('/carrinho'); await connected(page)
  await control(page, { action: 'disconnect', durationMs: 4000 })
  await expect(page.locator('.realtime-notice')).toContainText('interrompida')
  await control(page, { action: 'inventory', nftId, price: '1.59' })
  await expect(page.getByTestId('cart-total')).toHaveText('26,846098 ETH')
  await page.clock.runFor(7000)
  await page.clock.resume()
  await connected(page)
  await expect(page.getByTestId('cart-total')).toHaveText('27,646698 ETH')
})

test('pedido pendente sobrevive à desconexão e eventos antigos não desfazem confirmação', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-31T12:00:00Z') })
  await login(page); await review(page)
  await page.evaluate(() => localStorage.setItem('nft-marketplace:scenario', 'order-pending'))
  await page.getByRole('button', { name: 'Finalizar pedido', exact: true }).click({ clickCount: 2 })
  await expect(page.getByRole('heading', { name: 'Seu pedido está em processamento', exact: true })).toBeVisible()
  const url = page.url(); const orderId = new URL(url).pathname.split('/').at(-1)!
  await control(page, { action: 'disconnect', durationMs: 70_000 })
  await page.clock.runFor(72_000)
  await page.clock.resume()
  await connected(page)
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira', exact: true })).toBeVisible()
  const total = await page.getByTestId('receipt-total').textContent()
  await control(page, { action: 'replay-order', orderId, version: 1, copies: 3 })
  await control(page, { action: 'replay-order', orderId, version: 2, copies: 3 })
  await page.clock.runFor(1000)
  await expect(page.getByTestId('receipt-total')).toHaveText(total!)
  expect(page.url()).toBe(url)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kurio:mock-orders:v1')!).length)).toBe(1)
  await page.reload()
  await expect(page.getByTestId('receipt-total')).toHaveText(total!)
})

test('mock de servidor propaga atualização entre abas sem subscriptions duplicadas', async ({ page, context }) => {
  await page.goto('/'); await connected(page)
  const other = await context.newPage(); await other.goto('/mercado'); await connected(other)
  await control(page, { action: 'inventory', nftId, price: '1.39' })
  await expect(other.locator(other.viewportSize()!.width <= 640 ? '.mobile-purchase-price' : '.detail-price')).toHaveText('1,39 ETH')
  await other.goto('/carrinho'); await connected(other)
  expect((await other.evaluate(async () => (await fetch('/api/mock/control')).json())).connections).toBe(1)
})
