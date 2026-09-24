import { test } from 'node:test';
import assert from 'node:assert/strict';
import navigation from '../lib/mobile-navigation.ts';
const { availableMobilePages, defaultMobilePages, parseMobilePages, mobilePages } = navigation;

test('saved navigation supports no links and safely recovers from invalid storage', () => {
  assert.deepEqual(parseMobilePages(null), defaultMobilePages);
  assert.deepEqual(parseMobilePages('broken'), defaultMobilePages);
  assert.deepEqual(parseMobilePages('{}'), defaultMobilePages);
  assert.deepEqual(parseMobilePages('[]'), []);
  assert.deepEqual(parseMobilePages('["/app/theming", "/app/theming", "menu", "/unknown", 1]'), ['/app/theming']);
  assert.deepEqual(parseMobilePages(JSON.stringify(mobilePages.map(page => page.href))), mobilePages.map(page => page.href));
});

test('navigation choices respect admin, seller and subscription access', () => {
  const paths = role => availableMobilePages(role).map(page => page.href);
  for (const role of [undefined, 'free', 'pro']) {
    assert.ok(paths(role).includes('/app/subscription'));
    assert.ok(paths(role).includes('/app/theming'));
    assert.ok(paths(role).every(path => !path.includes('/admin/') && !path.includes('/seller/')));
  }
  assert.ok(paths('seller').includes('/app/seller/codes'));
  assert.ok(!paths('seller').includes('/app/admin/overview'));
  assert.ok(!paths('seller').includes('/app/subscription'));
  assert.ok(paths('admin').includes('/app/seller/codes'));
  assert.ok(paths('admin').includes('/app/admin/overview'));
  assert.ok(!paths('admin').includes('/app/subscription'));
});
