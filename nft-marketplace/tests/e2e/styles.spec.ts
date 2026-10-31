import { expect, test, type Page } from '@playwright/test'

async function homeAppearance(page: Page) {
  await expect(page.getByTestId('nft-card')).toHaveCount(9)
  await page.evaluate(() => document.fonts.ready)
  return page.evaluate(() => {
    const selectors = ['body', '.home-page .hero', '.home-page .catalog-tabs', '.home-page .nft-grid', '.home-page .nft-card-art', '.home-page .nft-card h3']
    const properties = ['display', 'width', 'height', 'padding', 'gap', 'font-size', 'line-height', 'color', 'background-color', 'border-radius']
    return selectors.map(selector => {
      const element = document.querySelector(selector)!
      const style = getComputedStyle(element)
      return { selector, properties: Object.fromEntries(properties.map(property => [property, style.getPropertyValue(property)])) }
    })
  })
}

test('visitar conta e carteiras não altera a aparência do Início ao voltar', async ({ page }) => {
  await page.goto('/')
  const before = await homeAppearance(page)
  await page.getByRole('link', { name: 'Entrar', exact: true }).click()
  const login = page.getByRole('dialog', { name: 'Login', exact: true })
  await login.getByLabel('E-mail', { exact: true }).fill('joao@kurio.test')
  await login.getByLabel('Senha', { exact: true }).fill('Kurio@2026')
  await login.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(login).toBeHidden()
  await page.getByRole('button', { name: 'Conta', exact: true }).click()
  await page.getByRole('dialog', { name: 'Sua conta', exact: true }).getByRole('link', { name: 'Dados do perfil', exact: true }).click()
  await expect(page.locator('.profile-form')).toBeVisible()
  await page.getByRole('navigation', { name: 'Menu da conta', exact: true }).getByRole('link', { name: 'Carteiras', exact: true }).click()
  await expect(page.locator('.wallet-primary')).toBeVisible()
  await page.getByRole('link', { name: 'Kurio, página inicial', exact: true }).click()
  expect(await homeAppearance(page)).toEqual(before)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.reload()
  expect(await homeAppearance(page)).toEqual(before)
})
