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
let portalRuntime;
const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
const initialHandles = new Set(process._getActiveHandles());

async function buildRuntime(realPortal = false) {
  const entry = `
    export * as React from 'react';
    export {act, create} from ${JSON.stringify(rendererPath)};
    export {createMemoryRouter, RouterProvider} from 'react-router-dom';
    export {router as routeConfig} from ${JSON.stringify(path.join(frontend, 'src/routes.tsx'))};
    export {SessionContext} from ${JSON.stringify(path.join(frontend, 'src/features/affiliates/AffiliateAccess.ts'))};
    export {setAuth} from 'firebase/auth';
    export {setApi,getApiCalls} from ${JSON.stringify(path.join(frontend, 'src/features/affiliates/affiliateService.ts'))};
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
      builder.onResolve({ filter: /affiliateService(?:\.ts)?$/ }, () => ({ path: 'api-error', namespace: 'qa' }));
      builder.onResolve({ filter: /\.(?:css|jpg|jpeg|webp|png)$/ }, () => ({ path: 'asset', namespace: 'qa' }));
      builder.onResolve({ filter: /^\.\/components\/AppLayout$/ }, () => ({ path: 'layout', namespace: 'qa' }));
      builder.onResolve({ filter: /^\.\/pages\// }, (args) => {
        if (args.path === './pages/AffiliateLogin' || realPortal && args.path === './pages/AffiliatePortal') return;
        return { path: 'page-' + path.basename(args.path), namespace: 'qa' };
      });
      builder.onLoad({ filter: /.*/, namespace: 'qa' }, (args) => {
        let contents;
        if (args.path === 'route-config') contents = 'export const createBrowserRouter = routes => routes;';
        else if (args.path === 'session') contents = "import {createContext,useContext} from 'react'; export const SessionContext=createContext(null); export const AffiliateProfileContext=createContext(null); export const useAffiliateSession=()=>useContext(SessionContext); export const useAffiliateProfile=()=>useContext(AffiliateProfileContext);";
        else if (args.path === 'auth') contents = 'let implementation={}; export const setAuth=value=>{implementation=value;}; export const signOut=(...args)=>implementation.signOut(...args); export const signInWithEmailAndPassword=(...args)=>implementation.signIn(...args);';
        else if (args.path === 'firebase') contents = 'export const auth={};';
        else if (args.path === 'api-error') contents = `
          export class AffiliateApiError extends Error { constructor(message,status,code){super(message);this.status=status;this.code=code;} }
          let api={},calls=[]; export const setApi=value=>{api=value;calls=[];}; export const getApiCalls=()=>calls;
          const invoke=(method,args)=>{calls.push({method,args}); if(!api[method])throw new Error('Unexpected API call: '+method); return api[method](...args);};
          ${['getAffiliateProfile','listAffiliateEntities','saveAffiliateEntity','saveAgencyLogo','createAffiliateActivation','getAffiliateInvitation','claimAffiliateInvitation','getAffiliateSummary','getAffiliateSales','getAffiliateLinks'].map((name) => `export const ${name}=(...args)=>invoke('${name}',args);`).join('\n')}
        `;
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
  return compiled.exports;
}
test.before(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  runtime = await buildRuntime();
  portalRuntime = await buildRuntime(true);
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
const button = (view, label) => view.root.findAllByType('button').find((item) => text(item.toJSON ? item.toJSON() : { children: item.children }).replace(/\s+/g, ' ').trim() === label);
const page = (view, name) => view.root.findAll((item) => item.props['data-page'] === name).length > 0;
const home = { admin: '/CRM', agency: '/agencia', partner: '/parceiro' };

async function mount(t, location, initialSession, options = {}) {
  const engine = options.engine || runtime;
  const { React, create, act, SessionContext, createMemoryRouter, RouterProvider } = engine;
  let current = initialSession;
  const originalError = console.error;
  t.mock.method(console, 'error', (...args) => {
    if (typeof args[0] === 'string' && args[0].startsWith('react-test-renderer is deprecated')) return;
    originalError(...args);
  });
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Network forbidden in account access render tests'); });
  engine.setAuth({ signOut: async () => {}, signIn: async () => { throw new Error('Unexpected sign-in'); } });
  if (options.api) engine.setApi(options.api);
  const router = createMemoryRouter(engine.routeConfig, { initialEntries: [location] });
  const tree = () => React.createElement(SessionContext.Provider, { value: current }, React.createElement(RouterProvider, { router }));
  let view;
  await act(async () => { view = create(tree()); await new Promise((resolve) => setImmediate(resolve)); });
  await act(async () => { await new Promise((resolve) => setImmediate(resolve)); });
  t.after(async () => { await act(async () => view.unmount()); router.dispose(); });
  return {
    view, router, act, engine,
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

const portalSession = (role, linked = false) => {
  const state = session(role);
  const agency = { id: 'agency-a', name: 'Synthetic Agency', email: 'agency@example.test', status: 'active' };
  state.profile.identity.agencyId = role === 'agency' || linked ? agency.id : null;
  if (role === 'agency' || linked) state.profile.agency = agency;
  if (role === 'partner') state.profile.partner = {
    id: 'partner-a', name: linked ? 'Linked Synthetic Partner' : 'Independent Synthetic Partner',
    email: 'partner@example.test', status: 'active', agencyId: state.profile.identity.agencyId,
  };
  return state;
};
const publicLink = 'https://vagafogo.com.br/reservar?ref=' + 'a'.repeat(43);
const portalApi = () => ({
  getAffiliateSummary: async () => ({ paidCount: 2, pendingCount: 1, cancelledCount: 1, revenue: 320, currency: 'BRL', commission: 9876.54, commissionConfigured: true }),
  getAffiliateSales: async () => ({ items: [{
    id: 'f7317cbe-13e4-4575-afd2-f01bf1306b9f', reservationCode: 'f7317cbe-13e4-4575-afd2-f01bf1306b9f',
    date: '2026-11-25', time: '10:00', activity: 'Synthetic Brunch', status: 'paid', value: 160,
    createdAt: new Date().toISOString(), paidAt: new Date().toISOString(), paymentMethod: 'PIX', guestCount: 4,
    partnerId: 'partner-a', partnerName: 'Synthetic Partner', agencyId: null,
    customerName: 'DO_NOT_RENDER_CUSTOMER', cpf: 'DO_NOT_RENDER_CPF', commission: 9876.54,
  }], nextCursor: null }),
  getAffiliateLinks: async () => ({ items: [{ id: 'link-a', partnerId: 'partner-a', label: 'Seu link de reserva', status: 'active', url: publicLink }], nextCursor: null }),
  listAffiliateEntities: async () => ({ items: [{ id: 'own-partner', name: 'Own Agency Partner', email: 'own-partner@example.test', status: 'active', agencyId: 'agency-a' }], nextCursor: null }),
});
const controlLabels = (view) => view.root.findAll((item) => item.type === 'button' || item.type === 'a')
  .map((item) => `${text({ children: item.children })} ${item.props['aria-label'] || ''} ${item.props.title || ''}`).join(' | ');
const noBookingActions = (mounted) => {
  assert.doesNotMatch(controlLabels(mounted.view), /(?:criar|nova|novo|editar|alterar|cancelar|excluir|remarcar)\s+(?:uma\s+|a\s+)?reservas?/i);
  assert.doesNotMatch(text(mounted.view.toJSON()), /DO_NOT_RENDER_CUSTOMER|DO_NOT_RENDER_CPF/);
  assert.ok(mounted.engine.getApiCalls().every((call) => ['getAffiliateSummary', 'getAffiliateSales', 'getAffiliateLinks', 'listAffiliateEntities'].includes(call.method)), 'Navigation must issue read APIs only');
};
const noPartnerManagement = (mounted) => {
  assert.doesNotMatch(controlLabels(mounted.view), /(?:criar|novo|nova|editar|gerar acesso|ativar)\s+(?:um\s+|uma\s+)?(?:parceiro|usu[aá]rio|ag[eê]ncia|cadastro)/i);
  assert.equal(mounted.engine.getApiCalls().some((call) => call.method === 'listAffiliateEntities'), false);
};

test('real independent portal navigates all four read-only sections without user management or booking actions', async (t) => {
  const mounted = await mount(t, '/parceiro', portalSession('partner'), { engine: portalRuntime, api: portalApi() });
  const overview = text(mounted.view.toJSON());
  assert.match(overview, /Ticket médio pago/);
  assert.match(overview, /160,00/, 'Average ticket must use paid revenue divided by paid reservations');
  assert.match(overview, /50\s*%/, 'Payment share must use paid/pending/cancelled reservations, not visitor counts');
  assert.equal(mounted.engine.getApiCalls().filter((call) => call.method === 'getAffiliateSummary').length, 1);
  assert.equal(mounted.engine.getApiCalls().some((call) => call.method === 'getAffiliateSales'), false, 'Overview must not fetch reservation rows');
  const tabs = ['Visão geral', 'Reservas', 'Relatórios', 'Divulgação'];
  for (const label of tabs) assert.ok(button(mounted.view, label), 'Independent navigation must include ' + label);
  for (const label of tabs) {
    await mounted.click(label);
    assert.equal(button(mounted.view, label).props['aria-current'], 'page');
    assert.equal(mounted.router.state.location.pathname, '/parceiro');
    noBookingActions(mounted);
    noPartnerManagement(mounted);
    assert.doesNotMatch(text(mounted.view.toJSON()), /Comissão|repasse manual|9\.876,54/);
  }
  const share = mounted.view.root.findAllByType('input').find((item) => item.props.value === publicLink);
  assert.ok(share && share.props.readOnly, 'Sharing exposes the existing link without editing or creating one');
  assert.ok(mounted.engine.getApiCalls().some((call) => call.method === 'getAffiliateLinks'));
  for (const call of mounted.engine.getApiCalls().filter((call) => ['getAffiliateSummary', 'getAffiliateSales'].includes(call.method))) {
    assert.ok(!call.args[0]?.agencyId && !call.args[0]?.partnerId, 'External scope comes from the authenticated backend identity');
  }
});

test('real linked partner retains its agency branding, link and reservation report without any user or booking management', async (t) => {
  const mounted = await mount(t, '/parceiro', portalSession('partner', true), { engine: portalRuntime, api: portalApi() });
  assert.match(text(mounted.view.toJSON()), /Synthetic Agency/);
  assert.ok(mounted.view.root.findAllByType('input').some((item) => item.props.value === publicLink && item.props.readOnly));
  assert.ok(mounted.engine.getApiCalls().some((call) => call.method === 'getAffiliateSales'));
  assert.equal(button(mounted.view, 'Parceiros'), undefined);
  noBookingActions(mounted);
  noPartnerManagement(mounted);
  assert.doesNotMatch(text(mounted.view.toJSON()), /Comissão|repasse manual|9\.876,54/);
});

test('real agency keeps scoped partner administration while every reservation view remains read-only', async (t) => {
  const mounted = await mount(t, '/agencia', portalSession('agency'), { engine: portalRuntime, api: portalApi() });
  assert.ok(button(mounted.view, 'Resumo e reservas'));
  assert.ok(button(mounted.view, 'Parceiros'));
  noBookingActions(mounted);
  await mounted.click('Parceiros');
  const listing = mounted.engine.getApiCalls().find((call) => call.method === 'listAffiliateEntities');
  assert.ok(listing);
  assert.equal(listing.args[0], 'partners');
  assert.equal(listing.args[1], 'agency-a');
  assert.match(text(mounted.view.toJSON()), /Own Agency Partner/);
  assert.match(controlLabels(mounted.view), /Criar parceiro|Novo parceiro/);
  assert.match(controlLabels(mounted.view), /Editar/);
  noBookingActions(mounted);
  assert.doesNotMatch(text(mounted.view.toJSON()), /Comissão|repasse manual|9\.876,54/);
  await mounted.click('Resumo e reservas');
  noBookingActions(mounted);
});

test('real portal does not fetch reports or links for mismatched roles or the administrator account', async (t) => {
  for (const [role, location] of [['agency', '/parceiro'], ['partner', '/agencia'], ['admin', '/parceiro']]) {
    const mounted = await mount(t, location, portalSession(role), { engine: portalRuntime, api: portalApi() });
    assert.equal(mounted.router.state.location.pathname, location);
    assert.ok(button(mounted.view, 'Entrar com outra conta'));
    assert.deepEqual(mounted.engine.getApiCalls(), []);
    assert.equal(button(mounted.view, 'Visão geral'), undefined);
  }
});

test('real partner portal keeps read-only navigation when an awaited logout fails', async (t) => {
  const mounted = await mount(t, '/parceiro', portalSession('partner'), { engine: portalRuntime, api: portalApi() });
  const pending = deferred();
  let calls = 0;
  portalRuntime.setAuth({ signIn: async () => {}, signOut: async () => { calls++; return pending.promise; } });
  await mounted.click('Sair');
  assert.equal(calls, 1);
  assert.ok(button(mounted.view, 'Saindo…')?.props.disabled);
  await mounted.act(async () => pending.reject(new Error('local logout failed')));
  assert.match(text(mounted.view.toJSON()), /Não foi possível sair/);
  assert.equal(mounted.router.state.location.pathname, '/parceiro');
  assert.ok(button(mounted.view, 'Visão geral'));
  noBookingActions(mounted);
});
