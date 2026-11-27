// Opt-in CRM integration: node --test frontend/test/crmFinance.render.cjs
// Uses the existing external React renderer fixture; never loads Firebase config.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const frontend = path.resolve(__dirname, '..');
const projectRequire = Module.createRequire(path.join(frontend, 'package.json'));
const esbuild = projectRequire('esbuild');
let rendererPath = process.env.VAGAFOGO_REACT_TEST_RENDERER;
if (!rendererPath) {
  try { rendererPath = projectRequire.resolve('react-test-renderer'); }
  catch { rendererPath = path.join(process.env.LOCALAPPDATA || '', 'Temp/vagafogo-access-render-tests-2026-11-25/node_modules/react-test-renderer/index.js'); }
}
assert.equal(Module.createRequire(rendererPath)('./package.json').version, projectRequire('react/package.json').version);
let runtime;
const originals = new Map(['window', 'document', 'IS_REACT_ACT_ENVIRONMENT'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const initialHandles = new Set(process._getActiveHandles());
let downloads = [];
const blobs = new Map();

test.before(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const events = new EventTarget();
  globalThis.document = {
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    createElement: (tag) => {
      assert.equal(tag, 'a', 'Only the actual CSV download anchor is needed');
      return { click() { downloads.push({ filename: this.download, blob: blobs.get(this.href) }); } };
    },
  };
  globalThis.window = {
    scrollTo() {},
    setTimeout: (...args) => { const handle = setTimeout(...args); handle.unref(); return handle; },
    clearTimeout,
    setInterval: (...args) => { const handle = setInterval(...args); handle.unref(); return handle; },
    clearInterval,
  };
  const entry = `
    export * as React from 'react';
    export {act,create} from ${JSON.stringify(rendererPath)};
    export {MemoryRouter} from 'react-router-dom';
    export {CRM} from ${JSON.stringify(path.join(frontend, 'src/pages/CRM.tsx'))};
    export {setRecords} from 'firebase/firestore';
  `;
  const built = await esbuild.build({
    stdin: { contents: entry, loader: 'tsx', resolveDir: frontend }, bundle: true, write: false,
    platform: 'node', format: 'cjs', jsx: 'automatic', define: {
      'process.env.NODE_ENV': '"test"',
      'import.meta.env': '{"VITE_API_BASE":"https://synthetic.invalid"}',
    }, logLevel: 'silent',
    plugins: [{ name: 'crm-finance-offline-fixture', setup(builder) {
      builder.onResolve({ filter: /^react(?:-dom)?(?:\/.*)?$/ }, (args) => ({ path: projectRequire.resolve(args.path) }));
      builder.onResolve({ filter: /^firebase\/firestore$/ }, () => ({ path: 'firestore', namespace: 'fixture' }));
      builder.onResolve({ filter: /^firebase\/auth$/ }, () => ({ path: 'auth', namespace: 'fixture' }));
      builder.onResolve({ filter: /(?:^|\/)firebase(?:\.ts)?$/ }, () => ({ path: 'firebase', namespace: 'fixture' }));
      builder.onResolve({ filter: /AffiliateAdminSection$/ }, () => ({ path: 'affiliates', namespace: 'fixture' }));
      builder.onResolve({ filter: /\.(?:css|jpg|jpeg|png|webp)$/ }, () => ({ path: 'asset', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: fixture }) => ({ loader: 'tsx', resolveDir: frontend, contents:
        fixture === 'firestore' ? `
          let records={},subscriptions=new Map();
          const snapshot=path=>({docs:(records[path]||[]).map(({id,...data})=>({id,data:()=>data}))});
          export const collection=(_db,...parts)=>parts.join('/');
          export const setRecords=value=>{records=value;for(const [path,listeners] of subscriptions)for(const listener of listeners)listener(snapshot(path));};
          export const onSnapshot=(path,next)=>{if(!subscriptions.has(path))subscriptions.set(path,new Set());const listeners=subscriptions.get(path);listeners.add(next);next(snapshot(path));return()=>listeners.delete(next);};
        ` : fixture === 'firebase' ? 'export const db={}; export const auth={currentUser:null};'
          : fixture === 'auth' ? 'export const signOut=async()=>{};'
            : fixture === 'affiliates' ? 'export const AffiliateAdminSection=()=>null;'
              : 'export default "synthetic-local-asset";',
      }));
    } }],
  });
  const compiled = new Module(path.join(__dirname, '.crm-finance-memory.cjs'), module);
  compiled.filename = path.join(__dirname, '.crm-finance-memory.cjs');
  compiled.paths = Module._nodeModulePaths(frontend);
  compiled._compile(built.outputFiles[0].text, compiled.filename);
  runtime = compiled.exports;
});

test.after(() => {
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
  esbuild.stop();
  for (const handle of process._getActiveHandles()) {
    if (!initialHandles.has(handle) && handle.constructor?.name === 'MessagePort') handle.unref();
  }
});

const text = (node) => node == null ? '' : typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(text).join(' ') : text(node.children);
const label = (node) => text(node).replace(/\s+/g, ' ').trim();
const today = () => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type).value).join('-');
};
const reservation = (id, overrides = {}) => ({
  id, nome: `Synthetic ${id}`, atividade: 'Brunch', data: today(), horario: '10:00',
  adultos: 2, valor: 130, status: 'pago', origem: 'manual', criadaManualmente: true,
  criadoEm: new Date().toISOString(), ...overrides,
});
const checkout = (id, overrides = {}) => reservation(id, {
  origem: 'site', criadaManualmente: false, canalOrigem: 'site', dominioOrigem: 'synthetic.example.test',
  dataPagamento: new Date().toISOString(), ...overrides,
});

