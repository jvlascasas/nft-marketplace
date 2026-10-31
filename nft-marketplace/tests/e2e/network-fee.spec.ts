import { expect, test } from '@playwright/test'

test('taxa de 0,06% após desconto acompanha pagamento e recibo imutável', async ({ page }) => {
  await page.goto('/carrinho')
  await expect(page.getByTestId('cart-fee')).toHaveText('0,016098 ETH')
  await page.getByLabel('Código promocional', { exact: true }).fill('JVLasCasas Aprovado')
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(page.getByTestId('cart-fee')).toHaveText('0,008049 ETH')
  await expect(page.getByTestId('cart-total')).toHaveText('13,423049 ETH')
  await page.goto('/login?redirect=%2Fpagamento')
  const login = page.getByRole('dialog', { name: 'Login', exact: true })
  await login.getByLabel('E-mail', { exact: true }).fill('joao@kurio.test')
  await login.getByLabel('Senha', { exact: true }).fill('Kurio@2026')
  await login.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(login).toBeHidden()
  await expect(page.getByTestId('checkout-fee')).toHaveText('0,008049 ETH')
  await expect(page.getByTestId('checkout-total')).toHaveText('13,423049 ETH')
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  const connection = page.getByRole('dialog', { name: 'Conectar Coinbase Wallet', exact: true })
  await connection.getByRole('button', { name: 'Conectar carteira', exact: true }).click()
  await page.getByRole('dialog', { name: 'Revise seu pedido', exact: true }).getByRole('button', { name: 'Finalizar pedido', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira', exact: true })).toBeVisible()
  await expect(page.getByTestId('receipt-fee')).toHaveText('0,008049 ETH')
  await expect(page.getByTestId('receipt-total')).toHaveText('13,423049 ETH')
  await page.evaluate(async () => {
    const response = await fetch('/api/mock/control', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'inventory', nftId: 'emerald-ape-042', price: '2' }) })
    if (!response.ok) throw new Error('Falha no controle de inventário')
  })
  await page.reload()
  await expect(page.getByTestId('receipt-fee')).toHaveText('0,008049 ETH')
  await expect(page.getByTestId('receipt-total')).toHaveText('13,423049 ETH')
})

test('carrinho vazio tem taxa zero e cálculo preserva precisão até um wei', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('kurio:mock-cart:visitor:v1')) localStorage.setItem('kurio:mock-cart:visitor:v1', JSON.stringify({ schema: 1, version: 1, items: [], coupon: null }))
  })
  await page.goto('/carrinho')
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio', exact: true })).toBeVisible()
  const result = await page.evaluate(async () => {
    const read = async () => {
      const response = await fetch('/api/cart')
      if (!response.ok) throw new Error('Falha ao consultar carrinho')
      return response.json()
    }
    const empty = (await read()).quote
    const response = await fetch('/api/mock/control', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'inventory', nftId: 'emerald-ape-042', price: '0.000000000000001667' }) })
    if (!response.ok) throw new Error('Falha no controle de inventário')
    const add = await fetch('/api/cart/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nftId: 'emerald-ape-042', editionId: 'fifty', quantity: 1 }) })
    if (!add.ok) throw new Error('Falha ao adicionar item')
    return { empty, tiny: (await read()).quote }
  })
  expect(result.empty).toMatchObject({ subtotal: '0', networkFee: '0', total: '0', networkFeePercent: '0.06' })
  expect(result.tiny).toMatchObject({ subtotal: '0.000000000000001667', networkFee: '0.000000000000000001', total: '0.000000000000001668' })
})
