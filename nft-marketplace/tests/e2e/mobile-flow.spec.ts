import { expect, test, type Page } from '@playwright/test'
import type { CartResponse } from '../../src/features/cart/contracts'
import type { WalletSettings } from '../../src/features/account/contracts'

test.beforeEach(({ browserName }, info) => test.skip(info.project.name !== 'mobile' || browserName !== 'chromium', 'Fluxo mobile de compra e autenticação.'))
test.use({ isMobile: true, hasTouch: true })
const password = 'Kurio@2026'
async function ready(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(async () => { await Promise.all([...document.images].filter(image => image.getBoundingClientRect().width > 0).map(image => { image.loading = 'eager'; return image.decode() })) })
}
async function login(page: Page, redirect = '/pagamento') {
  await page.goto('/login?redirect=' + encodeURIComponent(redirect))
  const dialog = page.getByRole('dialog', { name: 'Login', exact: true })
  await dialog.getByLabel('E-mail', { exact: true }).fill('joao@kurio.test')
  await dialog.getByLabel('Senha', { exact: true }).fill(password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).tap()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(new RegExp(redirect + '$'))
  if (redirect === '/pagamento') await expect(page.getByRole('radio', { name: 'Coinbase Wallet', exact: true })).toBeVisible()
}
async function fourItems(page: Page) {
  await page.goto('/carrinho')
  await expect(page.getByTestId('cart-item')).toHaveCount(3)
  await page.evaluate(async () => {
    let cart = await (await fetch('/api/cart')).json() as CartResponse
    for (const [id, quantity] of [['emerald-ape-042:fifty', 1], ['violet-nomad-314:fifty', 1], ['ivory-baron-088:fifty', 2]] as const) {
      const response = await fetch('/api/cart/items/' + encodeURIComponent(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: cart.version, quantity }) })
      if (!response.ok) throw new Error('Não foi possível preparar o carrinho de teste')
      cart = await response.json()
    }
    const response = await fetch('/api/cart/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nftId: 'golden-beat-207', editionId: 'fifty', quantity: 2 }) })
    if (!response.ok) throw new Error('Não foi possível adicionar o quarto NFT')
  })
  await page.reload()
  await expect(page.getByTestId('cart-item')).toHaveCount(4)
}
async function secondWallet(page: Page) {
  await page.evaluate(async () => {
    const state = await (await fetch('/api/wallets')).json() as WalletSettings
    const wallet = { ...state.items[0], id: 'secondary', label: 'Carteira secundária', nickname: 'Reserva', address: '0x' + 'c3'.repeat(20), secondaryAddress: '', ensName: 'reserva.kurio.eth', provider: 'MetaMask', network: 'Polygon', networks: ['Polygon'], sameAsPrimary: false }
    const response = await fetch('/api/wallets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: state.version, wallet }) })
    if (!response.ok) throw new Error('Não foi possível cadastrar a carteira de teste')
  })
  await page.reload()
  await expect(page.getByRole('radio', { name: /Reserva/ })).toBeVisible()
}
async function review(page: Page, provider = 'Coinbase Wallet') {
  await page.getByRole('radio', { name: provider, exact: true }).check()
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).tap()
  const connection = page.getByRole('dialog', { name: 'Conectar ' + provider, exact: true })
  await expect(connection).toBeVisible()
  await connection.getByRole('button', { name: 'Conectar carteira', exact: true }).tap()
  await expect(page.getByRole('dialog', { name: 'Revise seu pedido', exact: true })).toBeVisible()
}

test('Carrinho segue o Figma e quatro cartões cabem com o resumo na base', async ({ page }, info) => {
  await page.setViewportSize({ width: 414, height: 896 })
  await fourItems(page)
  const item = await page.getByTestId('cart-item').first().boundingBox()
  expect(item!.width).toBe(358)
  const finish = await page.getByRole('button', { name: 'Conectar e finalizar', exact: true }).boundingBox()
  expect(finish!.y + finish!.height).toBeLessThanOrEqual(896)
  await ready(page)
  await expect(page).toHaveScreenshot('mobile-cart-figma.png', { animations: 'disabled' })
  await page.screenshot({ path: info.outputPath('mobile-cart-preview.png'), animations: 'disabled' })
})

