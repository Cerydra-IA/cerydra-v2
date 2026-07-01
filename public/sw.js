// Service Worker — Cerydra Push Notifications

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}

  const options = {
    body: data.body || 'Nouvelle réservation reçue',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'reservation-' + (data.id || Date.now()),
    renotify: true,
    data: { url: '/dashboard/reservations' },
    actions: [
      { action: 'open', title: 'Voir les réservations' },
      { action: 'dismiss', title: 'Ignorer' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification('Cerydra — Nouvelle réservation 🍽️', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/dashboard/reservations'

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(url)
            return client.focus()
          }
        }
        return clients.openWindow(url)
      })
  )
})
