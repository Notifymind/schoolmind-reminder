import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

function load(file, dependencies, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const context = { exports: {}, ...globals, require: name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  }};
  vm.runInNewContext(source, context);
  return context.exports;
}

function setup() {
  const states = [];
  const listeners = new Map();
  let index = 0;
  let mounted = false;
  const react = {
    useState(initial) {
      const slot = index++;
      if (!(slot in states)) states[slot] = initial;
      return [states[slot], value => { states[slot] = value; }];
    },
    useCallback: fn => fn,
    useEffect(fn) { if (!mounted) fn(); },
  };
  const { usePwaInstall } = load('hooks/use-pwa-install.ts', { react }, {
    navigator: { userAgent: 'Android' },
    window: {
      matchMedia: () => ({ matches: false }),
      addEventListener: (name, fn) => listeners.set(name, fn),
      removeEventListener: name => listeners.delete(name),
    },
  });
  function render() {
    index = 0;
    const result = usePwaInstall();
    mounted = true;
    return result;
  }
  render();
  return { render, listeners };
}

for (const outcome of ['accepted', 'dismissed', 'error']) {
  test(`Android install prompts once and recovers after ${outcome}`, async () => {
    const { render, listeners } = setup();
    assert.equal(await render().installApp(), false);
    let calls = 0;
    let prevented = false;
    listeners.get('beforeinstallprompt')({
      preventDefault() { prevented = true; },
      async prompt() {
        calls++;
        if (outcome === 'error') throw new Error('Unavailable');
      },
      userChoice: Promise.resolve({ outcome }),
    });
    assert.equal(prevented, true);
    assert.equal(render().isAndroid, true);
    assert.equal(render().canInstall, true);
    assert.equal(await render().installApp(), outcome !== 'error');
    assert.equal(render().isInstalling, false);
    assert.equal(render().canInstall, false);
    await render().installApp();
    assert.equal(calls, 1);
    listeners.get('appinstalled')();
    assert.equal(render().isInstalled, true);
  });
}

test('landing install section renders the install button, with registration only in the hero', () => {
  const { LandingPage, PwaInstallButton } = (() => {
    const PwaInstallButton = () => null;
    const page = load('app/(public)/page.tsx', {
      'react/jsx-runtime': jsx,
      'next/link': { default: 'a' },
      'next/image': { default: 'img' },
      '@/components/ui/button': { Button: 'button' },
      'lucide-react': { ArrowRight: 'svg' },
      '@/components/pwa-install-button': { PwaInstallButton },
    });
    return { LandingPage: page.default, PwaInstallButton };
  })();
  const elements = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    elements.push(node);
    visit(node.props?.children);
  }
  visit(LandingPage());
  assert.equal(elements.filter(node => node.type === PwaInstallButton).length, 1);
  assert.equal(elements.filter(node => node.props?.href === '/register').length, 1);
});