async function mount(t, records) {
  const { React, create, act, CRM, MemoryRouter, setRecords } = runtime;
  const originalError = console.error;
  t.mock.method(console, 'error', (...args) => {
    if (typeof args[0] === 'string' && args[0].startsWith('react-test-renderer is deprecated')) return;
    originalError(...args);
  });
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Network forbidden in CRM finance integration'); });
  t.mock.method(URL, 'createObjectURL', (blob) => { const url = `blob:crm-fixture-${blobs.size}`; blobs.set(url, blob); return url; });
  t.mock.method(URL, 'revokeObjectURL', () => {});
  downloads = [];
  setRecords({ reservas: records });
  let view;
  await act(async () => { view = create(React.createElement(MemoryRouter, null, React.createElement(CRM))); });
  t.after(async () => { await act(async () => view.unmount()); });
  const click = async (name, scope = view.root) => {
    const target = scope.findAllByType('button').find((item) => label(item) === name || item.props['aria-label'] === name);
    assert.ok(target, `Missing button: ${name}`);
    await act(async () => target.props.onClick());
  };
  const paymentFilter = async (name) => {
    const group = view.root.findByProps({ className: 'crm-finance-origin__options' });
    const target = group.findAllByType('button').find((item) => label(item).startsWith(name));
    assert.ok(target, `Missing financial classification: ${name}`);
    await act(async () => target.props.onClick());
  };
  const exportRows = async () => {
    const before = downloads.length;
    await click('Exportar');
    assert.equal(downloads.length, before + 1);
    assert.ok(downloads.at(-1).filename.endsWith('.csv'));
    const csv = (await downloads.at(-1).blob.text()).replace(/^\ufeff/, '');
    // All fields in the real CRM CSV are quoted; fixtures contain no linebreaks.
    const lines = csv.split('\n').map((line) => Array.from(line.matchAll(/"((?:[^"]|"")*)"/g), (match) => match[1].replace(/""/g, '"')));
    const headers = lines.shift();
    return lines.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]])));
  };
  await click('Financeiro');
  await click('Mostrar valores');
  return { view, click, paymentFilter, exportRows, update: async (value) => act(async () => setRecords({ reservas: value })) };
}

const commissionText = (mounted) => label(mounted.view.root.findByProps({ className: 'crm-finance-percent' }));
const csvById = (rows) => new Map(rows.map((row) => [row.reserva, row]));

