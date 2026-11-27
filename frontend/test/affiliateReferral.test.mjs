import test from 'node:test';
import assert from 'node:assert/strict';
import { validStoredAffiliateReferral, prepareAffiliateReferral, prepareAgencyReferral, agencySlugFromPath, currentAffiliateContextToken, clearAffiliateReferral } from '../src/features/affiliateReferral.ts';

test('indicação exige referências opacas válidas e não restaura contexto expirado', () => {
  const now = Date.parse('2026-11-24T12:00:00Z');
  const referral = { referralToken: 'a'.repeat(43), contextToken: 'b'.repeat(43), expiresAt: '2026-11-25T12:00:00Z', partnerName: 'Parceiro', agencyName: null };
  assert.deepEqual(validStoredAffiliateReferral(referral, now), referral);
  assert.equal(validStoredAffiliateReferral({ ...referral, expiresAt: '2026-11-23T12:00:00Z' }, now), null);
  assert.equal(validStoredAffiliateReferral({ ...referral, contextToken: 'agency-id' }, now), null);
});

test('metadados do navegador não são transportados como vínculo comercial ou comissão', () => {
  const referral = validStoredAffiliateReferral({ referralToken: 'a'.repeat(43), contextToken: 'b'.repeat(43), expiresAt: '2099-01-01T00:00:00Z', partnerName: 'Parceiro', agencyName: 'Agência', agencyId: 'forged', commissionRule: { value: 99 } });
  assert.equal('agencyId' in referral, false);
  assert.equal('commissionRule' in referral, false);
});

test('indicação oficial da agência preserva parceiro nulo e exige uma agência identificada', () => {
  const direct = {
    referralToken: 'f'.repeat(43), contextToken: 'g'.repeat(43), expiresAt: '2099-01-01T00:00:00Z',
    partnerName: null, agencyName: 'Synthetic Agency',
  };
  const restored = validStoredAffiliateReferral({ ...direct, agencyId: 'forged-agency', partnerId: 'forged-partner', commissionRule: { mode: 'percent', value: 99 } });
  assert.equal(restored.partnerName, null);
  assert.equal(restored.agencyName, 'Synthetic Agency');
  for (const key of ['agencyId', 'partnerId', 'commissionRule']) assert.equal(key in restored, false);
  for (const agencyName of [null, undefined, '', '   ']) {
    assert.equal(validStoredAffiliateReferral({ ...direct, agencyName }), null);
  }
});

test('storage bloqueado preserva o contexto para eventos, sem reemitir referências ou reutilizar outro link', async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  const reference = 'c'.repeat(43);
  const context = 'd'.repeat(43);
  let requests = 0;
  globalThis.window = {
    location: { search: `?ref=${reference}`, href: `https://vagafogo.com.br/reservar?ref=${reference}` },
    sessionStorage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); }, removeItem() {} },
    setTimeout, clearTimeout, history: { replaceState() {} },
  };
  globalThis.fetch = async () => {
    requests++;
    return { ok: true, json: async () => ({ contextToken: context, expiresAt: '2099-01-01T00:00:00Z', partnerName: 'Parceiro', agencyName: 'Agência' }) };
  };
  try {
    await Promise.all([prepareAffiliateReferral(), prepareAffiliateReferral()]);
    assert.equal(currentAffiliateContextToken(), context);
    await prepareAffiliateReferral();
    assert.equal(requests, 1);
    window.location.search = `?ref=${'e'.repeat(43)}`;
    assert.equal(currentAffiliateContextToken(), undefined);
    clearAffiliateReferral();
    assert.equal(currentAffiliateContextToken(), undefined);
  } finally {
    clearAffiliateReferral();
    globalThis.window = previousWindow;
    globalThis.fetch = previousFetch;
  }
});

const official = (agencySlug = 'synthetic-agency', token = 'h', context = 'i') => ({
  agencySlug, referralToken: token.repeat(43), contextToken: context.repeat(43),
  expiresAt: '2099-01-01T00:00:00Z', partnerName: null, agencyName: 'Synthetic Agency',
});
const reply = (body, status = 200) => ({ ok: status >= 200 && status < 300, json: async () => body });
const deferred = () => { let resolve; const promise = new Promise((yes) => { resolve = yes; }); return { promise, resolve }; };

