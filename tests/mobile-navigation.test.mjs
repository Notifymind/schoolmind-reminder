import { test } from 'node:test';
import assert from 'node:assert/strict';
import navigation from '../lib/mobile-navigation.ts';
const { availableMobilePages, defaultMobilePages, parseMobilePages, mobilePages } = navigation;

test('saved navigation supports no links and safely recovers from invalid storage', () => {
  assert.deepEqual(parseMobilePages(null), defaultMobilePages);
  assert.deepEqual(parseMobilePages('broken'), defaultMobilePages);
  assert.deepEqual(parseMobilePages('{}'), defaultMobilePages);
  assert.deepEqual(parseMobilePages('[]'), []);
  assert.deepEqual(parseMobilePages('["/app/settings", "/app/settings", "/app/theming", "/app/navigation", "menu", "/unknown", 1]'), ['/app/settings']);
  assert.deepEqual(parseMobilePages(JSON.stringify(mobilePages.map(page => page.href))), mobilePages.map(page => page.href));
});

test('navigation choices respect admin, seller and subscription access', () => {
  const paths = role => availableMobilePages(role).map(page => page.href);
  for (const role of [undefined, 'free', 'pro']) {
    assert.ok(paths(role).includes('/app/subscription'));
    assert.ok(!paths(role).includes('/app/theming'));
    assert.ok(!paths(role).includes('/app/navigation'));
    assert.ok(paths(role).every(path => !path.includes('/admin/') && !path.includes('/seller/')));
  }
  assert.ok(paths('seller').includes('/app/seller/codes'));
  assert.ok(!paths('seller').includes('/app/admin/overview'));
  assert.ok(!paths('seller').includes('/app/subscription'));
  assert.ok(paths('admin').includes('/app/seller/codes'));
  assert.ok(paths('admin').includes('/app/admin/overview'));
  assert.ok(!paths('admin').includes('/app/subscription'));
});

test('appearance defaults preserve the existing navbar and accept icon-only docked mode', () => {
  const { parseNavigationAppearance } = navigation;
  for (const value of [null, 'broken', 'null', '{}']) {
    assert.deepEqual(parseNavigationAppearance(value), { showLabels: true, floating: true });
  }
  assert.deepEqual(parseNavigationAppearance('{"showLabels":false,"floating":false}'), { showLabels: false, floating: false });
  assert.deepEqual(parseNavigationAppearance('{"showLabels":false}'), { showLabels: false, floating: true });
});

test('dropping pages inserts, reorders and appends without duplicates', () => {
  const { placeNavigationPage } = navigation;
  const selected = ['/app', '/app/notifications', '/app/settings'];
  assert.deepEqual(placeNavigationPage(selected, '/app/account', '/app/notifications'), ['/app', '/app/account', '/app/notifications', '/app/settings']);
  assert.deepEqual(placeNavigationPage(selected, '/app/settings', '/app'), ['/app/settings', '/app', '/app/notifications']);
  assert.deepEqual(placeNavigationPage(selected, '/app'), ['/app/notifications', '/app/settings', '/app']);
  assert.deepEqual(placeNavigationPage(selected, '/app', '/app'), selected);
  assert.deepEqual(placeNavigationPage([], '/app'), ['/app']);
  assert.deepEqual(selected, ['/app', '/app/notifications', '/app/settings']);
});
