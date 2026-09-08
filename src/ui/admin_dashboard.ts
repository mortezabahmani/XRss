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
    h1 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    p {
      font-size: 13px;
      color: var(--muted);
      margin-bottom: 24px;
    }
    label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: var(--muted);
      margin-bottom: 8px;
    }
    input {
      width: 100%;
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 10px 14px;
      font-size: 14px;
      border-radius: 6px;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus { border-color: var(--accent); }
    button {
      width: 100%;
      background: var(--accent);
      color: #fff;
      border: none;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 500;
      border-radius: 6px;
      cursor: pointer;
      margin-top: 16px;
      transition: background 0.2s;
    }
    button:hover { background: #2563eb; }
    .error {
      margin-top: 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--error);
      color: var(--error);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
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
      // Redirect to /admin?token=... which will set cookie or authenticate server-side
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
  <title>XRSS Admin Dashboard</title>
  <style>
    :root {
      --bg: #09090b;
      --card: #121215;
      --border: #27272a;
      --text: #f4f4f5;
      --muted: #a1a1aa;
      --accent: #3b82f6;
      --success: #10b981;
      --error: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      padding: 32px 16px;
      min-height: 100vh;
    }
    .wrapper {
      max-width: 900px;
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
      font-size: 12px;
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
    .btn-primary:hover { background: #2563eb; }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    @media (max-width: 768px) {
      .grid { grid-template-columns: 1fr; }
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
    }
    .metric-label {
      font-size: 12px;
      color: var(--muted);
      font-weight: 500;
    }
    .metric-val {
      font-size: 20px;
      font-weight: 600;
      margin-top: 4px;
      font-family: ui-monospace, monospace;
    }
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
    <header>
      <h1>
        XRSS Dashboard
        <span class="badge">
          <span class="dot"></span>
          Authenticated
        </span>
      </h1>
      <div style="display: flex; gap: 10px;">
        <a href="/feed.xml" target="_blank" class="btn">View RSS Feed</a>
        <button onclick="logout()" class="btn" style="border-color: rgba(239, 68, 68, 0.3); color: var(--error);">Logout</button>
      </div>
    </header>

    <div class="grid">
      <div class="card" style="padding: 18px;">
        <div class="metric-label">System Status</div>
        <div id="status" class="metric-val" style="color: var(--success);">ONLINE</div>
      </div>
      <div class="card" style="padding: 18px;">
        <div class="metric-label">Storage Engine</div>
        <div id="storage" class="metric-val" style="color: #60a5fa;">KV/D1</div>
      </div>
      <div class="card" style="padding: 18px;">
        <div class="metric-label">Last Ping</div>
        <div id="time" class="metric-val" style="color: var(--muted); font-size: 14px; margin-top: 8px;">Just now</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Manual Synchronization</div>
      <p style="color: var(--muted); font-size: 13px;">Trigger an immediate fetch and normalize cycle from the upstream provider endpoint.</p>
      <div>
        <button onclick="triggerSync()" class="btn btn-primary">Run Sync Now (/update)</button>
      </div>
      <div id="alert" class="alert"></div>
    </div>

    <div class="card" style="color: var(--muted); font-size: 13px;">
      <div class="card-title" style="color: var(--text);">Security & Protocol Compliance</div>
      <p>Server-side authentication enforced. All upstream payloads sanitized against XSS/SSRF.</p>
    </div>
  </div>

  <script>
    // Extract token from URL query if present, store in sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const queryToken = urlParams.get('token');
    if (queryToken) {
      sessionStorage.setItem('xrss_token', queryToken);
      // Clean URL query parameter without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    function getToken() {
      return sessionStorage.getItem('xrss_token') || '';
    }

    function logout() {
      sessionStorage.removeItem('xrss_token');
      window.location.href = '/admin';
    }

    async function checkHealth() {
      try {
        const res = await fetch('/health');
        const data = await res.json();
        document.getElementById('status').innerText = data.status.toUpperCase();
        document.getElementById('storage').innerText = (data.storage || 'KV').toUpperCase();
        document.getElementById('time').innerText = new Date(data.timestamp).toLocaleTimeString();
      } catch (err) {
        document.getElementById('status').innerText = 'ERROR';
      }
    }

    async function triggerSync() {
      const token = getToken();
      const alertBox = document.getElementById('alert');
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

    checkHealth();
  </script>
</body>
</html>`;
}
