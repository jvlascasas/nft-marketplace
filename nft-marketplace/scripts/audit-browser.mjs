import { spawn } from 'node:child_process'
import { Launcher } from 'chrome-launcher'
import { createServer } from 'node:net'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
export async function auditExecutable(fallback, cache) {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  if (!cache) return fallback
  const directories = (await fs.readdir(cache)).filter(name => name.startsWith('chromium_headless_shell-')).sort().reverse()
  async function find(directory, depth = 0) {
    if (depth > 3) return null
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name)
      if (entry.isFile() && ['chrome-headless-shell', 'chrome-headless-shell.exe'].includes(entry.name)) return filename
      if (entry.isDirectory()) { const match = await find(filename, depth + 1); if (match) return match }
    }
    return null
  }
  for (const directory of directories) { const executable = await find(path.join(cache, directory)); if (executable) return executable }
  throw new Error('Chromium headless shell não encontrado. Execute npm run test:install.')
}
export async function closeDebugBrowser(port) {
  try {
    const info = await (await fetch('http://127.0.0.1:' + port + '/json/version')).json()
    await new Promise(resolve => {
      const socket = new WebSocket(info.webSocketDebuggerUrl)
      const timer = setTimeout(() => { socket.close(); resolve() }, 2000)
      socket.onopen = () => socket.send(JSON.stringify({ id: 1, method: 'Browser.close' }))
      socket.onclose = socket.onerror = () => { clearTimeout(timer); resolve() }
    })
  } catch { /* The owned browser may already have exited. */ }
}
export async function openAuditBrowser(executable) {
  const listener = createServer()
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve))
  const port = listener.address().port
  await new Promise(resolve => listener.close(resolve))
  const work = path.resolve(os.tmpdir(), 'kurio-browser-audits')
  await fs.mkdir(work, { recursive: true })
  const profile = await fs.mkdtemp(path.join(work, 'lighthouse-profile-'))
  const flags = [...Launcher.defaultFlags(), '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--metrics-recording-only', '--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank']
  const process = spawn(executable, flags, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true })
  let error = ''
  process.stderr.on('data', bytes => { error = (error + bytes.toString()).slice(-8000) })
  process.on('error', failure => { error = failure.message })
  const close = async () => {
    await closeDebugBrowser(port)
    for (let count = 0; count < 20 && process.exitCode === null; count++) await delay(100)
    if (process.exitCode === null) process.kill()
    if (!profile.startsWith(work + path.sep + 'lighthouse-profile-')) throw new Error('Perfil de auditoria fora da pasta de trabalho.')
    await fs.rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 })
  }
  for (let count = 0; count < 80; count++) {
    try { const response = await fetch('http://127.0.0.1:' + port + '/json/version'); if (response.ok) return { port, close, flags: flags.filter(flag => !flag.startsWith('--user-data-dir=') && !flag.startsWith('--remote-debugging-port=')) } } catch { /* Await the debugging endpoint. */ }
    if (process.exitCode !== null) break
    await delay(100)
  }
  await close()
  throw new Error('Não foi possível iniciar Chromium para a auditoria: ' + error)
}
