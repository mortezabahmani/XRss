export function getAdminLoginHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XRSS // Authentication Required</title>
  <style>
    :root {
      --bg: #09090b;
      --card: #121215;
      --border: #27272a;
      --text: #f4f4f5;
      --muted: #a1a1aa;
      --accent: #3b82f6;
      --error: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 16px;
    }
    .login-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 32px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    h1 { font-size: 18px; font-weight: 600; margin-bottom: 8px; letter-spacing: -0.02em; }
    p { font-size: 13px; color: var(--muted); margin-bottom: 24px; }
    label { display: block; font-size: 12px; font-weight: 500; color: var(--muted); margin-bottom: 8px; }
    input {
      width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text);
      padding: 10px 14px; font-size: 14px; border-radius: 6px; outline: none; transition: border-color 0.2s;
    }
    input:focus { border-color: var(--accent); }
    button {
      width: 100%; background: var(--accent); color: #fff; border: none; padding: 10px 16px;
      font-size: 14px; font-weight: 500; border-radius: 6px; cursor: pointer; margin-top: 16px; transition: background 0.2s;
    }
    button:hover { background: #2563eb; }
    .error {
      margin-top: 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--error);
      color: var(--error); padding: 8px 12px; border-radius: 6px; font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="login-card">
    <h1>XRSS Administration</h1>
    <p>Enter your administrative token to access the secure dashboard.</p>
    <form onsubmit="handleLogin(event)">
      <label>Admin Token</label>
      <input type="password" id="token" placeholder="Enter ADMIN_TOKEN..." required autofocus>
      <button type="submit">Authenticate</button>
    </form>
    <div id="error-msg" class="error" style="display: none;">Invalid token. Please try again.</div>
  </div>
  <script>
    function handleLogin(e) {
      e.preventDefault();
      const token = document.getElementById('token').value.trim();
      window.location.href = '/admin?token=' + encodeURIComponent(token);
    }
  </script>
</body>
</html>`;
}

export function getAdminDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XRSS Admin Control Center</title>
  <style>
    :root {
      --bg: #09090b;
      --card: #121215;
      --card-hover: #18181b;
      --border: #27272a;
      --text: #f4f4f5;
      --muted: #a1a1aa;
      --accent: #3b82f6;
      --accent-hover: #2563eb;
      --success: #10b981;
      --error: #ef4444;
      --warning: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      padding: 32px 16px;
      min-height: 100vh;
    }
    .wrapper {
      max-width: 960px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 20px;
    }
    h1 {
      font-size: 18px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      letter-spacing: -0.02em;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: var(--success);
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 500;
    }
    .dot {
      width: 6px;
      height: 6px;
      background: var(--success);
      border-radius: 50%;
    }
    .btn {
      background: var(--card);
      color: var(--text);
      border: 1px solid var(--border);
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      border-radius: 6px;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn:hover { background: #27272a; border-color: #3f3f46; }
    .btn-primary {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
    }
    .btn-primary:hover { background: var(--accent-hover); }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    @media (max-width: 768px) {
      .grid-2, .grid-3 { grid-template-columns: 1fr; }
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      border-bottom: 1px solid var(--border);
      padding-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .metric-label {
      font-size: 11px;
      color: var(--muted);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .metric-val {
      font-size: 18px;
      font-weight: 600;
      margin-top: 4px;
      font-family: ui-monospace, monospace;
    }
    label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: var(--muted);
      margin-bottom: 6px;
    }
    input[type="text"], input[type="url"] {
      width: 100%;
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 10px 12px;
      font-size: 13px;
      font-family: inherit;
      border-radius: 6px;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus { border-color: var(--accent); }
    .alert {
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 13px;
      display: none;
    }
    .alert-success { background: rgba(16, 185, 129, 0.1); border: 1px solid var(--success); color: var(--success); }
    .alert-error { background: rgba(239, 68, 68, 0.1); border: 1px solid var(--error); color: var(--error); }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Header -->
    <header>
      <h1>
        XRSS Control Center
        <span class="badge">
          <span class="dot"></span>
          Secure Session
        </span>
      </h1>
      <div style="display: flex; gap: 10px;">
        <a href="/feed.xml" target="_blank" class="btn">View Live RSS Feed</a>
        <button onclick="logout()" class="btn" style="border-color: rgba(239, 68, 68, 0.3); color: var(--error);">Logout</button>
      </div>
    </header>

    <!-- Metrics Grid -->
    <div class="grid-3">
      <div class="card" style="padding: 18px;">
        <div class="metric-label">System Status</div>
        <div id="status" class="metric-val" style="color: var(--success);">ONLINE</div>
      </div>
      <div class="card" style="padding: 18px;">
        <div class="metric-label">Storage Engine</div>
        <div id="storage" class="metric-val" style="color: #60a5fa;">KV / D1</div>
      </div>
      <div class="card" style="padding: 18px;">
        <div class="metric-label">Last Sync</div>
        <div id="time" class="metric-val" style="color: var(--muted); font-size: 14px; margin-top: 8px;">Never</div>
      </div>
    </div>

    <!-- Configuration & Provider Panel -->
    <div class="grid-2">
      <!-- Provider Settings -->
      <div class="card">
        <div class="card-title">Provider & Feed Settings</div>
        <form onsubmit="saveConfig(event)" style="display: flex; flex-direction: column; gap: 14px;">
          <div>
            <label>Upstream Endpoint / X.com RSS Bridge URL</label>
            <input type="url" id="cfg-endpoint" placeholder="https://rss.app/feeds/... or Nitter/X.com JSON API" required>
            <span style="font-size: 11px; color: var(--muted); margin-top: 4px; display: block;">Supports RSS, Atom, or JSON endpoints (e.g. Nitter or RSS.app for X.com).</span>
          </div>
          <div>
            <label>Feed Title</label>
            <input type="text" id="cfg-title" placeholder="My Custom Feed">
          </div>
          <div>
            <label>Feed Description</label>
            <input type="text" id="cfg-desc" placeholder="Converted RSS feed">
          </div>
          <div>
            <button type="submit" class="btn btn-primary">Save Configuration</button>
          </div>
        </form>
        <div id="config-alert" class="alert"></div>
      </div>

      <!-- Operations & Actions -->
      <div class="card">
        <div class="card-title">Operations</div>
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <span style="font-size: 12px; color: var(--muted); display: block; margin-bottom: 8px;">Manually trigger scraping and normalization from the configured provider endpoint.</span>
            <button onclick="triggerSync()" class="btn btn-primary" style="width: 100%;">Run Instant Sync (/update)</button>
          </div>
          <div style="border-top: 1px solid var(--border); padding-top: 16px;">
            <span style="font-size: 12px; color: var(--muted); display: block; margin-bottom: 8px;">Automatic background polling runs periodically via Cloudflare Workers Cron Triggers.</span>
            <div style="font-size: 12px; color: var(--success); font-family: monospace;">● Cron Active (Every 1h / Scheduled)</div>
          </div>
        </div>
        <div id="sync-alert" class="alert"></div>
      </div>
    </div>
  </div>

  <script>
    const urlParams = new URLSearchParams(window.location.search);
    const queryToken = urlParams.get('token');
    if (queryToken) {
      sessionStorage.setItem('xrss_token', queryToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    function getToken() {
      return sessionStorage.getItem('xrss_token') || '';
    }

    function logout() {
      sessionStorage.removeItem('xrss_token');
      window.location.href = '/admin';
    }

    async function loadConfig() {
      try {
        const res = await fetch('/config', {
          headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        if (res.ok) {
          const cfg = await res.json();
          if (cfg.endpoint) document.getElementById('cfg-endpoint').value = cfg.endpoint;
          if (cfg.title) document.getElementById('cfg-title').value = cfg.title;
          if (cfg.description) document.getElementById('cfg-desc').value = cfg.description;
        }
      } catch (err) {
        console.error('Failed to load config', err);
      }
    }

    async function saveConfig(e) {
      e.preventDefault();
      const endpoint = document.getElementById('cfg-endpoint').value.trim();
      const title = document.getElementById('cfg-title').value.trim();
      const description = document.getElementById('cfg-desc').value.trim();
      const alertBox = document.getElementById('config-alert');

      alertBox.style.display = 'block';
      alertBox.className = 'alert';
      alertBox.innerText = 'Saving configuration...';

      try {
        const res = await fetch('/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getToken()
          },
          body: JSON.stringify({ endpoint, title, description })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          alertBox.classList.add('alert-success');
          alertBox.innerText = 'Configuration saved successfully.';
        } else {
          alertBox.classList.add('alert-error');
          alertBox.innerText = 'Error: ' + (data.error || 'Failed to save');
        }
      } catch (err) {
        alertBox.classList.add('alert-error');
        alertBox.innerText = 'Network Error: ' + err.message;
      }
    }

    async function checkHealth() {
      try {
        const res = await fetch('/health');
        const data = await res.json();
        document.getElementById('status').innerText = data.status.toUpperCase();
        document.getElementById('storage').innerText = (data.storage || 'KV').toUpperCase();
        if (data.timestamp) {
          document.getElementById('time').innerText = new Date(data.timestamp).toLocaleTimeString();
        }
      } catch (err) {
        document.getElementById('status').innerText = 'ERROR';
      }
    }

    async function triggerSync() {
      const alertBox = document.getElementById('sync-alert');
      alertBox.style.display = 'block';
      alertBox.className = 'alert';
      alertBox.innerText = 'Synchronizing...';

      try {
        const res = await fetch('/update', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + getToken() }
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

    checkHealth();
    loadConfig();
  </script>
</body>
</html>`;
}
