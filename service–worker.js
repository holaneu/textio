self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);

  // Check if the request has a fileHandler parameter
  if (url.searchParams.has('fileHandler')) {
      event.respondWith(
          fetch(event.request).then(response => response)
      );
  }
});
