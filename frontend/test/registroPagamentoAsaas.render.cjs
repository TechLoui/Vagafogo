// Opt-in controlled UI integration: node --test frontend/test/registroPagamentoAsaas.render.cjs
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
const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
const initialHandles = new Set(process._getActiveHandles());
test.before(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const built = await esbuild.build({
    stdin: { resolveDir: frontend, loader: 'tsx', contents: `
      export * as React from 'react';
      export {act,create} from ${JSON.stringify(rendererPath)};
      export {RegistroPagamentoAsaas,ReservaRespostasEditor} from ${JSON.stringify(path.join(frontend, 'src/components/RegistroPagamentoAsaas.tsx'))};
      export {preencherReservaAsaas} from ${JSON.stringify(path.join(frontend, 'src/utils/preenchimentoReservaAsaas.ts'))};
    ` },
    bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"test"' }, logLevel: 'silent',
    plugins: [{ name: 'asaas-ui-offline', setup(builder) {
      builder.onResolve({ filter: /^react(?:\/.*)?$/ }, (args) => ({ path: projectRequire.resolve(args.path) }));
      builder.onResolve({ filter: /^firebase(?:\/|$)/ }, () => ({ errors: [{ text: 'Firebase is forbidden in this UI fixture' }] }));
      builder.onResolve({ filter: /\.css$/ }, () => ({ path: 'css', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export {};', loader: 'js' }));
    } }],
  });
  const compiled = new Module(path.join(__dirname, '.asaas-ui-memory.cjs'), module);
  compiled.filename = path.join(__dirname, '.asaas-ui-memory.cjs');
  compiled.paths = Module._nodeModulePaths(frontend);
  compiled._compile(built.outputFiles[0].text, compiled.filename);
  runtime = compiled.exports;
});
test.after(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
  esbuild.stop();
  for (const handle of process._getActiveHandles()) {
    if (!initialHandles.has(handle) && handle.constructor?.name === 'MessagePort') handle.unref();
  }
});
const text = (node) => node == null ? '' : typeof node === 'string' ? node
  : Array.isArray(node) ? node.map(text).join(' ') : text(node.children);
async function render(t, Component) {
  const originalError = console.error;
  t.mock.method(console, 'error', (...args) => {
    if (typeof args[0] === 'string' && args[0].startsWith('react-test-renderer is deprecated')) return;
    originalError(...args);
  });
  t.mock.method(globalThis, 'fetch', async () => { throw Error('Network forbidden in Asaas UI integration'); });
  let view;
  await runtime.act(async () => { view = runtime.create(runtime.React.createElement(Component)); });
  t.after(async () => runtime.act(async () => view.unmount()));
  return view;
}

test('real Asaas UI replaces the toggle with a summary and exposes the generated payment method for review', async (t) => {
  const { React, RegistroPagamentoAsaas, preencherReservaAsaas, act } = runtime;
  let latest, randomCalls = 0;
  const original = { origem: 'manual', criadaManualmente: true, pagamentoRegistradoNoAsaas: false };
  function Controlled() {
    const [value, setValue] = React.useState(original);
    latest = value;
    return React.createElement(RegistroPagamentoAsaas, {
      registrado: value.pagamentoRegistradoNoAsaas, formaPagamento: value.formaPagamento, formaPagamentoAutomatica: value.formaPagamentoAutomatica,
      onRegistrar: () => setValue((current) => ({ ...current, ...preencherReservaAsaas(current, [], () => { randomCalls++; return 0; }), pagamentoRegistradoNoAsaas: true })),
      onMetodo: (method) => setValue((current) => ({ ...current, formaPagamento: method, formaPagamentoAutomatica: false })),
    });
  }
  const view = await render(t, Controlled);
  assert.equal(view.root.findByType('input').props.type, 'checkbox');
  await act(async () => view.root.findByType('input').props.onChange());
  assert.equal(view.root.findAllByType('input').length, 0);
  assert.ok(view.root.findByProps({ 'aria-label': 'Pagamento registrado como Asaas' }));
  assert.match(text(view.toJSON()), /Pix\s*·\s*automático/);
  assert.match(text(view.toJSON()), /Método preenchido automaticamente/);
  assert.equal(view.root.findAll((item) => item.props.className === 'admin-reserva-identificacao admin-reserva-identificacao--manual').length, 0);
  assert.equal(randomCalls, 1);
  await act(async () => view.root.findByType('select').props.onChange({ target: { value: 'CREDIT_CARD' } }));
  assert.equal(latest.formaPagamento, 'CREDIT_CARD');
  assert.equal(latest.formaPagamentoAutomatica, false);
  assert.doesNotMatch(text(view.toJSON()), /Método preenchido automaticamente|Cartão\s*·\s*automático/);
  assert.equal(randomCalls, 1);
  assert.equal(latest.origem, 'manual');
  assert.equal(latest.criadaManualmente, true);
  assert.equal(original.pagamentoRegistradoNoAsaas, false);
});

test('real answers editor clears provenance only for the edited main or conditional field and preserves every other answer', async (t) => {
  const { React, ReservaRespostasEditor, act } = runtime;
  const original = [
    { pacoteId: 'p', pacoteNome: 'Pacote', perguntaId: 'q', pergunta: 'Pergunta principal', tipo: 'sim_nao', obrigatoria: true, resposta: 'sim', respostaAutomatica: true,
      perguntaCondicional: { pergunta: 'Complemento', tipo: 'texto', obrigatoria: false, resposta: 'A confirmar com o visitante.', respostaAutomatica: true, legado: 'preservado' } },
    { pacoteId: 'old', pacoteNome: 'Antigo', perguntaId: 'legacy', pergunta: 'Resposta humana', tipo: 'texto', obrigatoria: false, resposta: 'Não alterar', campoLegado: 'preservado' },
  ];
  let latest;
  function Controlled() {
    const [answers, setAnswers] = React.useState(original);
    latest = answers;
    return React.createElement(ReservaRespostasEditor, { respostas: answers, onChange: setAnswers });
  }
  const view = await render(t, Controlled);
  const field = (label) => view.root.findAllByType('label').find((item) => text(item).includes(label));
  await act(async () => field('Complemento').findByType('input').props.onChange({ target: { value: 'Informação revisada' } }));
  assert.equal(latest[0].respostaAutomatica, true);
  assert.equal(Object.hasOwn(latest[0].perguntaCondicional, 'respostaAutomatica'), false);
  assert.equal(latest[0].perguntaCondicional.resposta, 'Informação revisada');
  assert.equal(latest[0].perguntaCondicional.legado, 'preservado');
  assert.equal(latest[1], original[1]);
  await act(async () => field('Pergunta principal').findByType('select').props.onChange({ target: { value: 'nao' } }));
  assert.equal(Object.hasOwn(latest[0], 'respostaAutomatica'), false);
  assert.equal(latest[0].resposta, 'nao');
  assert.equal(latest[0].perguntaCondicional.resposta, 'Informação revisada');
  assert.equal(latest[1], original[1]);
  assert.equal(original[0].respostaAutomatica, true);
  assert.equal(original[0].perguntaCondicional.respostaAutomatica, true);
});
