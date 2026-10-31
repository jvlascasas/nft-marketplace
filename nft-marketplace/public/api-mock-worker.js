/* Keep static files on the browser's native network path. Only REST APIs need mocking. */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (url.origin === self.location.origin && !url.pathname.startsWith('/api/')) event.stopImmediatePropagation()
})

// The generated MSW worker stays intact, including its version/integrity handshake.
importScripts('./mockServiceWorker.js')
