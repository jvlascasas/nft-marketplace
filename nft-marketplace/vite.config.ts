import { brotliAssets } from './scripts/brotli.ts'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  server: { watch: { ignored: ['**/work/**', '**/reports/**', '**/test-results/**', '**/playwright-report/**'] } },
  build: { cssCodeSplit: false },
  plugins: [react(), tailwindcss(), brotliAssets(), {
    name: 'preload-bootstrap-modules',
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        if (!context.bundle) return []
        return Object.values(context.bundle).filter(chunk => chunk.type === 'chunk' && chunk.facadeModuleId && ['/src/mocks/browser.ts', '/src/App.tsx', '/react-dom/client.js', '/src/mocks/basic-handlers.ts', '/src/mocks/cart-handlers.ts', '/src/mocks/catalog-handlers.ts', '/src/mocks/detail-handlers.ts'].some(suffix => chunk.facadeModuleId!.replaceAll('\\', '/').endsWith(suffix))).map(chunk => ({ tag: 'link', attrs: { rel: 'modulepreload', href: '/' + chunk.fileName, crossorigin: '', fetchpriority: 'high' }, injectTo: 'head-prepend' as const }))
      },
    },
  }],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
