// Opt-in real React/router regression: node --test frontend/test/affiliateAccess.render.cjs
// Needs react-test-renderer matching frontend React. Set VAGAFOGO_REACT_TEST_RENDERER
// to its index.js when installed outside frontend/node_modules.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { createRequire } = Module;
const frontend = path.resolve(__dirname, '..');
const projectRequire = createRequire(path.join(frontend, 'package.json'));
const esbuild = projectRequire('esbuild');
const reactVersion = projectRequire('react/package.json').version;
let rendererPath = process.env.VAGAFOGO_REACT_TEST_RENDERER;
if (!rendererPath) {
  try { rendererPath = projectRequire.resolve('react-test-renderer'); }
  catch { rendererPath = path.join(process.env.LOCALAPPDATA || '', 'Temp/vagafogo-access-render-tests-2026-11-25/node_modules/react-test-renderer/index.js'); }
}
const rendererVersion = createRequire(rendererPath)('./package.json').version;
assert.equal(rendererVersion, reactVersion, 'Install a react-test-renderer version matching frontend React');
let runtime;
const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
const initialHandles = new Set(process._getActiveHandles());

test.before(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const entry = `
    export * as React from 'react';
    export {act, create} from ${JSON.stringify(rendererPath)};
    export {createMemoryRouter, RouterProvider} from 'react-router-dom';
    export {router as routeConfig} from ${JSON.stringify(path.join(frontend, 'src/routes.tsx'))};
    export {SessionContext} from ${JSON.stringify(path.join(frontend, 'src/features/affiliates/AffiliateAccess.ts'))};
    export {setAuth} from 'firebase/auth';
  `;
  const build = await esbuild.build({
    stdin: { contents: entry, resolveDir: frontend, loader: 'tsx' },
    bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"test"' }, logLevel: 'silent',
    plugins: [{ name: 'isolated-account-access-fixture', setup(builder) {
      builder.onResolve({ filter: /^react(?:-dom)?(?:\/.*)?$/ }, (args) => ({ path: projectRequire.resolve(args.path) }));
      builder.onResolve({ filter: /^react-router-dom$/ }, (args) => args.importer.replace(/\\/g, '/').endsWith('/src/routes.tsx')
        ? { path: 'route-config', namespace: 'qa' } : { path: projectRequire.resolve('react-router-dom') });
      builder.onResolve({ filter: /AffiliateAccess(?:\.ts)?$/ }, () => ({ path: 'session', namespace: 'qa' }));
      builder.onResolve({ filter: /^firebase\/auth$/ }, () => ({ path: 'auth', namespace: 'qa' }));
      builder.onResolve({ filter: /(?:^|\/)firebase(?:\.ts)?$/ }, () => ({ path: 'firebase', namespace: 'qa' }));
      builder.onResolve({ filter: /(?:^|\/)affiliateService(?:\.ts)?$/ }, () => ({ path: 'api-error', namespace: 'qa' }));
      builder.onResolve({ filter: /\.(?:css|jpg|jpeg|webp|png)$/ }, () => ({ path: 'asset', namespace: 'qa' }));
      builder.onResolve({ filter: /^\.\/components\/AppLayout$/ }, () => ({ path: 'layout', namespace: 'qa' }));
      builder.onResolve({ filter: /^\.\/pages\// }, (args) => {
        if (args.path === './pages/AffiliateLogin') return;
        return { path: 'page-' + path.basename(args.path), namespace: 'qa' };
      });
      builder.onLoad({ filter: /.*/, namespace: 'qa' }, (args) => {
        let contents;
        if (args.path === 'route-config') contents = 'export const createBrowserRouter = routes => routes;';
        else if (args.path === 'session') contents = "import {createContext,useContext} from 'react'; export const SessionContext=createContext(null); export const AffiliateProfileContext=createContext(null); export const useAffiliateSession=()=>useContext(SessionContext);";
        else if (args.path === 'auth') contents = 'let implementation={}; export const setAuth=value=>{implementation=value;}; export const signOut=(...args)=>implementation.signOut(...args); export const signInWithEmailAndPassword=(...args)=>implementation.signIn(...args);';
        else if (args.path === 'firebase') contents = 'export const auth={};';
        else if (args.path === 'api-error') contents = 'export class AffiliateApiError extends Error { constructor(message,status,code){super(message);this.status=status;this.code=code;} }';
        else if (args.path === 'asset') contents = 'export default "fixture-asset";';
        else if (args.path === 'layout') contents = "import {Outlet} from 'react-router-dom'; export const AppLayout=()=> <Outlet/>; export const PageLoader=()=> <p role='status'>Loading route</p>;";
        else {
          const filename = args.path.slice(5);
          const name = filename[0].toUpperCase() + filename.slice(1);
          contents = `export const ${name}=()=> <main data-page=${JSON.stringify(name)}>${name}</main>;`;
        }
        return { contents, loader: 'tsx', resolveDir: frontend };
      });
    } }],
  });
  const compiled = new Module(path.join(__dirname, '.affiliate-access-memory.cjs'), module);
  compiled.filename = path.join(__dirname, '.affiliate-access-memory.cjs');
  compiled.paths = Module._nodeModulePaths(frontend);
  compiled._compile(build.outputFiles[0].text, compiled.filename);
  runtime = compiled.exports;
});
test.after(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  esbuild.stop();
  // Bundled React DOM scheduling creates a MessageChannel in Node. After all
  // roots are unmounted, it must not keep this opt-in test process alive.
  for (const handle of process._getActiveHandles()) {
    if (!initialHandles.has(handle) && handle.constructor?.name === 'MessagePort') handle.unref();
  }
});