async function withReferralBrowser(href, handler, run) {
  const previousWindow = globalThis.window, previousFetch = globalThis.fetch;
  const storage = new Map(), calls = [];
  const navigate = (value) => { window.location = new URL(value, 'https://vagafogo.com.br'); };
  globalThis.window = {
    location: new URL(href, 'https://vagafogo.com.br'),
    sessionStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
    setTimeout: (...args) => { const timer = setTimeout(...args); timer.unref(); return timer; }, clearTimeout,
    history: { state: {}, replaceState(_state, _title, url) { navigate(url); } },
  };
  clearAffiliateReferral();
  navigate(href);
  globalThis.fetch = async (url, init) => {
    const call = { path: new URL(url).pathname, method: init.method, body: JSON.parse(init.body) };
    calls.push(call);
    return handler(call);
  };
  try { return await run({ calls, navigate, storage }); }
  finally {
    clearAffiliateReferral();
    globalThis.window = previousWindow; globalThis.fetch = previousFetch;
  }
}

test('slug público é um único segmento canônico e não toma rotas do site, CRM ou arquivos', () => {
  assert.equal(agencySlugFromPath('/Synthetic-Agency/'), 'synthetic-agency');
  assert.equal(agencySlugFromPath('/' + 'a'.repeat(60)), 'a'.repeat(60));
  for (const path of ['/', '/ab', '/' + 'a'.repeat(61), '/-agency', '/agency-', '/two--names', '/agency/child', '/%2Fadmin', '/%5Cadmin', '/%E0%A4%A', '/logo.png', '/robots.txt', '/sitemap.xml', '/favicon.ico', '/agência']) {
    assert.equal(agencySlugFromPath(path), null, path);
  }
  for (const route of ['admin', 'agente', 'agencia', 'afiliados', 'api', 'assets', 'brunch', 'crm', 'educacao-ambiental', 'formulario', 'historia', 'login', 'minha-reserva', 'parceiro', 'planeje-sua-visita', 'reservar', 'trilha']) {
    assert.equal(agencySlugFromPath('/' + route), null, route);
    assert.equal(agencySlugFromPath('/' + route.toUpperCase()), null, route + ' uppercase');
  }
});

test('contexto oficial conserva somente logo pública da API e cores hex válidas', () => {
  const safeLogo = 'https://vagafogo-production.up.railway.app/api/affiliates/public/agencies/synthetic/logo?v=' + 'a'.repeat(24);
  const value = validStoredAffiliateReferral({ ...official(), agencyLogoUrl: safeLogo, agencyBranding: { primaryColor: '#a12040', accentColor: '#f4d168' }, agencyId: 'forged', commissionRule: { value: 99 } });
  assert.equal(value.agencyLogoUrl, safeLogo);
  assert.deepEqual(value.agencyBranding, { primaryColor: '#A12040', accentColor: '#F4D168' });
  assert.equal('agencyId' in value, false);
  assert.equal('commissionRule' in value, false);
  for (const agencyLogoUrl of ['https://synthetic.invalid/logo', safeLogo + '#fragment', safeLogo.replace('https://', 'https://user:pass@'), safeLogo.replace('?v=', '?other='), 'javascript:alert(1)']) {
    assert.equal(validStoredAffiliateReferral({ ...official(), agencyLogoUrl }).agencyLogoUrl, undefined);
  }
  assert.equal(validStoredAffiliateReferral({ ...official(), agencyBranding: { primaryColor: 'url(https://synthetic.invalid)', accentColor: '#FFFFFF' } }).agencyBranding, undefined);
});

