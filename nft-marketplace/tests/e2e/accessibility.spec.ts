import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

async function enter(page: Page, route: string) {
  await page.goto('/login?redirect=' + encodeURIComponent(route))
  const dialog = page.getByRole('dialog', { name: 'Login', exact: true })
  await dialog.getByLabel('E-mail', { exact: true }).fill('joao@kurio.test')
  await dialog.getByLabel('Senha', { exact: true }).fill('Kurio@2026')
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toBeHidden()
}

const routes = ['/', '/mercado', '/carrinho', '/login', '/cadastro', '/perfil', '/carteiras', '/pagamento', '/lista-de-interesse']
for (const route of routes) test('acessibilidade: ' + route, async ({ page }, info) => {
  const privateRoute = ['/perfil', '/carteiras', '/pagamento', '/lista-de-interesse'].includes(route)
  if (privateRoute) {
    await page.goto('/login?redirect=' + encodeURIComponent(route))
    const login = page.getByRole('dialog', { name: 'Login', exact: true })
    await login.getByLabel('E-mail', { exact: true }).fill('joao@kurio.test')
    await login.getByLabel('Senha', { exact: true }).fill('Kurio@2026')
    await login.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(login).toBeHidden()
  } else await page.goto(route)
  if (route === '/') await expect(page.getByTestId('nft-card')).toHaveCount(9)
  else if (route === '/carrinho') await expect(page.getByTestId('cart-item')).toHaveCount(3)
  else if (route === '/pagamento') await expect(page.getByTestId('payment-item')).toHaveCount(3)
  else if (route === '/mercado') await expect(page.getByRole('heading', { name: 'Emerald Ape #042', exact: true })).toBeVisible()
  else if (privateRoute) await expect(page.locator('.account-content h1')).toBeVisible()
  else await expect(page.getByRole('dialog', { name: route === '/login' ? 'Login' : 'Cadastro', exact: true })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze()
  await info.attach('axe-' + (route.slice(1) || 'inicio'), { body: JSON.stringify(result, null, 2), contentType: 'application/json' })
  expect(result.violations.map(issue => ({ id: issue.id, impact: issue.impact, nodes: issue.nodes.map(node => ({ target: node.target, reason: node.failureSummary })) }))).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('perfil pode ser validado, salvo e recuperado usando teclado', async ({ page }) => {
  await enter(page, '/perfil')
  const form = page.locator('.profile-form')
  const name = form.getByLabel('Nome de exibição', { exact: false })
  await name.fill(''); await name.press('Enter')
  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(name).toBeFocused()
  const error = await name.getAttribute('aria-describedby')
  expect(error).toBeTruthy()
  await expect(page.locator('#' + error)).toBeVisible()
  await name.fill('Colecionador por teclado')
  await form.getByRole('button', { name: 'Salvar', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(form.getByRole('status')).toContainText('atualizad')
  await page.reload()
  await expect(name).toHaveValue('Colecionador por teclado')
})

test('favorito mantém foco no diálogo e devolve ao botão ao fechar por Escape', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByTestId('nft-card').first().getByRole('button', { name: /^Favoritar / })
  await trigger.focus(); await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Entre para salvar favoritos', exact: true })
  await expect(dialog).toBeVisible()
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden(); await expect(trigger).toBeFocused()
})

for (const physicalWidth of [768, 1440]) test('reflow equivalente a zoom de 200% em ' + physicalWidth + ' px', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Reflow 200% usa dimensões físicas fixas e DPR 2.')
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: physicalWidth / 2, height: 450, deviceScaleFactor: 2, mobile: false, screenWidth: physicalWidth, screenHeight: 900 })
  try {
    await enter(page, '/perfil')
    for (const route of ['/', '/mercado', '/carrinho', '/perfil', '/carteiras', '/pagamento']) {
      await page.goto(route)
      if (route === '/') await expect(page.getByTestId('nft-card')).toHaveCount(9)
      else if (route === '/carrinho') await expect(page.getByTestId('cart-item')).toHaveCount(3)
      else if (route === '/pagamento') await expect(page.getByTestId('payment-item')).toHaveCount(3)
      else await expect(page.locator('h1').first()).toBeVisible()
      expect(await page.evaluate(() => ({ width: innerWidth, dpr: devicePixelRatio, overflow: document.documentElement.scrollWidth > innerWidth }))).toEqual({ width: physicalWidth / 2, dpr: 2, overflow: false })
      const first = page.locator('main a:visible, main button:visible, main input:visible').first()
      await first.focus(); await expect(first).toBeFocused()
    }
  } finally { await cdp.send('Emulation.clearDeviceMetricsOverride'); await cdp.detach() }
})

test('recibo confirmado permanece acessível com os itens e o total da API', async ({ page }, info) => {
  await enter(page, '/pagamento')
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  await page.getByRole('dialog', { name: 'Conectar Coinbase Wallet', exact: true }).getByRole('button', { name: 'Conectar carteira', exact: true }).click()
  await page.getByRole('button', { name: 'Finalizar pedido', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira', exact: true })).toBeVisible()
  await expect(page.getByTestId('receipt-total')).toHaveText('26,846098 ETH')
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze()
  await info.attach('axe-recibo', { body: JSON.stringify(result, null, 2), contentType: 'application/json' })
  expect(result.violations.map(issue => ({ id: issue.id, nodes: issue.nodes.map(node => ({ target: node.target, reason: node.failureSummary })) }))).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
