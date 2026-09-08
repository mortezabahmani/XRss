export function renderAdminLoginView(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XRSS Control Center // Login</title>
  <style>
    :root {
      --bg: #09090b;
      --card: #121215;
      --border: #27272a;
      --text: #f4f4f5;
      --muted: #a1a1aa;
      --accent: #2563eb;
      --accent-hover: #1d4ed8;
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
      max-width: 380px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    h1 { font-size: 18px; font-weight: 600; margin-bottom: 6px; letter-spacing: -0.02em; }
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
    button:hover { background: var(--accent-hover); }
    .alert { padding: 10px 12px; border-radius: 6px; font-size: 12px; margin-top: 12px; display: none; }
    .alert-error { background: rgba(239, 68, 68, 0.1); border: 1px solid var(--error); color: var(--error); }
  </style>
</head>
<body>
  <div class="login-card">
    <h1>XRSS Control Center</h1>
    <p>Enter your administrative token to access operational controls.</p>
    <form onsubmit="handleLogin(event)">
      <label>Admin Token</label>
      <input type="password" id="token" placeholder="Enter ADMIN_TOKEN..." required autofocus>
      <button type="submit">Access Control Center</button>
    </form>
    <div id="login-alert" class="alert"></div>
  </div>
  <script>
    async function handleLogin(e) {
      e.preventDefault();
      const token = document.getElementById('token').value.trim();
      const alertBox = document.getElementById('login-alert');
      alertBox.style.display = 'none';

      try {
        const res = await fetch('/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          window.location.href = '/admin';
        } else {
          alertBox.className = 'alert alert-error';
          alertBox.innerText = data.error || 'Invalid token';
          alertBox.style.display = 'block';
        }
      } catch (err) {
        alertBox.className = 'alert alert-error';
        alertBox.innerText = 'Network error: ' + err.message;
        alertBox.style.display = 'block';
      }
    }
  </script>
</body>
</html>`;
}

export function renderAdminDashboardView(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XRSS Control Center</title>
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
    .container {
      max-width: 1000px;
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
    .dot { width: 6px; height: 6px; background: var(--success); border-radius: 50%; }
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
    .btn-primary { background: var(--accent); border-color: var(--accent); color: #fff; }
    .btn-primary:hover { background: var(--accent-hover); }
    .btn-danger { border-color: rgba(239, 68, 68, 0.3); color: var(--error); }
    .btn-danger:hover { background: rgba(239, 68, 68, 0.1); }
    
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    @media (max-width: 768px) {
      .grid-2, .grid-4 { grid-template-columns: 1fr; }
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      border-bottom: 1px solid var(--border);
      padding-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .metric-label { font-size: 11px; color: var(--muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
    .metric-val { font-size: 18px; font-weight: 600; margin-top: 4px; font-family: ui-monospace, monospace; }

    label { display: block; font-size: 12px; font-weight: 500; color: var(--muted); margin-bottom: 6px; }
    input[type="text"], input[type="url"], input[type="number"] {
      width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text);
      padding: 10px 12px; font-size: 13px; font-family: inherit; border-radius: 6px; outline: none; transition: border-color 0.2s;
    }
    input:focus { border-color: var(--accent); }

    table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
    th { border-bottom: 1px solid var(--border); padding: 10px; color: var(--muted); font-weight: 500; font-size: 11px; text-transform: uppercase; }
    td { border-bottom: 1px solid var(--border); padding: 12px 10px; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    
    .alert { padding: 12px 16px; border-radius: 6px; font-size: 13px; display: none; }
    .alert-success { background: rgba(16, 185, 129, 0.1); border: 1px solid var(--success); color: var(--success); }
    .alert-error { background: rgba(239, 68, 68, 0.1); border: 1px solid var(--error); color: var(--error); }
    .truncate { max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header>
      <h1>
        XRSS Control Center
        <span class="badge"><span class="dot"></span> Active</span>
      </h1>
      <div style="display: flex; gap: 10px;">
        <a href="/feed.xml" target="_blank" class="btn">XML Feed</a>
        <button onclick="logout()" class="btn btn-danger">Logout</button>
      </div>
    </header>

    <!-- Operational Metrics -->
    <div class="grid-4">
      <div class="card">
        <div class="metric-label">Status</div>
        <div id="stat-status" class="metric-val" style="color: var(--success);">HEALTHY</div>
      </div>
      <div class="card">
        <div class="metric-label">Stored Posts</div>
        <div id="stat-count" class="metric-val" style="color: #60a5fa;">0</div>
      </div>
      <div class="card">
        <div class="metric-label">Storage Backend</div>
        <div id="stat-storage" class="metric-val" style="color: var(--muted);">KV / D1</div>
      </div>
      <div class="card">
        <div class="metric-label">Last Sync</div>
        <div id="stat-time" class="metric-val" style="color: var(--muted); font-size: 13px; margin-top: 6px;">-</div>
      </div>
    </div>

    <!-- Error Banner (if lastError exists) -->
    <div id="error-banner" class="alert alert-error" style="display: none; width: 100%;">
      <strong>Last Upstream Error:</strong> <span id="error-text"></span>
    </div>

    <!-- Settings & Operations Grid -->
    <div class="grid-2">
      <!-- Config Form -->
      <div class="card">
        <div class="card-title">X Feed Settings</div>
        <form onsubmit="saveConfig(event)" style="display: flex; flex-direction: column; gap: 12px;">
          <div>
            <label>X (Twitter) Username</label>
            <input type="text" id="cfg-username" placeholder="e.g. elonmusk">
          </div>
          <div>
            <label>Fallback / Custom Endpoint URL</label>
            <input type="url" id="cfg-endpoint" placeholder="https://nitter.poast.org/username/rss">
          </div>
          <div>
            <label>Feed Title</label>
            <input type="text" id="cfg-title" placeholder="My X Feed">
          </div>
          <div>
            <label>Feed Description</label>
            <input type="text" id="cfg-desc" placeholder="Public posts from X">
          </div>
          <div>
            <label>Max Retention Posts</label>
            <input type="number" id="cfg-max" value="100" min="10" max="500">
          </div>
          <div style="margin-top: 4px;">
            <button type="submit" class="btn btn-primary" style="width: 100%;">Save Settings</button>
          </div>
        </form>
        <div id="config-alert" class="alert"></div>
      </div>

      <!-- Sync Controls & Runtime Info -->
      <div class="card">
        <div class="card-title">Manual & Scheduled Sync</div>
        <p style="color: var(--muted); font-size: 13px;">
          Periodic updates run via Cloudflare Cron Triggers every 4 hours. Click below to execute an immediate fetch and update storage.
        </p>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px;">
          <button onclick="triggerSync()" class="btn btn-primary">Sync Now (/update)</button>
          <button onclick="refreshPosts()" class="btn">Refresh View</button>
        </div>
        <div id="action-alert" class="alert"></div>
      </div>
    </div>

    <!-- Posts Table -->
    <div class="card">
      <div class="card-title">
        Cached Posts
        <span id="posts-count-badge" style="font-size: 12px; font-weight: normal; color: var(--muted);">0 items</span>
      </div>
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>Title / Content</th>
              <th>Author</th>
              <th>Published</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody id="posts-body">
            <tr>
              <td colspan="4" style="color: var(--muted); text-align: center; padding: 24px;">Loading feed items...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    async function logout() {
      await fetch('/admin/logout', { method: 'POST' });
      window.location.href = '/admin';
    }

    async function loadStatsAndPosts() {
      try {
        const res = await fetch('/api/stats');
        if (res.status === 401) {
          window.location.href = '/admin';
          return;
        }
        if (res.ok) {
          const data = await res.json();
          document.getElementById('stat-status').innerText = (data.status || 'OK').toUpperCase();
          document.getElementById('stat-count').innerText = data.count || 0;
          document.getElementById('stat-storage').innerText = (data.storage || 'NONE').toUpperCase();
          document.getElementById('stat-time').innerText = data.lastUpdate ? new Date(data.lastUpdate).toLocaleTimeString() : 'Never';
          document.getElementById('posts-count-badge').innerText = (data.count || 0) + ' items';

          const errBanner = document.getElementById('error-banner');
          if (data.lastError) {
            document.getElementById('error-text').innerText = data.lastError;
            errBanner.style.display = 'block';
          } else {
            errBanner.style.display = 'none';
          }

          if (data.xUsername) document.getElementById('cfg-username').value = data.xUsername;
          if (data.providerEndpoint) document.getElementById('cfg-endpoint').value = data.providerEndpoint;
          if (data.feedTitle) document.getElementById('cfg-title').value = data.feedTitle;
          if (data.feedDescription) document.getElementById('cfg-desc').value = data.feedDescription;
          if (data.maxPosts) document.getElementById('cfg-max').value = data.maxPosts;

          renderPostsTable(data.posts || []);
        }
      } catch (err) {
        console.error('Failed to load stats', err);
      }
    }

    async function saveConfig(e) {
      e.preventDefault();
      const username = document.getElementById('cfg-username').value.trim();
      const endpoint = document.getElementById('cfg-endpoint').value.trim();
      const title = document.getElementById('cfg-title').value.trim();
      const description = document.getElementById('cfg-desc').value.trim();
      const maxPosts = parseInt(document.getElementById('cfg-max').value, 10);

      const alertBox = document.getElementById('config-alert');
      alertBox.style.display = 'block';
      alertBox.className = 'alert';
      alertBox.innerText = 'Saving configuration...';

      try {
        const res = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ xUsername: username, providerEndpoint: endpoint, feedTitle: title, feedDescription: description, maxPosts })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          alertBox.className = 'alert alert-success';
          alertBox.innerText = 'Settings saved successfully.';
          loadStatsAndPosts();
        } else {
          alertBox.className = 'alert alert-error';
          alertBox.innerText = 'Error: ' + (data.error || 'Failed to save');
        }
      } catch (err) {
        alertBox.className = 'alert alert-error';
        alertBox.innerText = 'Network error: ' + err.message;
      }
    }

    function renderPostsTable(posts) {
      const tbody = document.getElementById('posts-body');
      if (!posts || posts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="color: var(--muted); text-align: center; padding: 24px;">No posts stored yet. Click Sync Now to fetch posts.</td></tr>';
        return;
      }
      tbody.innerHTML = posts.map(p => \`
        <tr>
          <td>
            <div style="font-weight: 500; color: var(--text);" class="truncate">\${escapeHtml(p.title || 'Untitled')}</div>
          </td>
          <td style="color: var(--muted);">@\${escapeHtml((p.author || '').replace(/^@/, ''))}</td>
          <td style="color: var(--muted); font-family: monospace; font-size: 12px;">\${new Date(p.publishedAt).toLocaleDateString()}</td>
          <td><a href="\${escapeHtml(p.url)}" target="_blank" style="color: var(--accent); text-decoration: none;">View ↗</a></td>
        </tr>
      \`).join('');
    }

    function escapeHtml(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    async function triggerSync() {
      const alertBox = document.getElementById('action-alert');
      alertBox.style.display = 'block';
      alertBox.className = 'alert';
      alertBox.innerText = 'Fetching and processing posts...';

      try {
        const res = await fetch('/update', { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.success) {
          alertBox.className = 'alert alert-success';
          alertBox.innerText = 'Sync Successful: Processed ' + (data.count || 0) + ' posts.';
          loadStatsAndPosts();
        } else {
          alertBox.className = 'alert alert-error';
          alertBox.innerText = 'Sync Error: ' + (data.error || 'Update failed');
          loadStatsAndPosts();
        }
      } catch (err) {
        alertBox.className = 'alert alert-error';
        alertBox.innerText = 'Network error: ' + err.message;
      }
    }

    function refreshPosts() { loadStatsAndPosts(); }

    loadStatsAndPosts();
  </script>
</body>
</html>`;
}
