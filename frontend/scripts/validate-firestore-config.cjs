'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectDirectory = path.resolve(__dirname, '..');
const readProjectFile = (relativePath) =>
  fs.readFileSync(path.join(projectDirectory, relativePath), 'utf8');

const firebaseConfig = JSON.parse(readProjectFile('firebase.json'));
assert.equal(
  firebaseConfig.firestore?.rules,
  'firestore.rules',
  'firebase.json precisa publicar firestore.rules',
);
assert.equal(
  firebaseConfig.firestore?.indexes,
  'firestore.indexes.json',
  'firebase.json precisa publicar firestore.indexes.json',
);

const indexes = JSON.parse(readProjectFile(firebaseConfig.firestore.indexes));
assert.ok(Array.isArray(indexes.indexes), 'firestore.indexes.json: indexes deve ser uma lista');
assert.ok(
  Array.isArray(indexes.fieldOverrides),
  'firestore.indexes.json: fieldOverrides deve ser uma lista',
);

const rules = readProjectFile(firebaseConfig.firestore.rules);

const validateBalancedTokens = (source) => {
  const opening = new Map([
    ['{', '}'],
    ['(', ')'],
    ['[', ']'],
  ]);
  const closing = new Set(opening.values());
  const stack = [];
  let quote = null;
  let escaped = false;
  let lineComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }

    if (quote !== null) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '/' && nextCharacter === '/') {
      lineComment = true;
      index += 1;
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }

    if (opening.has(character)) {
      stack.push({ character, index });
      continue;
    }

    if (closing.has(character)) {
      const last = stack.pop();
      assert.ok(last, `Token ${character} sem abertura na posicao ${index}`);
      assert.equal(
        opening.get(last.character),
        character,
        `Token ${character} fecha incorretamente ${last.character} na posicao ${index}`,
      );
    }
  }

  assert.equal(quote, null, 'String sem fechamento em firestore.rules');
  assert.equal(stack.length, 0, 'Delimitador sem fechamento em firestore.rules');
};

