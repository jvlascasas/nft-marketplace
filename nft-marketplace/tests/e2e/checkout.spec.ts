import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ browserName }, testInfo) => { test.skip(testInfo.project.name !== 'desktop' || browserName !== 'chromium', 'Etapa atual dedicada ao desktop.') })

async function login(page: Page, account?: string) {
  await page.goto('/pagamento')
  await expect(page.getByRole('button', { name: 'Continuar com conta de demonstração', exact: true })).toBeVisible()
  if (account) await page.getByLabel('Conta de demonstração', { exact: true }).selectOption(account)
  await page.getByRole('button', { name: 'Continuar com conta de demonstração', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Pagamento', exact: true })).toBeVisible()
  await expect(page.getByTestId('payment-item')).toHaveCount(3)
}
async function fill(page: Page) {
  await page.getByLabel('Nome de exibição', { exact: false }).fill('Colecionador Teste')
  await page.getByLabel('Nome de usuário', { exact: false }).fill('colecionador.teste')
  await page.getByLabel('Nome do perfil', { exact: false }).fill('Coleção de testes')
  await page.locator('.collector-form').getByLabel('E-mail', { exact: false }).fill('collector@kurio.test')
  await page.getByLabel('Rede', { exact: false }).selectOption('Ethereum')
  await page.getByLabel('Tipo de carteira', { exact: false }).selectOption('primary')
}
async function review(page: Page) {
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  const connection = page.getByRole('dialog', { name: 'Conectar Coinbase Wallet', exact: true })
  await expect(connection).toBeVisible()
  await connection.getByRole('button', { name: 'Conectar carteira', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Revise seu pedido', exact: true })).toBeVisible()
}
async function confirm(page: Page) {
  await page.getByRole('button', { name: 'Finalizar pedido', exact: true }).click()
  await expect(page).toHaveURL(/\/pedidos\/KUR-/)
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira', exact: true })).toBeVisible({ timeout: 15_000 })
}
async function specialCoupon(page: Page) {
  await page.getByRole('button', { name: 'Tem um código promocional? Aplique aqui', exact: true }).click()
  await page.getByLabel('Código promocional', { exact: true }).fill('JVLasCasas Aprovado')
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(page.getByTestId('checkout-total')).toHaveText('13,423049 ETH')
}
async function readyImages(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(async () => { await Promise.all(Array.from(document.images).map(image => { image.loading = 'eager'; return image.decode() })) })
}

test('easter egg aplica 50% ao total com taxa, persiste e pode ser removido', async ({ page }) => {
  await page.goto('/carrinho')
  await page.getByLabel('Código promocional', { exact: true }).fill('JVLasCasas Aprovado')
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(page.getByTestId('cart-total')).toHaveText('13,423049 ETH')
  await expect(page.getByTestId('cart-discount')).toHaveText('(-) 13,415')
  await page.reload()
  await expect(page.getByTestId('cart-total')).toHaveText('13,423049 ETH')
  await page.getByRole('button', { name: 'Remover cupom', exact: true }).click()
  await expect(page.getByTestId('cart-total')).toHaveText('26,846098 ETH')
})

test('pagamento segue o Figma desktop', async ({ page }, testInfo) => {
  await login(page)
  await readyImages(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(page).toHaveScreenshot('payment.png', { fullPage: true, animations: 'disabled' })
  await page.screenshot({ path: testInfo.outputPath('payment-preview.png'), animations: 'disabled' })
})

test('formulário valida, devolve foco e preserva rascunho após refresh', async ({ page }) => {
  await login(page)
  await page.getByLabel('Nome de exibição', { exact: false }).clear()
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  await expect(page.getByText('Informe seu nome de exibição.', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Nome de exibição', { exact: false })).toBeFocused()
  await fill(page)
  await page.getByLabel('Observação do colecionador (opcional)', { exact: true }).fill('Minha coleção de NFTs.')
  await page.reload()
  await expect(page.getByLabel('Nome de exibição', { exact: false })).toHaveValue('Colecionador Teste')
  await expect(page.getByLabel('Observação do colecionador (opcional)', { exact: true })).toHaveValue('Minha coleção de NFTs.')
  await expect(page.getByLabel('Nome ENS', { exact: false })).toHaveValue('joao.kurio.eth')
})

test('conta conectada finaliza carrinho com perfil e carteira preenchidos', async ({ page }) => {
  await page.goto('/carrinho')
  await expect(page.getByRole('button', { name: 'Conectar e finalizar', exact: true })).toBeVisible()
  await page.goto('/login?redirect=%2Fcarrinho')
  const dialog = page.getByRole('dialog', { name: 'Login', exact: true })
  await dialog.getByLabel('E-mail', { exact: true }).fill('joao@kurio.test')
  await dialog.getByLabel('Senha', { exact: true }).fill('Kurio@2026')
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click()
  await expect(page).toHaveURL(/\/pagamento$/)
  await expect(page.getByLabel('Nome de exibição', { exact: false })).toHaveValue('João Moreira')
  await expect(page.getByLabel('Nome de usuário', { exact: false })).toHaveValue('joao.moreira')
  await expect(page.getByLabel('Nome do perfil', { exact: false })).toHaveValue('joao.moreira')
  await expect(page.locator('.collector-form').getByLabel('E-mail', { exact: false })).toHaveValue('joao@kurio.test')
  await expect(page.getByLabel('Nome ENS', { exact: false })).toHaveValue('joao.kurio.eth')
  await expect(page.getByLabel('Endereço da carteira', { exact: false })).toHaveValue('0x' + 'a1'.repeat(20))
  await expect(page.getByLabel('Tipo de carteira', { exact: false })).toHaveValue('primary')
  await expect(page.getByLabel('Rede', { exact: false })).toHaveValue('Ethereum')
  // No field entry is required to reach the wallet authorization and review.
  await review(page)
  await expect(page.getByRole('dialog', { name: 'Revise seu pedido', exact: true })).toContainText('João Moreira')
})

test('preenchimento atualiza dados salvos e mantém edições manuais do pagamento', async ({ page }) => {
  await login(page)
  await page.getByLabel('Nome de exibição', { exact: false }).fill('Nome para esta compra')
  await page.getByLabel('Observação do colecionador (opcional)', { exact: true }).fill('Guardar na minha coleção')
  await page.goto('/perfil')
  const form = page.locator('.profile-form')
  await form.getByLabel('Nome de usuário', { exact: false }).fill('joao.atualizado')
  await form.getByLabel('E-mail', { exact: false }).fill('joao.novo@kurio.test')
  await form.getByLabel('Nome ENS', { exact: false }).fill('joao.novo.eth')
  await form.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(form.getByRole('status')).toContainText('atualizad')
  await page.goto('/carrinho')
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click()
  await expect(page.getByLabel('Nome de usuário', { exact: false })).toHaveValue('joao.atualizado')
  await expect(page.locator('.collector-form').getByLabel('E-mail', { exact: false })).toHaveValue('joao.novo@kurio.test')
  await expect(page.getByLabel('Nome ENS', { exact: false })).toHaveValue('joao.novo.eth')
  await page.reload()
  await expect(page.getByLabel('Nome de exibição', { exact: false })).toHaveValue('Nome para esta compra')
  await expect(page.getByLabel('Observação do colecionador (opcional)', { exact: true })).toHaveValue('Guardar na minha coleção')
})

test('rascunho antigo vazio recebe dados da conta sem misturar usuários', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('kurio:checkout-draft:collector-alex')) sessionStorage.setItem('kurio:checkout-draft:collector-alex', JSON.stringify({
      collector: { displayName: '', username: '', profileName: '', email: '', walletAddress: '', secondaryAddress: '', referralCode: '', ensName: '', note: '' },
      walletId: '', network: '', provider: 'Coinbase Wallet',
    }))
  })
  await login(page)
  await expect(page.getByLabel('Nome de exibição', { exact: false })).toHaveValue('João Moreira')
  await page.getByLabel('Nome de exibição', { exact: false }).fill('Compra particular de João')
  await page.getByRole('button', { name: 'Conta', exact: true }).click()
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Sua conta', exact: true })).toBeHidden()
  await page.goto('/pagamento')
  await page.getByLabel('Conta de demonstração', { exact: true }).selectOption('collector-sam')
  await page.getByRole('button', { name: 'Continuar com conta de demonstração', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio', exact: true })).toBeVisible()
  await page.goto('/mercado')
  await page.getByRole('button', { name: 'COMPRAR', exact: true }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click()
  await expect(page.getByLabel('Nome de exibição', { exact: false })).toHaveValue('Ana Araújo')
  await expect(page.getByLabel('Nome de usuário', { exact: false })).toHaveValue('ana.araujo')
  await expect(page.locator('.collector-form').getByLabel('E-mail', { exact: false })).toHaveValue('ana@kurio.test')
  await expect(page.getByLabel('Endereço da carteira', { exact: false })).toHaveValue('0x' + 'b2'.repeat(20))
})

test('compra completa com cupom, recibo, refresh e carrinho limpo', async ({ page }, testInfo) => {
  let posts = 0
  page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders') posts++ })
  await login(page)
  await fill(page)
  await specialCoupon(page)
  await review(page)
  await confirm(page)
  expect(posts).toBe(1)
  await expect(page.getByTestId('receipt-total')).toHaveText('13,423049 ETH')
  await expect(page.getByTestId('payment-item')).toHaveCount(3)
  await expect(page.locator('.receipt-totals')).toContainText('13,423049 ETH')
  const url = page.url()
  await page.reload()
  await expect(page.getByTestId('receipt-total')).toHaveText('13,423049 ETH')
  expect(page.url()).toBe(url)
  await readyImages(page)
  await expect(page).toHaveScreenshot('receipt.png', { fullPage: true, animations: 'disabled', mask: [page.locator('.receipt-meta dd'), page.locator('.receipt-order-id')] })
  await page.screenshot({ path: testInfo.outputPath('receipt-preview.png'), fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: 'Ver no Etherscan', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Explorador de demonstração', exact: true })).toContainText('não possui registro em um explorador público')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Ver no Etherscan', exact: true })).toBeFocused()
  await page.goto('/carrinho')
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio', exact: true })).toBeVisible()
})

for (const provider of ['WalletConnect', 'MetaMask']) {
  test(provider + ' abre a confirmação de pedido com a conta conectada', async ({ page }) => {
    await login(page, 'collector-sam')
    await page.getByRole('radio', { name: provider === 'WalletConnect' ? 'METAMASK · WALLETCONNECT · COINBASE' : provider, exact: true }).check()
    await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
    const connection = page.getByRole('dialog', { name: 'Conectar ' + provider, exact: true })
    await connection.getByRole('button', { name: 'Conectar carteira', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Revise seu pedido', exact: true })).toContainText('Ana Araújo')
    await confirm(page)
    await expect(page.locator('.receipt-meta')).toContainText(provider)
    await expect(page.getByRole('banner')).toHaveCount(0)
  })
}

test('conexão expirada durante revisão informa o erro e permite concluir novamente', async ({ page }) => {
  await login(page)
  await review(page)
  await page.evaluate(async () => { await fetch('/api/wallet-connection', { method: 'DELETE' }) })
  await page.evaluate(async () => {
    // Reconcile with the real REST result, as a focus refetch does.
    const modulePath = '/src/app/query-client.ts'
    const { queryClient } = await import(modulePath)
    await queryClient.invalidateQueries({ queryKey: ['wallet-connection', 'collector-alex'] })
  })
  await expect(page.locator('.payment-connected')).toHaveCount(0)
  await page.getByRole('button', { name: 'Finalizar pedido', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Revise seu pedido', exact: true })).toBeHidden()
  await expect(page.locator('.checkout-notice')).toContainText('Conecte novamente a carteira')
  await expect(page.getByTestId('payment-item')).toHaveCount(3)
  await review(page)
  await confirm(page)
})

test('recusa e desconexão de carteira preservam dados e itens', async ({ page }) => {
  await login(page)
  await fill(page)
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Conectar Coinbase Wallet', exact: true })
  await dialog.getByRole('button', { name: 'Recusar conexão', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Conexão recusada')
  await dialog.getByRole('button', { name: 'Conectar carteira', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Revise seu pedido', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Desconectar', exact: true }).click()
  await expect(page.getByText('Carteira desconectada. Seus dados e itens foram preservados.', { exact: true })).toBeVisible()
  await expect(page.getByTestId('payment-item')).toHaveCount(3)
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  await expect(dialog).toBeVisible()
})

test('pagamento recusado não mostra confirmação nem remove itens', async ({ page }) => {
  await login(page)
  await fill(page)
  await review(page)
  await page.evaluate(() => localStorage.setItem('nft-marketplace:scenario', 'payment-declined'))
  await page.getByRole('button', { name: 'Finalizar pedido', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Pagamento recusado', exact: true })).toBeVisible({ timeout: 12_000 })
  await expect(page.getByTestId('receipt-total')).toHaveCount(0)
  await page.getByRole('link', { name: 'Voltar ao carrinho', exact: true }).click()
  await expect(page.getByTestId('cart-item')).toHaveCount(3)
  await expect(page.getByTestId('cart-total')).toHaveText('26,846098 ETH')
})

test('timeout recupera a mesma tentativa e não duplica o pedido', async ({ page }) => {
  test.setTimeout(45_000)
  let posts = 0
  page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders') posts++ })
  await login(page)
  await fill(page)
  await review(page)
  await page.evaluate(() => localStorage.setItem('nft-marketplace:scenario', 'order-timeout'))
  await page.getByRole('button', { name: 'Finalizar pedido', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira', exact: true })).toBeVisible({ timeout: 22_000 })
  expect(posts).toBe(1)
  await expect(page.getByTestId('receipt-total')).toHaveText('26,846098 ETH')
  const count = await page.evaluate(() => JSON.parse(localStorage.getItem('kurio:mock-orders:v1') ?? '[]').length)
  expect(count).toBe(1)
})

test('refresh após aceite recupera o pedido durante a resposta interrompida', async ({ page }) => {
  let posts = 0
  page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders') posts++ })
  await login(page)
  await fill(page)
  await review(page)
  await page.evaluate(() => localStorage.setItem('nft-marketplace:scenario', 'order-timeout'))
  await page.getByRole('button', { name: 'Finalizar pedido', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Enviando pedido…', exact: true })).toBeVisible()
  await expect.poll(async () => page.evaluate(async () => {
    const attempt = JSON.parse(sessionStorage.getItem('kurio:checkout-attempt:collector-alex') ?? 'null')
    return attempt ? (await fetch('/api/orders/by-attempt/' + attempt.key)).status : 0
  })).toBe(200)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira', exact: true })).toBeVisible({ timeout: 15_000 })
  expect(posts).toBe(1)
})

test('cotação alterada após revisão exige nova confirmação', async ({ page }) => {
  await login(page)
  await fill(page)
  await review(page)
  await page.evaluate(() => localStorage.setItem('nft-marketplace:scenario', 'price-changed'))
  await page.getByRole('button', { name: 'Finalizar pedido', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Revise seu pedido', exact: true })).toBeHidden()
  await expect(page.locator('.checkout-notice')).toContainText('cotação mudou')
  await expect(page.getByTestId('checkout-total')).toHaveText('27,046218 ETH')
  await expect(page.getByRole('heading', { name: 'Pagamento', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Revise seu pedido', exact: true })).toContainText('27,046218 ETH')
  await confirm(page)
  await expect(page.getByTestId('receipt-total')).toHaveText('27,046218 ETH')
})

test('estoque alterado impede compra e mantém carrinho para correção', async ({ page }) => {
  await login(page)
  await fill(page)
  await page.evaluate(() => localStorage.setItem('nft-marketplace:scenario', 'stock-changed'))
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  await expect(page.locator('.checkout-notice')).toContainText('disponibilidade')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('banner').getByRole('link', { name: /^Carrinho(?:\s|$)/ }).click()
  await expect(page.getByTestId('cart-item')).toHaveCount(3)
  await expect(page.getByTestId('cart-item').first().getByRole('button', { name: 'Aumentar quantidade', exact: false })).toBeDisabled()
})

test('expiração durante checkout preserva contexto para nova sessão', async ({ page }) => {
  await login(page)
  await fill(page)
  await review(page)
  await page.evaluate(() => localStorage.setItem('nft-marketplace:scenario', 'session-expired'))
  await page.getByRole('button', { name: 'Finalizar pedido', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Continuar com conta de demonstração', exact: true })).toBeVisible()
  await page.evaluate(() => localStorage.setItem('nft-marketplace:scenario', 'default'))
  await page.getByRole('button', { name: 'Continuar com conta de demonstração', exact: true }).click()
  await expect(page.getByLabel('Nome de exibição', { exact: false })).toHaveValue('Colecionador Teste')
  await expect(page.getByTestId('payment-item')).toHaveCount(3)
})

test('Socket.IO entrega atualização e recibo permanece imutável', async ({ page }) => {


  await login(page)
  await expect(page.getByText('Atualizações em tempo real conectadas.', { exact: true })).toBeAttached({ timeout: 10_000 })
  await fill(page)
  await review(page)
  await confirm(page)
  await expect(page.getByText('Pedido atualizado em tempo real.', { exact: true })).toBeAttached()
  await page.evaluate(async () => { localStorage.setItem('nft-marketplace:scenario', 'price-changed'); await fetch('/api/quote', { method: 'POST' }) })
  await page.reload()
  await expect(page.getByTestId('receipt-total')).toHaveText('26,846098 ETH')
  await expect(page.getByTestId('payment-item').first()).toContainText('2,38 ETH')
})

test('acesso direto a pedido inexistente exige sessão e não mostra recibo', async ({ page }) => {
  await page.goto('/pedidos/nao-existe')
  await expect(page.getByRole('heading', { name: 'Entre para continuar', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar com conta de demonstração', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Não foi possível consultar o pedido', exact: true })).toBeVisible()
  await expect(page.getByTestId('receipt-total')).toHaveCount(0)
})


test('chave de idempotência recupera pedido e rejeita conteúdo diferente', async ({ page }) => {
  await login(page)
  await fill(page)
  await review(page)
  await page.evaluate(() => localStorage.setItem('nft-marketplace:scenario', 'order-pending'))
  await page.getByRole('button', { name: 'Finalizar pedido', exact: true }).click({ clickCount: 2 })
  await expect(page.getByRole('heading', { name: 'Seu pedido está em processamento', exact: true })).toBeVisible()
  const firstUrl = page.url()
  const outcome = await page.evaluate(async () => {
    const attempt = JSON.parse(sessionStorage.getItem('kurio:checkout-attempt:collector-alex')!)
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': attempt.key }, body: JSON.stringify(attempt.input) }
    const same = await fetch('/api/orders', options)
    const recovered = await same.json()
    const conflict = await fetch('/api/orders', { ...options, body: JSON.stringify({ ...attempt.input, total: '0.01' }) })
    return { status: same.status, id: recovered.id, conflict: conflict.status, code: (await conflict.json()).code }
  })
  expect(outcome.status).toBe(200)
  expect(firstUrl.endsWith(outcome.id)).toBe(true)
  expect(outcome.conflict).toBe(409)
  expect(outcome.code).toBe('IDEMPOTENCY_CONFLICT')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Seu pedido está em processamento', exact: true })).toBeVisible()
  expect(page.url()).toBe(firstUrl)
})

test('troca de conta isola carrinho, carteiras e recibo', async ({ page }) => {
  await login(page)
  await fill(page)
  await review(page)
  await confirm(page)
  const receipt = page.url()
  await page.getByRole('link', { name: 'Fechar confirmação e voltar ao Início', exact: true }).click()
  await page.getByRole('button', { name: 'Conta', exact: true }).click()
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Sua conta', exact: true })).toBeHidden()
  await page.goto('/pagamento')
  await page.getByLabel('Conta de demonstração', { exact: true }).selectOption('collector-sam')
  await page.getByRole('button', { name: 'Continuar com conta de demonstração', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio', exact: true })).toBeVisible()
  await page.goto(receipt)
  await expect(page.getByRole('heading', { name: 'Não foi possível consultar o pedido', exact: true })).toBeVisible()
  await expect(page.getByTestId('receipt-total')).toHaveCount(0)
  await expect(page.getByText('Pedido não encontrado para esta conta.', { exact: true })).toBeVisible()
})
