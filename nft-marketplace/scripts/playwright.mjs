import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
const require = createRequire(import.meta.url)
const child = spawn(process.execPath, [require.resolve('@playwright/test/cli'), ...process.argv.slice(2)], {
  stdio: 'inherit', env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? path.resolve('node_modules/.cache/ms-playwright') },
})
child.on('error', error => { console.error(error.message); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