const session = (role, uid = role) => ({
  user: role ? { uid, email: `${role}@example.test` } : null,
  profile: role ? { identity: { uid, email: `${role}@example.test`, role, agencyId: role === 'agency' ? 'agency-a' : null, partnerId: role === 'partner' ? 'partner-a' : null } } : null,
  loading: false, error: null, retry() {},
});
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const text = (node) => node == null ? '' : typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(text).join(' ') : text(node.children);
const button = (view, label) => view.root.findAllByType('button').find((item) => text(item.toJSON ? item.toJSON() : { children: item.children }) === label);
const page = (view, name) => view.root.findAll((item) => item.props['data-page'] === name).length > 0;
const home = { admin: '/CRM', agency: '/agencia', partner: '/parceiro' };

async function mount(t, location, initialSession) {
  const { React, create, act, SessionContext, createMemoryRouter, RouterProvider } = runtime;
  let current = initialSession;
  const originalError = console.error;
  t.mock.method(console, 'error', (...args) => {
    if (typeof args[0] === 'string' && args[0].startsWith('react-test-renderer is deprecated')) return;
    originalError(...args);
  });
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Network forbidden in account access render tests'); });
  runtime.setAuth({ signOut: async () => {}, signIn: async () => { throw new Error('Unexpected sign-in'); } });
  const router = createMemoryRouter(runtime.routeConfig, { initialEntries: [location] });
  const tree = () => React.createElement(SessionContext.Provider, { value: current }, React.createElement(RouterProvider, { router }));
  let view;
  await act(async () => { view = create(tree()); await new Promise((resolve) => setImmediate(resolve)); });
  await act(async () => { await new Promise((resolve) => setImmediate(resolve)); });
  t.after(async () => { await act(async () => view.unmount()); router.dispose(); });
  return {
    view, router, act,
    update: async (value) => { current = value; await act(async () => view.update(tree())); },
    click: async (label) => { const target = button(view, label); assert.ok(target, 'Missing button: ' + label); await act(async () => target.props.onClick()); },
  };
}

test('admin opening partner/agency route sees the current account choice and no CRM jump', async (t) => {
  for (const location of ['/parceiro', '/agencia']) {
    const mounted = await mount(t, location, session('admin'));
    assert.equal(mounted.router.state.location.pathname, location);
    assert.match(text(mounted.view.toJSON()), /Escolha a conta|admin@example.test/);
    assert.ok(button(mounted.view, 'Entrar com outra conta'));
    assert.ok(button(mounted.view, 'Continuar no meu painel'));
    assert.equal(page(mounted.view, 'CRM'), false);
    assert.equal(page(mounted.view, 'AffiliatePortal'), false);
    await mounted.click('Continuar no meu painel');
    assert.equal(mounted.router.state.location.pathname, '/CRM');
    assert.equal(page(mounted.view, 'CRM'), true);
  }
});

test('partner/agency mismatch offers account choice, while CRM/admin/agent still reject partner content', async (t) => {
  for (const [role, location] of [['partner', '/agencia'], ['agency', '/parceiro']]) {
    const mounted = await mount(t, location, session(role));
    assert.equal(mounted.router.state.location.pathname, location);
    assert.equal(page(mounted.view, 'AffiliatePortal'), false);
    await mounted.click('Continuar no meu painel');
    assert.equal(mounted.router.state.location.pathname, home[role]);
    assert.equal(page(mounted.view, 'AffiliatePortal'), true);
  }
  for (const location of ['/CRM', '/admin', '/agente']) {
    const mounted = await mount(t, location, session('partner'));
    assert.equal(mounted.router.state.location.pathname, '/parceiro');
    assert.equal(page(mounted.view, 'CRM'), false);
    assert.equal(page(mounted.view, 'Admin'), false);
    assert.equal(page(mounted.view, 'Agente'), false);
  }
});

