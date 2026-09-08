import { describe, it, expect } from 'vitest';
import { renderAdminLoginView, renderAdminDashboardView } from '../../src/ui/admin';

describe('Admin UI Views', () => {
  describe('renderAdminLoginView', () => {
    it('returns valid HTML document with correct title and structure', () => {
      const html = renderAdminLoginView();

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('<title>XRSS Control Center // Login</title>');
    });

    it('contains login form controls and password input field', () => {
      const html = renderAdminLoginView();

      expect(html).toContain('<form onsubmit="handleLogin(event)">');
      expect(html).toContain('<input type="password" id="token"');
      expect(html).toContain('placeholder="Enter ADMIN_TOKEN..."');
      expect(html).toContain('<button type="submit">Access Control Center</button>');
      expect(html).toContain('<div id="login-alert" class="alert"></div>');
    });

    it('includes inline script targeting /admin/login endpoint', () => {
      const html = renderAdminLoginView();

      expect(html).toContain('fetch(\'/admin/login\'');
      expect(html).toContain("method: 'POST'");
      expect(html).toContain('body: JSON.stringify({ token })');
    });
  });

  describe('renderAdminDashboardView', () => {
    it('returns valid HTML document with dashboard title', () => {
      const html = renderAdminDashboardView();

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('<title>XRSS Control Center</title>');
    });

    it('contains header with feed XML link and logout handler', () => {
      const html = renderAdminDashboardView();

      expect(html).toContain('href="/feed.xml"');
      expect(html).toContain('onclick="logout()"');
      expect(html).toContain('fetch(\'/admin/logout\'');
    });

    it('contains operational metric cards with target DOM element IDs', () => {
      const html = renderAdminDashboardView();

      expect(html).toContain('id="stat-status"');
      expect(html).toContain('id="stat-count"');
      expect(html).toContain('id="stat-storage"');
      expect(html).toContain('id="stat-time"');
      expect(html).toContain('id="error-banner"');
      expect(html).toContain('id="error-text"');
    });

    it('contains X feed configuration form with inputs and submit handler', () => {
      const html = renderAdminDashboardView();

      expect(html).toContain('onsubmit="saveConfig(event)"');
      expect(html).toContain('id="cfg-username"');
      expect(html).toContain('id="cfg-endpoint"');
      expect(html).toContain('id="cfg-title"');
      expect(html).toContain('id="cfg-desc"');
      expect(html).toContain('id="cfg-max"');
      expect(html).toContain('id="config-alert"');
    });

    it('contains operations controls for triggering manual sync', () => {
      const html = renderAdminDashboardView();

      expect(html).toContain('onclick="triggerSync()"');
      expect(html).toContain('onclick="refreshPosts()"');
      expect(html).toContain('fetch(\'/update\'');
      expect(html).toContain('id="action-alert"');
    });

    it('contains posts cached table structure and badges', () => {
      const html = renderAdminDashboardView();

      expect(html).toContain('id="posts-count-badge"');
      expect(html).toContain('id="posts-body"');
      expect(html).toContain('Title / Content');
      expect(html).toContain('Author');
      expect(html).toContain('Published');
      expect(html).toContain('Link');
    });

    it('includes inline script targeting /api/stats and /api/config', () => {
      const html = renderAdminDashboardView();

      expect(html).toContain('fetch(\'/api/stats\')');
      expect(html).toContain('fetch(\'/api/config\'');
      expect(html).toContain('function escapeHtml(str)');
    });
  });
});
