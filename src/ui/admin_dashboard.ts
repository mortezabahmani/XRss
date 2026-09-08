export function getAdminDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XRSS Admin Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            darkbg: '#0a0a0a',
            cardbg: '#141414',
            bordercol: '#262626',
            accent: '#3b82f6'
          }
        }
      }
    }
  </script>
</head>
<body class="bg-darkbg text-gray-100 font-mono antialiased min-h-screen p-6">
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <header class="flex justify-between items-center border-b border-bordercol pb-4">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <span class="inline-block w-3 h-3 bg-emerald-500 rounded-full"></span>
          XRSS // Admin Dashboard
        </h1>
        <p class="text-xs text-gray-400 mt-1">Secure Self-Hosted RSS Adapter on Cloudflare Workers</p>
      </div>
      <div class="flex gap-2">
        <a href="/feed.xml" target="_blank" class="px-3 py-1.5 text-xs bg-bordercol hover:bg-gray-800 text-gray-200 rounded border border-bordercol transition">View RSS Feed</a>
      </div>
    </header>

    <!-- Status & Metrics -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-cardbg border border-bordercol p-4 rounded">
        <span class="text-xs text-gray-400 uppercase tracking-wider">Status</span>
        <div id="system-status" class="text-lg font-semibold text-emerald-400 mt-1">Checking...</div>
      </div>
      <div class="bg-cardbg border border-bordercol p-4 rounded">
        <span class="text-xs text-gray-400 uppercase tracking-wider">Storage Engine</span>
        <div id="storage-engine" class="text-lg font-semibold text-blue-400 mt-1">-</div>
      </div>
      <div class="bg-cardbg border border-bordercol p-4 rounded">
        <span class="text-xs text-gray-400 uppercase tracking-wider">Last Sync</span>
        <div id="last-sync" class="text-sm font-semibold text-gray-300 mt-1">-</div>
      </div>
    </div>

    <!-- Actions & Config Panel -->
    <div class="bg-cardbg border border-bordercol p-6 rounded space-y-4">
      <h2 class="text-sm font-bold uppercase tracking-wider text-gray-300 border-b border-bordercol pb-2">Manual Trigger & Feed Sync</h2>
      <div class="space-y-3">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Admin Token (Bearer)</label>
          <input type="password" id="admin-token" placeholder="Enter ADMIN_TOKEN..." class="w-full bg-darkbg border border-bordercol rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent">
        </div>
        <div class="flex gap-3 pt-2">
          <button onclick="triggerUpdate()" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition">Trigger Sync (/update)</button>
          <button onclick="checkHealth()" class="px-4 py-2 bg-bordercol hover:bg-gray-800 text-gray-200 text-xs font-bold rounded border border-bordercol transition">Check Health</button>
        </div>
        <div id="action-result" class="text-xs font-mono mt-2 p-2 rounded hidden"></div>
      </div>
    </div>

    <!-- Instructions / Docs -->
    <div class="bg-cardbg border border-bordercol p-6 rounded space-y-3 text-xs text-gray-400">
      <h2 class="text-sm font-bold uppercase tracking-wider text-gray-300 border-b border-bordercol pb-2">Configuration Guide</h2>
      <p>To configure upstream providers (e.g. X.com handle or API endpoint) and feed metadata, set environment variables or secrets in Wrangler / Cloudflare Dashboard:</p>
      <ul class="list-disc list-inside space-y-1 font-mono text-gray-300">
        <li>PROVIDER_ENDPOINT = "https://api.example.com/posts"</li>
        <li>ADMIN_TOKEN = "your-secret-token"</li>
        <li>FEED_TITLE = "My Custom RSS Feed"</li>
      </ul>
    </div>
  </div>

  <script>
    async function checkHealth() {
      try {
        const res = await fetch('/health');
        const data = await res.json();
        document.getElementById('system-status').innerText = data.status.toUpperCase();
        document.getElementById('storage-engine').innerText = (data.storage || 'KV').toUpperCase();
        document.getElementById('last-sync').innerText = new Date(data.timestamp).toLocaleTimeString();
      } catch (err) {
        document.getElementById('system-status').innerText = 'ERROR';
      }
    }

    async function triggerUpdate() {
      const token = document.getElementById('admin-token').value;
      const resBox = document.getElementById('action-result');
      resBox.classList.remove('hidden', 'bg-red-950', 'bg-emerald-950', 'text-red-400', 'text-emerald-400');
      resBox.innerText = 'Syncing...';

      try {
        const res = await fetch('/update', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token
          }
        });
        const data = await res.json();
        resBox.classList.remove('hidden');
        if (res.ok && data.success) {
          resBox.classList.add('bg-emerald-950', 'text-emerald-400');
          resBox.innerText = 'Success: Synchronized ' + (data.count || 0) + ' posts.';
          checkHealth();
        } else {
          resBox.classList.add('bg-red-950', 'text-red-400');
          resBox.innerText = 'Error: ' + (data.error || 'Unauthorized or failed');
        }
      } catch (err) {
        resBox.classList.remove('hidden');
        resBox.classList.add('bg-red-950', 'text-red-400');
        resBox.innerText = 'Network Error: ' + err.message;
      }
    }

    checkHealth();
  </script>
</body>
</html>`;
}
