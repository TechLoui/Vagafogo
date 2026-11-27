import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { reservaManualNaExibicao } from '../src/utils/classificacaoPagamentoReserva.ts';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectRequire = createRequire(path.join(frontend, 'package.json'));
const React = projectRequire('react');
const { renderToStaticMarkup } = projectRequire('react-dom/server');
const esbuild = projectRequire('esbuild');
const componentPath = path.join(frontend, 'src/components/ReservaIdentificacaoBadges.tsx');
const bundle = await esbuild.build({ entryPoints: [componentPath], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', loader: { '.css': 'empty' }, external: ['react', 'react/jsx-runtime', 'react-icons/fa', 'react-icons/fa6'], logLevel: 'silent' });
const componentModule = new Module(componentPath);
componentModule.filename = componentPath;
componentModule.paths = Module._nodeModulePaths(path.dirname(componentPath));
componentModule._compile(bundle.outputFiles[0].text, componentPath);
const { ReservaIdentificacaoBadges } = componentModule.exports;
const markup = (props) => renderToStaticMarkup(React.createElement(ReservaIdentificacaoBadges, props));
const labels = (html) => html.replace(/<[^>]*>/g, '');

test('manual administrativo marcado Asaas muda só a classificação de exibição', () => {
  const original = Object.freeze({ origem: 'manual', criadaManualmente: true, pagamentoRegistradoNoAsaas: true, status: 'aguardando', asaasPaymentId: 'unchanged', atribuicao: { sourceChannel: 'manual' } });
  const before = structuredClone(original);
  assert.equal(reservaManualNaExibicao(original, true), false);
  assert.deepEqual(original, before);
  assert.equal(reservaManualNaExibicao({ ...original, pagamentoRegistradoNoAsaas: false }, true), true);
});

test('flag explícita preserva o false legado; checkout sem flag usa a inferência existente', () => {
  assert.equal(reservaManualNaExibicao({ origem: ' CHECKOUT ' }, true), false);
  assert.equal(reservaManualNaExibicao({ origem: 'checkout', pagamentoRegistradoNoAsaas: false }, true), true);
  assert.equal(reservaManualNaExibicao({ origem: 'checkout', pagamentoRegistradoNoAsaas: 'true' }, true), true);
  assert.equal(reservaManualNaExibicao({ origem: 'manual' }, true), true);
  assert.equal(reservaManualNaExibicao(null, false), false);
});

test('método, ID do provedor e status não definem registro Asaas ou origem manual', () => {
  for (const formaPagamento of ['PIX', 'CREDIT_CARD']) {
    const record = { origem: 'manual', formaPagamento, asaasPaymentId: 'pay_test', status: 'confirmado' };
    assert.equal(reservaManualNaExibicao(record, true), true);
    assert.equal(reservaManualNaExibicao(record, false), false);
  }
});

test('badge suprime Manual quando Asaas é registrado e mantém o método real', () => {
  const props = { criadaManualmente: true, origem: 'manual', formaPagamento: 'CREDIT_CARD' };
  assert.equal(labels(markup({ ...props, pagamentoRegistradoNoAsaas: true })), 'Cartão');
  assert.equal(labels(markup({ ...props, pagamentoRegistradoNoAsaas: false })), 'ManualCartão');
  assert.equal(labels(markup({ criadaManualmente: true, origem: 'checkout', formaPagamento: 'PIX' })), 'Pix');
});

test('badge do método automático tem identificação visível e explicação', () => {
  const html = markup({ criadaManualmente: true, pagamentoRegistradoNoAsaas: true, formaPagamento: 'PIX', formaPagamentoAutomatica: true });
  assert.equal(labels(html), 'Pix · automático');
  assert.match(html, /title="Forma de pagamento gerada automaticamente no cadastro administrativo\."/);
  assert.doesNotMatch(html, />Manual/);
  assert.equal(labels(markup({ criadaManualmente: false, formaPagamento: 'Cartão de crédito', formaPagamentoAutomatica: true })), 'Cartão · automático');
});

test('método ausente ou desconhecido não ganha ícone ou rótulo inventado', () => {
  assert.equal(labels(markup({ criadaManualmente: false, formaPagamento: 'UNKNOWN', formaPagamentoAutomatica: true })), '');
  assert.equal(labels(markup({ criadaManualmente: true, origem: 'manual', formaPagamentoAutomatica: true })), 'Manual');
});
