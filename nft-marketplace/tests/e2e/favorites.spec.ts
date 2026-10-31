import { expect, test, type Page } from '@playwright/test'

test.beforeEach(({ browserName }, info) => test.skip(browserName !== 'chromium' || info.project.name === 'tablet', 'Favoritos desktop e mobile.'))
async function credentials(page: Page, email = 'joao@kurio.test') {
  const dialog = page.getByRole('dialog', { name: 'Login', exact: true })
  await dialog.getByLabel('E-mail', { exact: true }).fill(email)
  await dialog.getByLabel('Senha', { exact: true }).fill('Kurio@2026')
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toBeHidden()
}
async function login(page: Page, email = 'joao@kurio.test', redirect = '/') {
  await page.goto('/login?redirect=' + encodeURIComponent(redirect))
  await credentials(page, email)
  await expect(page).toHaveURL(new RegExp(redirect + '$'))
}
const cards = (page: Page) => page.getByTestId('nft-card')
const firstHeart = (page: Page) => cards(page).first().getByRole('button', { name: /^Favoritar / })
async function scenario(page: Page, value: string) { await page.evaluate(value => localStorage.setItem('nft-marketplace:scenario', value), value) }

test('todos os cards têm coração e o login preserva o NFT escolhido', async ({ page }) => {
  await page.goto('/')
  await expect(cards(page)).toHaveCount(9)
  await expect(cards(page).getByRole('button', { name: /^Favoritar / })).toHaveCount(9)
  await expect(firstHeart(page).locator('img')).toHaveAttribute('src', '/mobile-icons/heart-outline.png')
  await firstHeart(page).click()
  const prompt = page.getByRole('dialog', { name: 'Entre para salvar favoritos', exact: true })
  await prompt.getByRole('link', { name: 'Entrar para continuar' }).click()
  await credentials(page)
  await expect(page).toHaveURL(/\/lista-de-interesse$/)
  await expect(cards(page)).toHaveCount(1)
  await expect(cards(page).first()).toContainText('Emerald Ape #042')
  const heart = cards(page).getByRole('button', { name: /^Remover dos favoritos / })
  await expect(heart).toHaveAttribute('aria-pressed', 'true')
  await expect(heart.locator('img')).toHaveAttribute('src', '/mobile-icons/heart.png')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('favoritar nos detalhes salva, persiste e permite remover', async ({ page }) => {
  await login(page, 'joao@kurio.test', '/mercado')
  await page.getByRole('button', { name: 'Favoritar Emerald Ape #042', exact: true }).click()
  await expect(page).toHaveURL(/\/lista-de-interesse$/)
  await expect(cards(page)).toHaveCount(1)
  await page.reload()
  await expect(cards(page)).toHaveCount(1)
  await cards(page).getByRole('link', { name: /Ver detalhes de Emerald Ape #042/ }).click()
  const remove = page.getByRole('button', { name: 'Remover dos favoritos Emerald Ape #042', exact: true })
  await expect(remove).toHaveAttribute('aria-pressed', 'true')
  await remove.click()
  await expect(page.getByRole('button', { name: 'Favoritar Emerald Ape #042', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await page.goto('/lista-de-interesse')
  await expect(page.getByRole('heading', { name: 'Sua lista ainda está vazia', exact: true })).toBeVisible()
})

test('favoritos ficam separados entre João e Ana e exigem sessão', async ({ page }) => {
  await login(page)
  await firstHeart(page).click()
  await expect(page).toHaveURL(/\/lista-de-interesse$/)
  await page.evaluate(async () => { await fetch('/api/session', { method: 'DELETE' }) })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Entre para acessar sua conta', exact: true })).toBeVisible()
  expect(await page.evaluate(async () => (await fetch('/api/favorites')).status)).toBe(401)
  await login(page, 'ana@kurio.test', '/lista-de-interesse')
  await expect(page.getByRole('heading', { name: 'Sua lista ainda está vazia', exact: true })).toBeVisible()
  await page.evaluate(async () => { await fetch('/api/session', { method: 'DELETE' }) })
  await page.reload()
  await login(page, 'joao@kurio.test', '/lista-de-interesse')
  await expect(cards(page)).toHaveCount(1)
})

test('falha ao salvar não preenche o coração e permite tentar novamente', async ({ page }) => {
  await login(page)
  await expect(firstHeart(page)).toBeEnabled()
  await scenario(page, 'http-error')
  await firstHeart(page).click()
  await expect(cards(page).first().getByRole('alert')).toContainText('indisponível')
  const message = await cards(page).first().getByRole('alert').boundingBox()
  expect(message!.x).toBeGreaterThanOrEqual(0)
  expect(message!.x + message!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  await expect(firstHeart(page)).toHaveAttribute('aria-pressed', 'false')
  await expect(page).toHaveURL(/\/$/)
  await scenario(page, 'default')
  await firstHeart(page).click()
  await expect(page).toHaveURL(/\/lista-de-interesse$/)
  await expect(cards(page)).toHaveCount(1)
})

test('duas abas sincronizam favoritos sem perder inclusões', async ({ page, context }) => {
  await login(page)
  const other = await context.newPage()
  await other.goto('/')
  await expect(firstHeart(page)).toBeEnabled()
  const second = cards(other).nth(1).getByRole('button', { name: /^Favoritar / })
  await expect(second).toBeEnabled()
  await Promise.all([firstHeart(page).click(), second.click()])
  await expect(page).toHaveURL(/\/lista-de-interesse$/)
  await expect(other).toHaveURL(/\/lista-de-interesse$/)
  await expect(cards(page)).toHaveCount(2)
  await expect(cards(other)).toHaveCount(2)
  await cards(page).first().getByRole('button', { name: /^Remover dos favoritos / }).click()
  await expect(cards(page)).toHaveCount(1)
  await expect(cards(other)).toHaveCount(1)
})

test('API é idempotente e rejeita um NFT inexistente', async ({ page }) => {
  await login(page, 'joao@kurio.test', '/lista-de-interesse')
  const result = await page.evaluate(async () => {
    const put = () => fetch('/api/favorites/emerald-ape-042', { method: 'PUT' }).then(response => response.json())
    const responses = await Promise.all([put(), put()])
    const missing = await fetch('/api/favorites/nft-inexistente', { method: 'PUT' })
    return { responses, missing: missing.status }
  })
  expect(result.responses.map(item => item.items.length)).toEqual([1, 1])
  expect(result.responses.map(item => item.version)).toEqual([1, 1])
  expect(result.missing).toBe(404)
  await page.reload()
  await expect(cards(page)).toHaveCount(1)
})

test('Google usa a imagem fornecida nas telas de Login e Cadastro web e mobile', async ({ page }) => {
  for (const route of ['/login', '/cadastro']) {
    await page.goto(route)
    const google = page.getByRole('button', { name: 'Continuar com Google', exact: true }).locator('img')
    await expect(google).toHaveAttribute('src', '/mobile-icons/google.png')
    await expect(google).toBeVisible()
    expect(await google.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
  }
})