test('loading and unauthorized sessions do not mount protected pages', async (t) => {
  const loading = await mount(t, '/parceiro', { ...session(null), loading: true });
  assert.match(text(loading.view.toJSON()), /Verificando seu acesso/);
  assert.equal(page(loading.view, 'AffiliatePortal'), false);
  const anonymous = await mount(t, '/agencia?source=invitation', session(null));
  assert.equal(anonymous.router.state.location.pathname, '/afiliados/login');
  assert.equal(anonymous.router.state.location.state.from, '/agencia?source=invitation');
  assert.ok(anonymous.view.root.findByType('form'));
});

test('persisted valid session stays on login until the user explicitly chooses to continue', async (t) => {
  for (const role of ['admin', 'agency', 'partner']) {
    const mounted = await mount(t, '/afiliados/login', session(role));
    assert.equal(mounted.router.state.location.pathname, '/afiliados/login');
    assert.ok(button(mounted.view, 'Continuar no meu painel'));
    assert.ok(button(mounted.view, 'Entrar com outra conta'));
    await mounted.click('Continuar no meu painel');
    assert.equal(mounted.router.state.location.pathname, home[role]);
  }
});

async function submitLogin(mounted, email = 'partner@example.test') {
  const inputs = mounted.view.root.findAllByType('input');
  await mounted.act(async () => {
    inputs.find((item) => item.props.type === 'email').props.onChange({ target: { value: email } });
    inputs.find((item) => item.props.id === 'affiliate-password').props.onChange({ target: { value: 'local-test-only' } });
  });
  await mounted.act(async () => mounted.view.root.findByType('form').props.onSubmit({ preventDefault() {} }));
}

test('only an explicit completed login for the confirmed same UID auto-opens agency/partner panel', async (t) => {
  for (const role of ['agency', 'partner']) {
    const mounted = await mount(t, '/afiliados/login', session(null));
    const credential = deferred();
    let signIns = 0;
    runtime.setAuth({ signIn: async () => { signIns++; return credential.promise; }, signOut: async () => {} });
    await submitLogin(mounted);
    await mounted.update(session(role, 'explicit-' + role));
    assert.equal(mounted.router.state.location.pathname, '/afiliados/login', 'Profile alone cannot bypass pending credential result');
    await mounted.act(async () => credential.resolve({ user: { uid: 'explicit-' + role } }));
    assert.equal(signIns, 1);
    assert.equal(mounted.router.state.location.pathname, home[role]);
    assert.equal(page(mounted.view, 'AffiliatePortal'), true);
  }
});

test('explicit admin and credential/profile UID mismatch retain the choice instead of automatic navigation', async (t) => {
  for (const [role, returnedUid, currentUid] of [['admin', 'owner', 'owner'], ['partner', 'account-a', 'account-b']]) {
    const mounted = await mount(t, '/afiliados/login', session(null));
    runtime.setAuth({ signIn: async () => ({ user: { uid: returnedUid } }), signOut: async () => {} });
    await submitLogin(mounted);
    await mounted.update(session(role, currentUid));
    assert.equal(mounted.router.state.location.pathname, '/afiliados/login');
    assert.ok(button(mounted.view, 'Entrar com outra conta'));
  }
});

test('sign-out is awaited, duplicate clicks are ignored, and a failure remains visible on the same account', async (t) => {
  const mounted = await mount(t, '/parceiro', session('admin'));
  const pending = deferred();
  let calls = 0;
  runtime.setAuth({ signIn: async () => {}, signOut: async () => { calls++; return pending.promise; } });
  const target = button(mounted.view, 'Entrar com outra conta');
  await mounted.act(async () => { target.props.onClick(); target.props.onClick(); });
  assert.equal(calls, 1);
  assert.ok(mounted.view.root.findAllByType('button').every((item) => item.props.disabled));
  assert.ok(button(mounted.view, 'Saindo…'));
  assert.equal(mounted.router.state.location.pathname, '/parceiro');
  await mounted.act(async () => pending.reject(new Error('local sign-out failure')));
  assert.match(text(mounted.view.root.findByProps({ role: 'alert' }).children), /Não foi possível sair/);
  assert.equal(mounted.router.state.location.pathname, '/parceiro');
  assert.equal(button(mounted.view, 'Entrar com outra conta').props.disabled, false);
  assert.equal(page(mounted.view, 'CRM'), false);
});

test('successful account switch returns to the login form without reusing the prior automatic-login UID', async (t) => {
  const mounted = await mount(t, '/afiliados/login', session('partner'));
  let calls = 0;
  runtime.setAuth({ signIn: async () => {}, signOut: async () => { calls++; } });
  await mounted.click('Entrar com outra conta');
  assert.equal(calls, 1);
  await mounted.update(session(null));
  const password = mounted.view.root.findByProps({ id: 'affiliate-password' });
  assert.equal(password.props.value, '');
  assert.equal(mounted.router.state.location.pathname, '/afiliados/login');
  await mounted.update(session('partner', 'another-persisted-user'));
  assert.equal(mounted.router.state.location.pathname, '/afiliados/login');
  assert.ok(button(mounted.view, 'Continuar no meu painel'));
});