test('Pagamento segue o Figma com carteiras reais da conta, provedores e total', async ({ page }, info) => {
  await page.setViewportSize({ width: 414, height: 896 })
  await fourItems(page)
  await login(page)
  await secondWallet(page)
  await expect(page.getByTestId('checkout-total')).toHaveText('8,156 ETH')
  await expect(page.getByRole('banner')).toHaveCount(0)
  await expect(page.locator('.collector-form')).toHaveCount(0)
  await ready(page)
  await expect(page).toHaveScreenshot('mobile-payment-figma.png', { animations: 'disabled' })
  await page.screenshot({ path: info.outputPath('mobile-payment-preview.png'), animations: 'disabled' })
})

for (const route of ['login', 'cadastro']) {
  test(route + ' segue o Figma mobile', async ({ page }, info) => {
    await page.setViewportSize({ width: 414, height: 896 })
    await page.goto('/' + route)
    await expect(page.getByRole('dialog', { name: route === 'login' ? 'Login' : 'Cadastro', exact: true })).toBeVisible()
    await ready(page)
    await expect(page).toHaveScreenshot('mobile-' + route + '-figma.png', { animations: 'disabled' })
    await page.screenshot({ path: info.outputPath('mobile-' + route + '-preview.png'), animations: 'disabled' })
  })
}

test('cupom de 50% acompanha login, pagamento, confirmação e refresh sem duplicar pedido', async ({ page }) => {
  let posts = 0
  page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders') posts++ })
  await page.goto('/carrinho')
  await page.getByLabel('Código promocional', { exact: true }).fill('JVLasCasas Aprovado')
  await page.getByRole('button', { name: 'Aplicar', exact: true }).tap()
  await expect(page.getByTestId('cart-total')).toHaveText('13,423049 ETH')
  await page.getByRole('button', { name: 'Conectar e finalizar', exact: true }).tap()
  await page.getByRole('link', { name: 'Entrar para continuar', exact: true }).tap()
  const dialog = page.getByRole('dialog', { name: 'Login', exact: true })
  await dialog.getByLabel('E-mail', { exact: true }).fill('joao@kurio.test')
  await dialog.getByLabel('Senha', { exact: true }).fill(password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).tap()
  await expect(page.getByTestId('checkout-total')).toHaveText('13,423049 ETH')
  await page.getByRole('button', { name: 'Trocar carteira', exact: true }).tap()
  const editor = page.getByRole('dialog', { name: 'Carteira e dados do colecionador', exact: true })
  await expect(editor.getByLabel('Nome de exibição', { exact: false })).toHaveValue('João Moreira')
  await expect(editor.getByLabel('E-mail', { exact: false })).toHaveValue('joao@kurio.test')
  await editor.getByRole('button', { name: 'Concluir', exact: true }).tap()
  await review(page)
  await page.getByRole('button', { name: 'Finalizar pedido', exact: true }).tap()
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira', exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('receipt-total')).toHaveText('13,423049 ETH')
  await page.reload()
  await expect(page.getByTestId('receipt-total')).toHaveText('13,423049 ETH')
  expect(posts).toBe(1)
  await page.goto('/carrinho')
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio', exact: true })).toBeVisible()
})