validateBalancedTokens(rules);
assert.match(rules, /^rules_version\s*=\s*'2';/m, 'Firestore Rules v2 e obrigatorio');
assert.match(rules, /service\s+cloud\.firestore\s*\{/, 'Servico cloud.firestore ausente');
assert.match(
  rules,
  /match\s+\/databases\/\{database\}\/documents\s*\{/,
  'Escopo de documentos do Firestore ausente',
);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const matchBody = (pathPattern) => {
  const expression = new RegExp(
    `match\\s+${escapeRegExp(pathPattern)}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`,
    'm',
  );
  const found = expression.exec(rules);
  assert.ok(found, `Regra obrigatoria ausente: match ${pathPattern}`);
  return found[1];
};

for (const collectionName of [
  'formularios',
  '_formularios_public_ids',
  '_formularios_admin_idempotency',
  'respostas',
  '_payment_idempotency',
  '_crm_admin_access',
  'affiliate_memberships',
  'affiliate_agencies',
  'affiliate_partners',
  'affiliate_links',
  '_affiliate_emails',
  '_affiliate_link_tokens',
  '_affiliate_contexts',
  '_affiliate_session_contexts',
  '_affiliate_activations',
  '_affiliate_payment_evidence',
]) {
  const body = matchBody(`/${collectionName}/{document=**}`);
  assert.match(
    body,
    /allow\s+read\s*,\s*write\s*:\s*if\s+false\s*;/,
    `${collectionName} precisa negar toda leitura e escrita do cliente`,
  );
}

const declaredMatchPaths = Array.from(
  rules.matchAll(/^\s*match\s+([^\s]+)\s*\{\s*$/gm),
  (result) => result[1],
);
for (const collectionName of [
  'formularios',
  '_formularios_public_ids',
  '_formularios_admin_idempotency',
  'respostas',
  '_payment_idempotency',
  '_crm_admin_access',
  'affiliate_memberships',
  'affiliate_agencies',
  'affiliate_partners',
  'affiliate_links',
  '_affiliate_emails',
  '_affiliate_link_tokens',
  '_affiliate_contexts',
  '_affiliate_session_contexts',
  '_affiliate_activations',
  '_affiliate_payment_evidence',
]) {
  assert.deepEqual(
    declaredMatchPaths.filter((matchPath) => matchPath.startsWith(`/${collectionName}/`)),
    [`/${collectionName}/{document=**}`],
    `Nao adicione regra sobreposta que reabra ${collectionName}`,
  );
}

for (const collectionName of [
  'pacotes',
  'tipos_clientes',
  'combos',
  'disponibilidade',
]) {
  const body = matchBody(`/${collectionName}/{documentId}`);
  assert.match(body, /allow\s+read\s*:\s*if\s+true\s*;/, `${collectionName} precisa manter leitura publica`);
  assert.match(
    body,
    /allow\s+create\s*,\s*update\s*,\s*delete\s*:\s*if\s+isPrivileged\(\)\s*;/,
    `${collectionName} precisa exigir privilegio administrativo nas escritas`,
  );
}

const reservationsBody = matchBody('/reservas/{documentId}');
assert.match(
  reservationsBody,
  /allow\s+read\s*,\s*write\s*:\s*if\s+isPrivileged\(\)\s*;/,
  'reservas precisa negar acesso publico e logins de agencias/parceiros',
);

for (const collectionName of ['mesas', 'teste_conexao']) {
  const body = matchBody(`/${collectionName}/{documentId}`);
  assert.match(
    body,
    /allow\s+read\s*,\s*create\s*,\s*update\s*,\s*delete\s*:\s*if\s+isPrivileged\(\)\s*;/,
    `${collectionName} precisa exigir privilegio administrativo em toda operacao`,
  );
}

for (const collectionName of [
  'crm_campanhas', 'crm_campanhas_testes', 'crm_jornadas', 'crm_leads_agente',
  'crm_whatsapp_contatos', 'crm_whatsapp_mensagens', 'whatsapp_notificacoes_internas',
]) {
  const id = collectionName === 'crm_campanhas' ? 'campaignId'
    : collectionName === 'crm_campanhas_testes' ? 'testId'
    : collectionName === 'crm_jornadas' ? 'journeyId'
    : collectionName === 'crm_leads_agente' ? 'leadId' : 'documentId';
  const body = matchBody(`/${collectionName}/{${id}}`);
  assert.match(body, /allow\s+read\s*:\s*if\s+isPrivileged\(\)\s*;/);
  assert.match(body, /allow\s+write\s*:\s*if\s+false\s*;/);
}

const configurationsBody = matchBody('/configuracoes/{configId}');
assert.match(
  configurationsBody,
  /allow\s+get\s*:\s*if\s+configId\s*==\s*'site'\s*\|\|\s*isPrivileged\(\)\s*;/,
  'Somente site pode expor configuracao publica',
);
assert.match(
  configurationsBody,
  /allow\s+list\s*:\s*if\s+isPrivileged\(\)\s*;/,
  'Listagem de configuracoes precisa exigir privilegio administrativo',
);
assert.match(
  configurationsBody,
  /allow\s+create\s*,\s*update\s*,\s*delete\s*:\s*if\s+isPrivileged\(\)\s*;/,
  'Toda escrita de configuracao precisa exigir privilegio administrativo',
);

assert.match(rules, /function\s+isCrmAdmin\(\)[\s\S]*?_crm_admin_access\/\$\(request\.auth\.uid\)[\s\S]*?\.data\.status\s*==\s*'active'[\s\S]*?\.data\.approvedUntil\s*>\s*request\.time/);
assert.match(rules, /function\s+isBackendService\(\)[\s\S]*?request\.auth\.uid\s*==\s*'vagafogo-server-backend'[\s\S]*?request\.auth\.token\.serverBackend\s*==\s*true/);
assert.doesNotMatch(rules, /isSignedIn\s*\(/, 'Login isolado nao concede privilegios globais');

assert.doesNotMatch(
  rules,
  /match\s+\/\{[^/}]+(?:=\*\*)?\}/,
  'Nao use um wildcard na raiz: colecoes desconhecidas devem permanecer negadas',
);

console.log('Configuracao e invariantes de seguranca do Firestore validadas.');
console.log('- formularios, respostas e registros internos: acesso cliente negado');
console.log('- colecoes privadas: somente aprovacao administrativa ou sessao backend autenticada');
console.log('- agencias e parceiros: acesso exclusivamente por API com escopo do UID');

assert.equal(firebaseConfig.storage?.rules, 'storage.rules', 'firebase.json precisa publicar storage.rules');
const storageRules = readProjectFile(firebaseConfig.storage.rules);
validateBalancedTokens(storageRules);
assert.match(storageRules, /service\s+firebase\.storage\s*\{/);
assert.match(storageRules, /firestore\.get\([\s\S]*?_crm_admin_access[\s\S]*?approvedUntil\s*>\s*request\.time/);
assert.match(storageRules, /request\.auth\.uid\s*==\s*'vagafogo-server-backend'[\s\S]*?request\.auth\.token\.serverBackend\s*==\s*true/);
assert.doesNotMatch(storageRules, /isSignedIn\s*\(/);
const publicStoragePaths = [...storageRules.matchAll(/match\s+(\/[^\s]+)\s*\{\s*allow\s+get\s*:\s*if\s+true\s*;/g)].map((match) => match[1]);
assert.deepEqual(publicStoragePaths, ['/pacotes/icones/{packageId}/{filename}', '/combos/icones/{comboId}/{filename}']);
assert.doesNotMatch(storageRules, /allow\s+(?:write|create|update|delete)[^;]*:\s*if\s+true\s*;/);
console.log('- Storage: somente icones de catalogo publicos; alteracoes exigem privilegio');