test('real CRM maps manual Asaas flags through financial filter, 1% and CSV while preserving manual origin', async (t) => {
  const futureVisit = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
  const mounted = await mount(t, [
    reservation('manual-paid', { data: futureVisit, pagamentoRegistradoNoAsaas: true, dataPagamento: new Date().toISOString() }),
    reservation('manual-created-fallback', { data: futureVisit, valor: 70, status: 'confirmado', pagamentoRegistradoNoAsaas: true }),
    reservation('manual-visit-fallback', { valor: 20, criadoEm: undefined, status: 'confirmado', pagamentoRegistradoNoAsaas: true }),
    reservation('manual-local', { valor: 500, pagamentoRegistradoNoAsaas: false }),
    reservation('manual-pending', { valor: 900, status: 'aguardando', pagamentoRegistradoNoAsaas: true }),
    reservation('manual-cancelled', { valor: 800, status: 'cancelado', pagamentoRegistradoNoAsaas: true }),
    checkout('checkout-paid', { data: futureVisit, valor: 290 }),
    checkout('checkout-audit-only', { valor: 100, dataPagamento: undefined }),
    checkout('checkout-outside-period', { valor: 1000, dataPagamento: new Date(Date.now() - 45 * 86_400_000).toISOString() }),
  ]);
  await mounted.paymentFilter('Asaas');
  assert.match(commissionText(mounted), /Seu 1% do Asaas/);
  assert.match(commissionText(mounted), /R\$\s*5,10/);
  const rows = csvById(await mounted.exportRows());
  assert.equal(rows.size, 7);
  assert.equal(rows.has('manual-local'), false);
  assert.equal(rows.has('checkout-outside-period'), false);
  assert.equal([...rows.values()].reduce((sum, row) => sum + Number(row.baseComissao1PorCento), 0), 510);
  for (const [id, base] of [['manual-paid', 130], ['manual-created-fallback', 70], ['manual-visit-fallback', 20], ['checkout-paid', 290], ['manual-pending', 0], ['manual-cancelled', 0], ['checkout-audit-only', 0]]) {
    assert.equal(Number(rows.get(id).baseComissao1PorCento), base, id);
  }
  assert.equal(rows.get('manual-paid').tipoReserva, 'Manual');
  assert.equal(rows.get('manual-paid').origem, 'Manual');
  await mounted.paymentFilter('Manuais');
  assert.match(commissionText(mounted), /R\$\s*0,00/);
  assert.deepEqual(Array.from(csvById(await mounted.exportRows()).keys()), ['manual-local']);
  await mounted.click('Reservas');
  const bookingRows = csvById(await mounted.exportRows());
  assert.equal(bookingRows.get('manual-paid').tipoReserva, 'Manual');
  assert.equal(bookingRows.get('manual-paid').origem, 'Manual');
});

test('real CRM honors explicit false over legacy checkout marking and recomputes after payment/status changes', async (t) => {
  const records = [
    reservation('legacy-inferred', { origem: 'checkout', valor: 130 }),
    reservation('legacy-false', { origem: 'checkout', valor: 500, pagamentoRegistradoNoAsaas: false }),
    reservation('confirmed', { valor: 70, status: 'confirmado', pagamentoRegistradoNoAsaas: true }),
    reservation('pending', { valor: 900, status: 'aguardando', pagamentoRegistradoNoAsaas: true }),
  ];
  const mounted = await mount(t, records);
  await mounted.paymentFilter('Asaas');
  assert.match(commissionText(mounted), /R\$\s*2,00/);
  let rows = csvById(await mounted.exportRows());
  assert.equal(rows.has('legacy-false'), false);
  assert.equal(Number(rows.get('legacy-inferred').baseComissao1PorCento), 130);
  await mounted.update(records.map((record) => record.id === 'legacy-inferred' ? { ...record, pagamentoRegistradoNoAsaas: false }
    : record.id === 'confirmed' ? { ...record, status: 'cancelado' }
      : record.id === 'pending' ? { ...record, status: 'pago', dataPagamento: new Date().toISOString() } : record));
  assert.match(commissionText(mounted), /R\$\s*9,00/);
  rows = csvById(await mounted.exportRows());
  assert.equal(rows.has('legacy-inferred'), false);
  assert.equal(Number(rows.get('confirmed').baseComissao1PorCento), 0);
  assert.equal(Number(rows.get('pending').baseComissao1PorCento), 900);
});
