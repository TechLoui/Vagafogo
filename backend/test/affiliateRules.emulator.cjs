// Explicit emulator-only suite. Run through firebase emulators:exec as documented.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const dependencies = process.env.FIREBASE_RULES_TEST_MODULES;
const localRequire = (name) => require(require.resolve(name, { paths: dependencies ? [dependencies] : [__dirname] }));
const { initializeTestEnvironment, assertFails, assertSucceeds } = localRequire('@firebase/rules-unit-testing');
const { doc, collection, getDoc, getDocs, setDoc, updateDoc, Timestamp, setLogLevel } = localRequire('firebase/firestore');
const { ref, uploadBytes, getMetadata, deleteObject, listAll } = localRequire('firebase/storage');
const projectId = 'demo-vagafogo-affiliates';
setLogLevel('silent'); // Expected denied writes are asserted below, without SDK warning spam.
const emulator = (name) => {
  const value = process.env[name] ?? '';
  const match = /^(?:127\.0\.0\.1|localhost):(\d+)$/.exec(value);
  assert.ok(match, `${name} must explicitly target a loopback emulator`);
  return { host: '127.0.0.1', port: Number(match[1]) };
};
let environment;
const database = (uid, claims = {}) => uid ? environment.authenticatedContext(uid, claims).firestore() : environment.unauthenticatedContext().firestore();
const storage = (uid, claims = {}) => uid ? environment.authenticatedContext(uid, claims).storage() : environment.unauthenticatedContext().storage();

test.before(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: { ...emulator('FIRESTORE_EMULATOR_HOST'), rules: fs.readFileSync(path.join(__dirname, '../../frontend/firestore.rules'), 'utf8') },
    storage: { ...emulator('FIREBASE_STORAGE_EMULATOR_HOST'), rules: fs.readFileSync(path.join(__dirname, '../../frontend/storage.rules'), 'utf8') },
  });
  await environment.clearFirestore();
  await environment.clearStorage();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const [target, value] of Object.entries({
      '_crm_admin_access/owner': { status: 'active', approvedUntil: Timestamp.fromMillis(Date.now() + 3600000) },
      '_crm_admin_access/expired': { status: 'active', approvedUntil: Timestamp.fromMillis(Date.now() - 1000) },
      '_crm_admin_access/disabled': { status: 'disabled', approvedUntil: Timestamp.fromMillis(Date.now() + 3600000) },
      'reservas/private': { nome: 'Synthetic visitor', status: 'pago' },
      'crm_jornadas/journey': { source: 'synthetic' },
      'crm_leads_agente/lead': { nome: 'Synthetic lead' },
      'crm_whatsapp_contatos/contact': { telefone: '00000000000' },
      'crm_whatsapp_mensagens/message': { body: 'Synthetic' },
      'crm_campanhas/campaign': { nome: 'Synthetic campaign' },
      'crm_campanhas/campaign/destinatarios/recipient': { nome: 'Synthetic recipient' },
      'configuracoes/site': { textoFuncionamento: 'Synthetic public text' },
      'configuracoes/email': { ativo: true },
      'configuracoes/emailQuota': { count: 0 },
      'mesas/table': { capacidade: 9 },
      'pacotes/package': { nome: 'Synthetic package' },
      'combos/combo': { nome: 'Synthetic combo' },
      'tipos_clientes/type': { nome: 'Synthetic type' },
      'disponibilidade/2099-01-01': { bloqueado: false },
      'affiliate_memberships/partner': { role: 'partner', partnerId: 'own', agencyId: 'agency-a', status: 'active' },
      'affiliate_partners/own': { agencyId: 'agency-a', status: 'active' },
    })) await setDoc(doc(db, target), value);
    for (const object of ['pacotes/icones/package/icon.png', 'combos/icones/combo/icon.png', 'crm-agente-galeria/gallery/private.jpg', 'crm-campanhas/owner/private.jpg', 'unknown/private.txt']) {
      await uploadBytes(ref(context.storage(), object), new Uint8Array([1, 2, 3]), { contentType: 'image/png' });
    }
  });
});
test.after(async () => { if (environment) await environment.cleanup(); });

test('public, agency and partner cannot read, list or change global reservations/CRM/configuration', async () => {
  for (const [uid, claims] of [[undefined, {}], ['agency', { role: 'agency', agencyId: 'agency-a' }], ['partner', { role: 'partner', agencyId: 'agency-a', partnerId: 'own' }]]) {
    const db = database(uid, claims);
    for (const target of ['reservas/private', 'crm_jornadas/journey', 'crm_leads_agente/lead', 'crm_whatsapp_contatos/contact', 'crm_whatsapp_mensagens/message', 'crm_campanhas/campaign', 'crm_campanhas/campaign/destinatarios/recipient', 'configuracoes/email', 'mesas/table']) {
      await assertFails(getDoc(doc(db, target)));
      await assertFails(setDoc(doc(db, target), { status: 'pago', agencyId: 'agency-a' }));
    }
    await assertFails(getDocs(collection(db, 'reservas')));
    await assertFails(getDocs(collection(db, 'configuracoes')));
    await assertFails(updateDoc(doc(db, 'configuracoes/emailQuota'), { count: 999 }));
  }
});

