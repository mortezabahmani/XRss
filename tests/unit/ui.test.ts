import { describe, it, expect } from 'vitest';
import { renderAdminDashboardView, renderAdminLoginView } from '../../src/ui/admin';

describe('Admin UI Views', () => {
  it('should render admin login view with required elements', () => {
    const html = renderAdminLoginView();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('XRSS Control Center // Login');
    expect(html).toContain('id="token"');
    expect(html).toContain('handleLogin(event)');
  });

  it('should render admin dashboard view with extracted components', () => {
    const html = renderAdminDashboardView();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>XRSS Control Center</title>');
    expect(html).toContain('id="stat-status"');
    expect(html).toContain('id="stat-count"');
    expect(html).toContain('id="stat-storage"');
    expect(html).toContain('id="stat-time"');
    expect(html).toContain('id="cfg-username"');
    expect(html).toContain('id="cfg-endpoint"');
    expect(html).toContain('id="posts-body"');
    expect(html).toContain('loadStatsAndPosts()');
  });
});
