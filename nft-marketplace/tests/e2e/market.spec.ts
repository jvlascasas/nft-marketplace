import { expect, test, type Page } from '@playwright/test'

async function goToMarket(page: Page) {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  if ((page.viewportSize()?.width ?? 1440) <= 640) {
    await page.getByRole('navigation', { name: 'Navegação mobile', exact: true }).getByRole('link', { name: 'Mercado', exact: true }).click()
  } else {
    await page.getByRole('navigation', { name: 'Navegação principal', exact: true }).getByRole('link', { name: 'Mercado', exact: true }).click()
  }
}
const mobile = (page: Page) => (page.viewportSize()?.width ?? 1440) <= 640
async function openInformation(page: Page) {
  if (mobile(page)) await page.getByRole('button', { name: '4,8 de 5 estrelas; 19 avaliações de colecionadores', exact: true }).click()
}

test('Mercado abre o frame de detalhes e permite voltar ao Início', async ({ page }) => {
  await page.goto('/')
  await goToMarket(page)
  await expect(page).toHaveURL(/\/mercado$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  await expect(page.locator('.gallery-thumbnails button')).toHaveCount(4)
  await expect(page.getByTestId('nft-card')).toHaveCount(mobile(page) ? 0 : 5)
  await expect(page.getByRole('textbox', { name: 'Buscar NFTs' })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  if (mobile(page)) await page.getByRole('link', { name: 'Voltar para Início', exact: true }).click()
  else await page.getByRole('navigation', { name: 'Localização' }).getByRole('link', { name: 'Início', exact: true }).click()
  await expect(page.locator('.hero')).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
})

test('galeria amplia a imagem e devolve o foco', async ({ page }) => {
  await page.goto('/mercado')
  if (!mobile(page)) {
    await page.getByRole('button', { name: 'Imagem 3 de 4', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Imagem 3 de 4', exact: true })).toHaveAttribute('aria-pressed', 'true')
  }
  await page.getByRole('button', { name: 'Ampliar imagem' }).click()
  await expect(page.getByRole('dialog', { name: 'Emerald Ape #042', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Ampliar imagem' })).toBeFocused()
})

test('edições e quantidades levam ao carrinho e favoritos exigem conta', async ({ page }) => {
  await page.goto('/mercado')
  await expect(page.getByRole('button', { name: '1/1 — esgotada', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Diminuir quantidade' })).toBeDisabled()
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await expect(page.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()
  await page.getByRole('button', { name: 'ABERTA', exact: true }).click()
  await expect(page.locator(mobile(page) ? '.mobile-purchase-price' : '.detail-price')).toHaveText('0,49 ETH')
  await page.getByRole('button', { name: mobile(page) ? 'Comprar NFT' : 'COMPRAR', exact: true }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await expect(page.getByTestId('cart-total')).toHaveText('27,336392 ETH')
  await page.goto('/mercado')
  await page.getByRole('button', { name: 'Favoritar Emerald Ape #042', exact: true }).click()
  const favorite = page.getByRole('dialog', { name: 'Entre para salvar favoritos', exact: true })
  await expect(favorite).toBeVisible()
  await favorite.getByRole('link', { name: 'Entrar para continuar' }).click()
  await expect(page).toHaveURL(/\/login(?:\?|$)/)
  await expect(page.getByRole('heading', { name: 'Login', exact: true })).toBeVisible()
})

test('abas de detalhes e avaliações funcionam por teclado', async ({ page }) => {
  await page.goto('/mercado')
  await openInformation(page)
  const reviews = page.getByRole('tab', { name: 'Avaliações de colecionadores (19)', exact: true })
  await reviews.click()
  await expect(reviews).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.review-list article')).toHaveCount(19)
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('tab', { name: 'Detalhes do NFT', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel')).toContainText('metadados armazenados no IPFS')
})

test('itens relacionados e detalhe inexistente usam a API', async ({ page }) => {
  await page.goto('/mercado')
  await openInformation(page)
  await page.getByTestId('nft-card').first().getByRole('link').click()
  await expect(page).toHaveURL(/\/nfts\/cosmic-bloom-118$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Cosmic Bloom #118' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Cosmic Bloom #118' })).toBeVisible()
  await openInformation(page)
  await page.getByRole('button', { name: 'Coleção, página 3', exact: true }).click()
  await expect(page.getByTestId('nft-card').first()).toContainText('Mint Wanderer')
  await page.goto('/nfts/nft-inexistente')
  await expect(page.getByRole('heading', { name: 'NFT não encontrado', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao início', exact: true }).click()
  await expect(page.locator('.hero')).toBeVisible()
})

test('detalhe recupera falha HTTP e mostra skeleton lento', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('nft-marketplace:scenario', 'http-error'))
  await page.goto('/mercado')
  await expect(page.getByRole('heading', { name: 'Não foi possível carregar o NFT', exact: true })).toBeVisible()
  await page.evaluate(() => localStorage.setItem('nft-marketplace:scenario', 'slow'))
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
})

test('Mercado segue o frame de detalhes em desktop e mobile', async ({ page }, testInfo) => {
  await page.goto('/mercado')
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  await expect(page.getByTestId('nft-card')).toHaveCount(mobile(page) ? 0 : 5)
  const desktopNavigation = page.getByRole('navigation', { name: 'Navegação principal', exact: true })
  if (await desktopNavigation.isVisible()) {
    await expect(desktopNavigation.getByRole('link', { name: 'Mercado', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(desktopNavigation.getByRole('link', { name: 'Início', exact: true })).not.toHaveAttribute('aria-current', 'page')
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(async () => {
    await Promise.all(Array.from(document.images).map(image => {
      image.loading = 'eager'
      return image.decode()
    }))
  })
  await expect(page).toHaveScreenshot('market.png', { fullPage: true, animations: 'disabled' })
  await page.screenshot({ path: testInfo.outputPath('market-preview.png'), animations: 'disabled' })
})

