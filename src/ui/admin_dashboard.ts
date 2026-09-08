export function getAdminDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XRSS Admin Dashboard</title>
  <style>
    :root {
      --bg: #09090b;
      --card: #121215;
      --border: #27272a;
      --text: #f4f4f5;
      --muted: #a1a1aa;
      --accent: #2563eb;
      --accent-hover: #1d4ed8;
      --success: #10b981;
      --error: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 1.5;
      padding: 24px;
      min-height: 100vh;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
    }
    h1 {
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      background: var(--success);
      border-radius: 50%;
    }
    .btn {
      background: var(--border);
      color: var(--text);
      border: 1px solid var(--border);
      padding: 6px 12px;
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
      border-radius: 4px;
      text-decoration: none;
      transition: background 0.2s;
    }
    .btn:hover { background: #3f3f46; }
    .btn-primary {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
    }
    .btn-primary:hover { background: var(--accent-hover); }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    @media (max-width: 640px) {
      .grid-3 { grid-template-columns: 1fr; }
    }
    .metric-label {
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .metric-value {
      font-size: 15px;
      font-weight: 600;
      margin-top: 4px;
    }
    input[type="password"], input[type="text"] {
      width: 100%;
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 12px;
      font-family: inherit;
      font-size: 13px;
      border-radius: 4px;
      outline: none;
    }
    input:focus { border-color: var(--accent); }
    label {
      display: block;
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 6px;
    }
    .alert {
      padding: 10px 12px;
      border-radius: 4px;
      font-size: 12px;
      display: none;
    }
    .alert-success { background: rgba(16, 185, 129, 0.1); border: 1px solid var(--success); color: var(--success); }
    .alert-error { background: rgba(239, 68, 68, 0.1); border: 1px solid var(--error); color: var(--error); }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Auth Gate Modal / Panel -->
    <div id="auth-panel" class="card">
      <h2 style="font-size: 14px; font-weight: 600;">Authentication Required</h2>
      <p style="color: var(--muted); font-size: 12px;">Enter your admin token (ADMIN_TOKEN) to access the XRSS dashboard.</p>
      <div>
        <label>Admin Token</label>
        <input type="password" id="token-input" placeholder="Enter token...">
      </div>
      <div>
        <button onclick="authenticate()" class="btn btn-primary">Authorize Session</button>
      </div>
      <div id="auth-error" class="alert alert-error">Invalid or missing token.</div>
    </div>

    <!-- Main Dashboard (Protected) -->
    <div id="main-dashboard" class="container hidden" style="width: 100%;">
      <header>
        <h1>
          <span class="status-dot"></span>
          XRSS // Admin Dashboard
        </h1>
        <div style="display: flex; gap: 8px;">
          <a href="/feed.xml" target="_blank" class="btn">View RSS Feed</a>
          <button onclick="logout()" class="btn" style="border-color: var(--error); color: var(--error);">Lock</button>
        </div>
      </header>

      <div class="grid-3">
        <div class="card" style="padding: 14px;">
          <span class="metric-label">Status</span>
          <div id="system-status" class="metric-value" style="color: var(--success);">ONLINE</div>
        </div>
        <div class="card" style="padding: 14px;">
          <span class="metric-label">Storage Engine</span>
          <div id="storage-engine" class="metric-value" style="color: #60a5fa;">KV / D1</div>
        </div>
        <div class="card" style="padding: 14px;">
          <span class="metric-label">Last Checked</span>
          <div id="last-sync" class="metric-value" style="color: var(--muted);">Just now</div>
        </div>
      </div>

      <div class="card">
        <h2 style="font-size: 13px; font-weight: 600; border-bottom: 1px solid var(--border); padding-bottom: 10px;">Manual Feed Synchronization</h2>
        <div>
          <button onclick="triggerUpdate()" class="btn btn-primary">Trigger Sync (/update)</button>
        </div>
        <div id="sync-alert" class="alert"></div>
      </div>

      <div class="card" style="font-size: 12px; color: var(--muted);">
        <h2 style="font-size: 13px; font-weight: 600; color: var(--text); border-bottom: 1px solid var(--border); padding-bottom: 10px;">Security & Architecture</h2>
        <p>XRSS is fully protected. Mutation endpoints require a valid Bearer token. All outputs are strictly sanitized and sandboxed.</p>
      </div>
    </div>
  </div>

  <script>
    function getStoredToken() {
      return sessionStorage.getItem('xrss_token') || '';
    }

    async function authenticate() {
      const token = document.getElementById('token-input').value.trim();
      const errBox = document.getElementById('auth-error');
      errBox.style.display = 'none';

      if (!token) {
        errBox.innerText = 'Token cannot be empty.';
        errBox.style.display = 'block';
        return;
      }

      // Verify token via test POST /update
      try {
        const res = await fetch('/update', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.status === 401) {
          errBox.innerText = 'Unauthorized: Invalid admin token.';
          errBox.style.display = 'block';
          return;
        }
        
        sessionStorage.setItem('xrss_token', token);
        showDashboard();
      } catch (err) {
        errBox.innerText = 'Connection error: ' + err.message;
        errBox.style.display = 'block';
      }
    }

    function showDashboard() {
      document.getElementById('auth-panel').classList.add('hidden');
      document.getElementById('main-dashboard').classList.remove('hidden');
      checkHealth();
    }

    function logout() {
      sessionStorage.removeItem('xrss_token');
      document.getElementById('main-dashboard').classList.add('hidden');
      document.getElementById('auth-panel').classList.remove('hidden');
      document.getElementById('token-input').value = '';
    }

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
      const token = getStoredToken();
      const alertBox = document.getElementById('sync-alert');
      alertBox.style.display = 'block';
      alertBox.className = 'alert';
      alertBox.innerText = 'Synchronizing...';

      try {
        const res = await fetch('/update', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          alertBox.classList.add('alert-success');
          alertBox.innerText = 'Success: Synchronized ' + (data.count || 0) + ' posts.';
          checkHealth();
        } else {
          alertBox.classList.add('alert-error');
          alertBox.innerText = 'Error: ' + (data.error || 'Sync failed');
        }
      } catch (err) {
        alertBox.classList.add('alert-error');
        alertBox.innerText = 'Network Error: ' + err.message;
      }
    }

    // Auto-auth if token stored
    if (getStoredToken()) {
      showDashboard();
    }
  </script>
</body>
</html>`;
}
