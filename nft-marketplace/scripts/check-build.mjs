import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { brotliDecompressSync } from 'node:zlib'
import { preview } from 'vite'

process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.resolve('node_modules/.cache/ms-playwright')
const { chromium, expect } = await import('@playwright/test')
const assets = path.resolve('dist/assets')
const files = (await fs.readdir(assets)).filter(file => /\.(js|css)$/.test(file))
assert.ok(files.length, 'Execute o build antes de verificar o preview.')
for (const file of files) {
  const original = await fs.readFile(path.join(assets, file))
  const compressed = await fs.readFile(path.join(assets, file + '.br'))
  assert.deepEqual(brotliDecompressSync(compressed), original, 'Asset comprimido difere do build: ' + file)
}

const server = await preview({ preview: { host: '127.0.0.1', port: 4177, strictPort: true } })
let browser
try {
  browser = await chromium.launch()
  for (const width of [390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    try {
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
      const open = async route => {
        await page.goto('http://127.0.0.1:4177' + route)
        await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(23, 14, 9)')
      }
      await open('/')
      await expect(page.getByTestId('nft-card')).toHaveCount(9)
      await expect(page.getByTestId('realtime-connection')).toHaveText('Conexão do marketplace ativa.')
      if (width === 390) {
        const navigation = page.getByRole('navigation', { name: 'Navegação mobile', exact: true })
        await expect(navigation).toBeVisible()
        assert.match(await navigation.evaluate(element => getComputedStyle(element, '::before').backgroundImage), /^url\("?data:image\/png/)
      }
      await open('/mercado')
      await expect(page.getByRole('heading', { name: 'Emerald Ape #042', exact: true })).toBeVisible()
      await page.locator('.gallery-main img').evaluate(image => image.decode())
      await page.reload()
      await expect(page.getByRole('heading', { name: 'Emerald Ape #042', exact: true })).toBeVisible()
      await open('/login?redirect=%2Fpagamento')
      const login = page.getByRole('dialog', { name: 'Login', exact: true })
      await login.getByLabel('E-mail', { exact: true }).fill('joao@kurio.test')
      await login.getByLabel('Senha', { exact: true }).fill('Kurio@2026')
      await login.getByRole('button', { name: 'Entrar', exact: true }).click()
      await expect(login).toBeHidden()
      await expect(page.getByTestId('checkout-total')).toHaveText('26,846098 ETH')
      await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
      await page.getByRole('dialog', { name: 'Conectar Coinbase Wallet', exact: true }).getByRole('button', { name: 'Conectar carteira', exact: true }).click()
      await page.getByRole('button', { name: 'Finalizar pedido', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira', exact: true })).toBeVisible()
      await expect(page.getByTestId('receipt-total')).toHaveText('26,846098 ETH')
      await page.reload()
      await expect(page.getByTestId('receipt-total')).toHaveText('26,846098 ETH')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      assert.deepEqual(errors, [], 'Erros no preview de produção em ' + width + 'px')
      console.log('Preview de produção: ' + width + 'px — estilos, assets, Socket.IO, compra e refresh OK.')
    } finally { await context.close() }
  }
  console.log(files.length + ' assets Brotli idênticos aos arquivos finais do build.')
} finally {
  await browser?.close()
  await new Promise(resolve => server.httpServer.close(resolve))
}
