import { expect, test } from '@playwright/test'

test('catálogo, navegação e refresh', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('nft-card')).toHaveCount(9)
  await page.getByRole('link', { name: /^Carrinho(?:\s|$)/ }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await expect(page.getByRole('heading', { name: 'Carrinho de NFTs' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Carrinho de NFTs' })).toBeVisible()
  await page.goBack()
  await expect(page.getByTestId('nft-card')).toHaveCount(9)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('rota desconhecida tem recuperação', async ({ page }) => {
  await page.goto('/pagina-inexistente')
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao início' }).click()
  await expect(page.getByTestId('nft-card')).toHaveCount(9)
})
