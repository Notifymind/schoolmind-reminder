import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

test('session refresh keeps the login form mounted through the email-code step', () => {
  let session = { data: null, isPending: false };
  const redirects = [];
  let hasCheckedSession = false;
  const source = ts.transpileModule(fs.readFileSync('components/auth-redirect.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const dependencies = {
    'react/jsx-runtime': jsx,
    react: {
      useEffect: fn => fn(),
      useState: () => [hasCheckedSession, value => { hasCheckedSession = value; }],
    },
    'next/navigation': { useRouter: () => ({ push: path => redirects.push(path) }) },
    '@/lib/auth-client': { authClient: { useSession: () => session } },
  };
  const context = { exports: {}, require: name => dependencies[name] };
  vm.runInNewContext(source, context);
  const children = jsx.jsx('form', { children: 'Email code' });
  const render = () => context.exports.AuthRedirect({ children });
  session = { data: null, isPending: true };
  assert.equal(render().props.hidden, true, "initial session check stays hidden");
  session = { data: null, isPending: false };
  const visible = render();
  session = { data: null, isPending: true };
  const refreshing = render();
  assert.ok(refreshing, 'session refresh must not unmount the login form');
  assert.equal(refreshing.type, visible.type);
  assert.equal(refreshing.props.hidden, false, "background refresh must not hide the form");
  assert.equal(refreshing.props.children, children);
  session = { data: null, isPending: false };
  assert.equal(render().props.children, children);
  assert.deepEqual(redirects, []);
  session = { data: { user: { id: 'student' } }, isPending: false };
  render();
  assert.deepEqual(redirects, ['/app']);
});