test('slug visível resolve a agência sem vendedor, prevalece sobre ref e deduplica chamadas simultâneas', async () => {
  await withReferralBrowser('/synthetic-agency?ref=' + 'j'.repeat(43), async () => reply(official()), async ({ calls }) => {
    const [first, second] = await Promise.all([prepareAffiliateReferral(), prepareAgencyReferral('synthetic-agency')]);
    assert.equal(first.partnerName, null);
    assert.equal(second.contextToken, 'i'.repeat(43));
    assert.deepEqual(calls, [{ path: '/api/affiliates/public/resolve-slug', method: 'POST', body: { slug: 'synthetic-agency' } }]);
    assert.equal(currentAffiliateContextToken(), 'i'.repeat(43));
    await prepareAffiliateReferral();
    assert.equal(calls.length, 1, 'A valid in-memory result avoids another context per render');
  });
});

test('contexto restaurado é revalidado e resposta incompleta ou de outra agência nunca autoriza o checkout', async () => {
  await withReferralBrowser('/synthetic-agency', async () => reply(official('synthetic-agency', 'k', 'l')), async ({ calls, storage }) => {
    storage.set('vagafogo:affiliate-referral:v1', JSON.stringify(official()));
    const value = await prepareAgencyReferral('synthetic-agency');
    assert.equal(calls.length, 1, 'A restored session does not skip server validation of the official link');
    assert.equal(value.contextToken, 'l'.repeat(43));
  });
  for (const invalid of [
    { ...official(), referralToken: 'short' },
    { ...official(), contextToken: 'agency-id' },
    { ...official(), agencySlug: 'another-agency' },
    { ...official(), partnerName: 'A vendor' },
    { ...official(), agencyName: '' },
    { ...official(), expiresAt: '2020-01-01T00:00:00Z' },
  ]) {
    await withReferralBrowser('/synthetic-agency', async () => reply(invalid), async () => {
      await assert.rejects(prepareAgencyReferral('synthetic-agency'));
      assert.equal(currentAffiliateContextToken(), undefined);
    });
  }
});

test('resolução atrasada de outro slug e limpeza de indicação não restauram contexto antigo', async () => {
  const alpha = deferred(), beta = deferred();
  await withReferralBrowser('/alpha', ({ body }) => body.slug === 'alpha' ? alpha.promise : beta.promise, async ({ navigate }) => {
    const first = prepareAgencyReferral('alpha');
    navigate('/beta');
    const second = prepareAgencyReferral('beta');
    beta.resolve(reply(official('beta', 'm', 'n')));
    await second;
    alpha.resolve(reply(official('alpha', 'o', 'p')));
    assert.equal(await first, null);
    assert.equal(currentAffiliateContextToken(), 'n'.repeat(43));
  });
  const pending = deferred();
  await withReferralBrowser('/synthetic-agency', () => pending.promise, async () => {
    const result = prepareAgencyReferral('synthetic-agency');
    clearAffiliateReferral();
    pending.resolve(reply(official()));
    assert.equal(await result, null);
    assert.equal(currentAffiliateContextToken(), undefined);
  });
});

test('navegação genérica preserva a indicação, outro slug ou ref explícito não herda o contexto anterior', async () => {
  await withReferralBrowser('/synthetic-agency', async ({ body }) => body.slug === 'synthetic-agency' ? reply(official()) : reply({}, 404), async ({ navigate }) => {
    await prepareAgencyReferral('synthetic-agency');
    navigate('/reservar');
    assert.equal(currentAffiliateContextToken(), 'i'.repeat(43), 'Internal navigation remains part of the same referral');
    assert.equal((await prepareAffiliateReferral()).contextToken, 'i'.repeat(43));
    navigate('/reservar?ref=' + 'q'.repeat(43));
    assert.equal(currentAffiliateContextToken(), undefined);
    navigate('/another-agency');
    assert.equal(currentAffiliateContextToken(), undefined);
    await assert.rejects(prepareAffiliateReferral());
    assert.equal(currentAffiliateContextToken(), undefined);
    await assert.rejects(prepareAgencyReferral('admin'));
    navigate('/reservar');
    assert.equal(currentAffiliateContextToken(), undefined, 'An invalid explicit slug cannot fall back to an old campaign');
  });
});