test('cadastro valida confirmação e retorna automaticamente ao pagamento', async ({ page }) => {
  const username = 'mobile.' + Date.now().toString(36)
  await page.goto('/login?redirect=%2Fpagamento')
  await page.getByRole('link', { name: 'Crie uma conta', exact: true }).tap()
  const dialog = page.getByRole('dialog', { name: 'Cadastro', exact: true })
  await dialog.getByLabel('Nome de usuário', { exact: true }).fill(username)
  await dialog.getByLabel('Digite seu e-mail', { exact: true }).fill(username + '@kurio.test')
  await dialog.getByLabel('Senha', { exact: true }).fill(password)
  await dialog.getByLabel('Confirmar senha', { exact: true }).fill('OutraSenha123')
  await dialog.getByRole('button', { name: 'Mostrar confirmação de senha', exact: true }).tap()
  await expect(dialog.getByLabel('Confirmar senha', { exact: true })).toHaveAttribute('type', 'text')
  await dialog.getByRole('button', { name: 'Criar perfil', exact: true }).tap()
  await expect(dialog.getByLabel('Confirmar senha', { exact: true })).toBeFocused()
  await dialog.getByLabel('Confirmar senha', { exact: true }).fill(password)
  await dialog.getByRole('button', { name: 'Criar perfil', exact: true }).tap()
  await expect(page).toHaveURL(/\/pagamento$/)
  await expect(page.getByRole('radio', { name: 'Coinbase Wallet', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Trocar carteira', exact: true }).tap()
  const editor = page.getByRole('dialog', { name: 'Carteira e dados do colecionador', exact: true })
  await expect(editor.getByLabel('Nome de usuário', { exact: false })).toHaveValue(username)
  await expect(editor.getByLabel('E-mail', { exact: false })).toHaveValue(username + '@kurio.test')
  await editor.getByRole('button', { name: 'Concluir', exact: true }).tap()
  await review(page)
})

test('edições manuais do colecionador são validadas e preservadas após refresh', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Trocar carteira', exact: true }).tap()
  const editor = page.getByRole('dialog', { name: 'Carteira e dados do colecionador', exact: true })
  await editor.getByLabel('Nome de exibição', { exact: false }).clear()
  await editor.getByRole('button', { name: 'Concluir', exact: true }).tap()
  await expect(editor.getByLabel('Nome de exibição', { exact: false })).toBeFocused()
  await editor.getByLabel('Nome de exibição', { exact: false }).fill('João no mobile')
  await editor.getByRole('button', { name: 'Concluir', exact: true }).tap()
  await expect(editor).toBeHidden()
  await page.reload()
  await page.getByRole('button', { name: 'Trocar carteira', exact: true }).tap()
  await expect(editor.getByLabel('Nome de exibição', { exact: false })).toHaveValue('João no mobile')
})

test('troca de carteira atualiza a rede e o provedor e permite compra pela secundária', async ({ page }) => {
  await login(page)
  await secondWallet(page)
  await page.getByRole('radio', { name: /Reserva/ }).check()
  await expect(page.getByRole('radio', { name: 'MetaMask', exact: true })).toBeChecked()
  await expect(page.locator('.mobile-wallet-card').filter({ hasText: 'Reserva' })).toContainText('Rede Polygon')
  await page.getByRole('button', { name: 'Trocar carteira', exact: true }).tap()
  const editor = page.getByRole('dialog', { name: 'Carteira e dados do colecionador', exact: true })
  await expect(editor.getByLabel('Rede', { exact: false })).toHaveValue('Polygon')
  await expect(editor.getByLabel('Endereço da carteira', { exact: false })).toHaveValue('0x' + 'c3'.repeat(20))
  await editor.getByRole('button', { name: 'Concluir', exact: true }).tap()
  await review(page, 'MetaMask')
  await page.getByRole('button', { name: 'Finalizar pedido', exact: true }).tap()
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira', exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.receipt-meta')).toContainText('MetaMask')
})

test('login trata credenciais inválidas e mantém recuperação e acesso social simulados', async ({ page }) => {
  await page.goto('/login?redirect=%2Fpagamento')
  const dialog = page.getByRole('dialog', { name: 'Login', exact: true })
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).tap()
  await expect(dialog.getByLabel('E-mail', { exact: true })).toBeFocused()
  await dialog.getByLabel('E-mail', { exact: true }).fill('joao@kurio.test')
  await dialog.getByLabel('Senha', { exact: true }).fill('Errada123')
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).tap()
  await expect(dialog.getByRole('alert')).toContainText('E-mail ou senha inválidos')
  await dialog.getByRole('button', { name: 'Esqueceu a senha?', exact: true }).tap()
  await expect(page.getByRole('dialog', { name: 'Recuperar acesso', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Voltar ao login', exact: true }).tap()
  await dialog.getByRole('button', { name: 'Continuar com Google', exact: true }).tap()
  await page.getByRole('dialog', { name: 'Continuar com Google', exact: true }).getByRole('button', { name: 'Ana Araújo', exact: true }).tap()
  await expect(page).toHaveURL(/\/pagamento$/)
})

for (const width of [320, 360, 390, 414]) {
  test('fluxo sem overflow e com formulários acessíveis em ' + width + ' px', async ({ page }) => {
    await page.setViewportSize({ width, height: 640 })
    for (const route of ['/carrinho', '/login', '/cadastro']) {
      await page.goto(route)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (route === '/cadastro') {
        await page.getByRole('button', { name: 'Criar perfil', exact: true }).scrollIntoViewIfNeeded()
        await page.getByRole('button', { name: 'Criar perfil', exact: true }).tap()
        await expect(page.getByLabel('Nome de usuário', { exact: true })).toBeFocused()
      }
    }
    await login(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const confirm = await page.getByRole('button', { name: 'Confirmar compra', exact: true }).boundingBox()
    expect(confirm!.x + confirm!.width).toBeLessThanOrEqual(width)
  })
}
