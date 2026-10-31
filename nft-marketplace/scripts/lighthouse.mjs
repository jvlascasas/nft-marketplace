import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import lighthouse from 'lighthouse'
import { auditExecutable, openAuditBrowser } from './audit-browser.mjs'
import { preview } from 'vite'
import config from '../lighthouse.config.mjs'

const root = process.cwd()
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(path.join(root, 'node_modules/.cache/ms-playwright'))) process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, 'node_modules/.cache/ms-playwright')
const { chromium } = await import('@playwright/test')
const executable = await auditExecutable(chromium.executablePath(), process.env.PLAYWRIGHT_BROWSERS_PATH)
const require = createRequire(import.meta.url)
const args = Object.fromEntries(process.argv.slice(2).map(value => { const [key, ...rest] = value.replace(/^--/, '').split('='); return [key, rest.join('=') || true] }))
const runs = args.runs ? Number(args.runs) : config.runs
if (![1, 3].includes(runs)) throw new Error('Use --runs=1 para diagnóstico ou três medições na entrega.')
const diagnostic = runs !== 3 || args.page || args.profile || args.method
const output = path.resolve(root, diagnostic ? 'work/lighthouse-diagnostic' : 'reports/lighthouse')
await fs.mkdir(output, { recursive: true })
const server = await preview({ preview: { host: '127.0.0.1', port: 4176, strictPort: true } })
const origin = 'http://127.0.0.1:4176'
const version = async name => JSON.parse(await fs.readFile(require.resolve(name + '/package.json'), 'utf8')).version
const hash = createHash('sha256')
for (const file of ['index.html', ...(await fs.readdir(path.join(root, 'dist/assets'))).sort().map(file => 'assets/' + file)]) hash.update(await fs.readFile(path.join(root, 'dist', file)))
const summary = {
  generatedAt: new Date().toISOString(), diagnostic: !!diagnostic,
  environment: { platform: os.platform(), release: os.release(), architecture: os.arch(), cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, memoryGiB: +(os.totalmem() / 1024 ** 3).toFixed(1), node: process.version, lighthouse: await version('lighthouse'), playwright: await version('@playwright/test'), msw: await version('msw'), chrome: '', browserExecutable: path.basename(executable), buildSha256: hash.digest('hex') },
  conditions: 'Build Vite de produção, mocks padrão habilitados, dados anônimos iniciais, recursos locais, Chromium headless shell for Testing (mesmo binário dos testes Playwright) com perfil novo por medição, execução sequencial, throttling oficial mobile/desktop e viewports 390×844 / 1440×900. Nenhum conteúdo foi removido para a auditoria.',
  thresholds: config.thresholds, preflight: null, runs: [], medians: [],
}
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
try {
  // Verify the production build with an isolated browser, separate from all measured runs.
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(origin)
    await page.getByTestId('nft-card').nth(8).waitFor()
    await page.getByTestId('realtime-connection').filter({ hasText: 'Conexão do marketplace ativa.' }).waitFor({ state: 'attached' })
    await page.goto(origin + '/mercado')
    await page.getByRole('heading', { name: 'Emerald Ape #042', exact: true }).waitFor()
    await page.locator('.gallery-main img').evaluate(image => image.decode())
    summary.preflight = { catalogCards: 9, detail: 'Emerald Ape #042', socket: 'connected', image: 'decoded', mock: (await page.evaluate(async () => (await (await fetch('/api/health')).json()).mode)) }
    if (summary.preflight.mock !== 'mock') throw new Error('O build de demonstração deve carregar o MSW.')
  } finally { await browser.close() }
  for (const page of config.pages.filter(page => !args.page || page.name === args.page)) {
    for (const [profile, settings] of Object.entries(config.profiles).filter(([profile]) => !args.profile || profile === args.profile)) {
      for (let run = 1; run <= runs; run++) {
        const chrome = await openAuditBrowser(executable)
        const port = chrome.port
        try {
          summary.environment.chrome = (await (await fetch('http://127.0.0.1:' + port + '/json/version')).json()).Browser
          const result = await lighthouse(origin + page.path, { port: port, output: ['html', 'json'], logLevel: 'error' }, args.method ? { ...settings, settings: { ...settings.settings, throttlingMethod: args.method } } : settings)
          if (!result || result.lhr.runtimeError) throw new Error(JSON.stringify(result?.lhr.runtimeError ?? 'Lighthouse não retornou um relatório.'))
          const name = page.name + '-' + profile + '-' + run
          const [html, json] = result.report
          await fs.writeFile(path.join(output, name + '.html'), html)
          await fs.writeFile(path.join(output, name + '.json'), json)
          const scores = Object.fromEntries(Object.keys(config.thresholds).map(category => [category, Math.round(result.lhr.categories[category].score * 100)]))
          const item = { page: page.name, path: page.path, profile, run, scores, lcpMs: result.lhr.audits['largest-contentful-paint'].numericValue, cls: result.lhr.audits['cumulative-layout-shift'].numericValue, tbtMs: result.lhr.audits['total-blocking-time'].numericValue, warnings: result.lhr.runWarnings, configSettings: result.lhr.configSettings, report: name }
          summary.runs.push(item)
          console.log(name + ': ' + JSON.stringify({ ...scores, lcpMs: Math.round(item.lcpMs), cls: +item.cls.toFixed(4), tbtMs: Math.round(item.tbtMs) }))
        } finally { await chrome.close() }
      }
      const measured = summary.runs.filter(item => item.page === page.name && item.profile === profile)
      const scores = Object.fromEntries(Object.keys(config.thresholds).map(category => [category, median(measured.map(item => item.scores[category]))]))
      summary.medians.push({ page: page.name, profile, scores, lcpMs: median(measured.map(item => item.lcpMs)), cls: median(measured.map(item => item.cls)), tbtMs: median(measured.map(item => item.tbtMs)), passed: Object.entries(config.thresholds).every(([key, minimum]) => scores[key] >= minimum) })
    }
  }
  if (!summary.runs.length) throw new Error('Página ou perfil de auditoria inválido.')
  await fs.writeFile(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2))
  const rows = summary.medians.map(item => '| ' + item.page + ' | ' + item.profile + ' | ' + Object.values(item.scores).join(' | ') + ' | ' + Math.round(item.lcpMs) + ' | ' + item.cls.toFixed(4) + ' | ' + Math.round(item.tbtMs) + ' | ' + (item.passed ? 'Sim' : 'Não') + ' |')
  await fs.writeFile(path.join(output, 'README.md'), '# Lighthouse\n\n' + summary.conditions + '\n\n| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP (ms) | CLS | TBT (ms) | Metas atingidas |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n' + rows.join('\n') + '\n\nMedianas de ' + runs + ' medições por combinação. Os arquivos HTML/JSON individuais estão nesta pasta. Versões, ambiente, configurações, hash do build e valores de todas as medições constam em summary.json.\n')
  if (!diagnostic && summary.medians.some(item => !item.passed)) process.exitCode = 1
} finally { await new Promise(resolve => server.httpServer.close(resolve)) }
