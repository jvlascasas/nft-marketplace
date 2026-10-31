import { createServer } from 'vite'

export default async function globalSetup() {
  // Own the server in-process so teardown does not depend on shell process trees.
  process.env.VITE_ENABLE_MOCKS = 'true'
  const server = await createServer({
    server: { host: '127.0.0.1', port: 4174, strictPort: true },
  })
  await server.listen()
  return async () => { await server.close() }
}
