// service-worker.js

self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'Driver Recruitment App';
  const options = {
    body: data.body || 'Your application status has been updated.',
    icon: 'https://i.imgur.com/sCEI0fT.png', // Main icon
    badge: 'https://i.imgur.com/sCEI0fT.png' // Monochrome icon for notifications bar
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // This looks for an open window with the app's URL and focuses it.
  // If no window is open, it opens a new one.
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Check if there's a window open with the same URL.
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        // The URL to focus/open.
        if (client.url === self.location.origin + '/#/' && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is found, open one.
      if (clients.openWindow) {
        return clients.openWindow('/#/');
      }
    })
  );
});