test('membership and approval cannot be read or written directly even by their UID or browser admin', async () => {
  for (const uid of ['partner', 'owner']) {
    const db = database(uid);
    for (const collectionName of ['_crm_admin_access', 'affiliate_memberships', 'affiliate_agencies', 'affiliate_partners', 'affiliate_links', '_affiliate_emails', '_affiliate_link_tokens', '_affiliate_contexts', '_affiliate_session_contexts', '_affiliate_activations', '_affiliate_payment_evidence', '_payment_idempotency']) {
      await assertFails(getDoc(doc(db, collectionName, uid)));
      await assertFails(setDoc(doc(db, collectionName, uid), { role: 'admin', status: 'active', approvedUntil: Timestamp.fromMillis(Date.now() + 3600000) }));
    }
  }
});

test('approved legacy admin and authenticated backend keep access while stale or forged identities are denied', async () => {
  await assertSucceeds(getDoc(doc(database('owner'), 'reservas/private')));
  await assertSucceeds(updateDoc(doc(database('owner'), 'reservas/private'), { chegou: true }));
  await assertSucceeds(getDocs(collection(database('owner'), 'crm_jornadas')));
  await assertSucceeds(getDoc(doc(database('vagafogo-server-backend', { serverBackend: true }), 'reservas/private')));
  await assertSucceeds(setDoc(doc(database('vagafogo-server-backend', { serverBackend: true }), 'pacotes/backend-created'), { nome: 'Synthetic' }));
  for (const [uid, claims] of [['expired', {}], ['disabled', {}], ['partner', { admin: true }], ['partner', { serverBackend: true }], ['vagafogo-server-backend', {}]]) {
    await assertFails(getDoc(doc(database(uid, claims), 'reservas/private')));
  }
});

test('public catalog remains readable and cannot be mutated without administrative approval', async () => {
  const anonymous = database();
  for (const name of ['pacotes', 'combos', 'tipos_clientes', 'disponibilidade']) {
    await assertSucceeds(getDocs(collection(anonymous, name)));
    await assertFails(setDoc(doc(anonymous, name, 'injected'), { nome: 'Injection' }));
    await assertFails(setDoc(doc(database('partner'), name, 'injected'), { nome: 'Injection' }));
  }
  await assertSucceeds(getDoc(doc(anonymous, 'configuracoes/site')));
});

test('Storage exposes only known public icon paths and rejects affiliate writes anywhere', async () => {
  for (const uid of [undefined, 'agency', 'partner']) {
    const bucket = storage(uid);
    for (const object of ['pacotes/icones/package/icon.png', 'combos/icones/combo/icon.png']) {
      await assertSucceeds(getMetadata(ref(bucket, object)));
      await assertFails(uploadBytes(ref(bucket, object), new Uint8Array([4])));
      await assertFails(deleteObject(ref(bucket, object)));
    }
    for (const object of ['crm-agente-galeria/gallery/private.jpg', 'crm-campanhas/owner/private.jpg', 'unknown/private.txt']) {
      await assertFails(getMetadata(ref(bucket, object)));
      await assertFails(uploadBytes(ref(bucket, object), new Uint8Array([4])));
    }
    await assertFails(listAll(ref(bucket)));
  }
});

test('Storage cross-service approval allows current admin/backend and denies expired or forged approval', async () => {
  for (const [uid, claims] of [['owner', {}], ['vagafogo-server-backend', { serverBackend: true }]]) {
    const bucket = storage(uid, claims);
    await assertSucceeds(getMetadata(ref(bucket, 'crm-agente-galeria/gallery/private.jpg')));
    await assertSucceeds(uploadBytes(ref(bucket, 'pacotes/icones/package/approved.png'), new Uint8Array([5])));
  }
  for (const [uid, claims] of [['expired', {}], ['disabled', {}], ['partner', { admin: true }], ['partner', { serverBackend: true }]]) {
    await assertFails(uploadBytes(ref(storage(uid, claims), 'pacotes/icones/package/denied.png'), new Uint8Array([5])));
    await assertFails(getMetadata(ref(storage(uid, claims), 'crm-agente-galeria/gallery/private.jpg')));
  }
});
