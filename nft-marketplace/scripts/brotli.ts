import type { Plugin } from 'vite'
import { brotliCompress, constants } from 'node:zlib'
import { promisify } from 'node:util'
import { createReadStream } from 'node:fs'
import { readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const compress = promisify(brotliCompress)
export function brotliAssets(): Plugin {
  return {
    name: 'brotli-static-assets',
    async writeBundle(options, bundle) {
      if (!options.dir) return
      for (const item of Object.values(bundle)) {
        if (!/\.(js|css)$/.test(item.fileName)) continue
        // Vite replaces preload markers after generateBundle. Compress the final
        // file on disk so the preview serves exactly the JavaScript being shipped.
        const filename = path.resolve(options.dir, item.fileName)
        const source = await readFile(filename)
        const compressed = await compress(source, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT } })
        await writeFile(filename + '.br', compressed)
      }
    },
    configurePreviewServer(server) {
      const assets = path.resolve(server.config.root, server.config.build.outDir, 'assets')
      server.middlewares.use((request, response, next) => {
        void (async () => {
          const accepts = String(request.headers['accept-encoding'] ?? '').split(',').some(value => /^\s*br(?:\s*;|\s*$)/.test(value) && !/q=0(?:\.0*)?\s*$/.test(value))
          const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
          if (!accepts || !['GET', 'HEAD'].includes(request.method ?? '') || !pathname.startsWith('/assets/') || !/\.(js|css)$/.test(pathname)) return next()
          const filename = path.resolve(assets, decodeURIComponent(pathname.slice('/assets/'.length))) + '.br'
          if (!filename.startsWith(assets + path.sep)) return next()
          try {
            const info = await stat(filename)
            response.statusCode = 200
            response.setHeader('Content-Encoding', 'br')
            response.setHeader('Vary', 'Accept-Encoding')
            response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
            response.setHeader('Content-Type', pathname.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8')
            response.setHeader('Content-Length', info.size)
            if (request.method === 'HEAD') return response.end()
            createReadStream(filename).on('error', error => response.destroy(error)).pipe(response)
          } catch { next() }
        })().catch(next)
      })
    },
  }
}
