import './index.css'

async function bootstrap() {
  const application = Promise.all([import('react'), import('react-dom/client'), import('./App')])
  const network = import.meta.env.VITE_ENABLE_MOCKS === 'true' ? import('./mocks/browser').then(({ worker }) => worker.start({
      serviceWorker: { url: '/api-mock-worker.js' },
      quiet: true,
      onUnhandledRequest(request, print) {
        if (new URL(request.url).pathname.startsWith('/api/')) print.error()
      },
    })) : Promise.resolve()
  const [[react, { createRoot }, { default: App }]] = await Promise.all([application, network])
  createRoot(document.getElementById('root')!).render(react.createElement(react.StrictMode, null, react.createElement(App)))
}

void bootstrap().catch(error => {
  console.error('Não foi possível iniciar a aplicação.', error)
  const root = document.getElementById('root')!
  root.setAttribute('role', 'alert')
  root.textContent = 'Não foi possível iniciar a aplicação. Recarregue a página para tentar novamente.'
})
