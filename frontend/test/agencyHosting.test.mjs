import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const configuration = readFileSync(new URL('../public/.htaccess', import.meta.url), 'utf8');

// Contract checks for this project's ordered per-directory rules. This is a
// small interpreter of the directives below, not an Apache deployment test.
const rules = [];
let conditions = [];
for (const raw of configuration.split(/\r?\n/)) {
  const line = raw.trim();
  const condition = /^RewriteCond\s+(\S+)\s+(\S+)(?:\s+\[([^\]]+)\])?$/.exec(line);
  if (condition) {
    conditions.push({ variable: condition[1], pattern: condition[2], flags: (condition[3] || '').split(',') });
    continue;
  }
  const rule = /^RewriteRule\s+(\S+)\s+(\S+)(?:\s+\[([^\]]+)\])?$/.exec(line);
  if (rule) {
    rules.push({ pattern: rule[1], substitution: rule[2], flags: (rule[3] || '').split(','), conditions });
    conditions = [];
  }
}

function evaluate(path, { file = false, directory = false } = {}) {
  const request = new URL(path, 'https://vagafogo.com.br');
  const input = request.pathname.replace(/^\//, '');
  const env = {};
  const variable = (name) => {
    if (name.startsWith('%{ENV:')) return env[name.slice(6, -1)] || '';
    const values = {
      '%{HTTP_HOST}': 'vagafogo.com.br', '%{HTTPS}': 'on', '%{HTTP:X-Forwarded-Proto}': 'https',
      '%{THE_REQUEST}': `GET ${request.pathname}${request.search} HTTP/1.1`, '%{REQUEST_URI}': request.pathname,
      '%{REQUEST_FILENAME}': request.pathname,
    };
    assert.ok(name in values, `Unsupported condition variable: ${name}`);
    return values[name];
  };
  const conditionMatches = ({ variable: name, pattern, flags }) => {
    if (pattern === '-f' || pattern === '!-f') return pattern === '-f' ? file : !file;
    if (pattern === '-d' || pattern === '!-d') return pattern === '-d' ? directory : !directory;
    const negate = pattern.startsWith('!');
    const expression = negate ? pattern.slice(1) : pattern;
    const result = expression.startsWith('=') ? variable(name) === expression.slice(1)
      : new RegExp(expression, flags.includes('NC') ? 'i' : '').test(variable(name));
    return negate ? !result : result;
  };
  const conditionsMatch = (list) => {
    for (let index = 0; index < list.length; index++) {
      let group = conditionMatches(list[index]);
      while (list[index].flags.includes('OR')) {
        const next = conditionMatches(list[++index]);
        group = group || next;
      }
      if (!group) return false;
    }
    return true;
  };
  for (const rule of rules) {
    const match = new RegExp(rule.pattern, rule.flags.includes('NC') ? 'i' : '').exec(input);
    if (!match || !conditionsMatch(rule.conditions)) continue;
    for (const flag of rule.flags) {
      if (!flag.startsWith('E=')) continue;
      const [name, value] = flag.slice(2).split(':');
      env[name] = value;
    }
    const destination = rule.substitution === '-' ? request.pathname : rule.substitution
      .replace(/\$(\d+)/g, (_all, index) => match[Number(index)] || '')
      .replace(/%\{REQUEST_URI\}/g, request.pathname);
    const status = Number(rule.flags.find((flag) => /^R=\d+$/.test(flag))?.slice(2) || 200);
    if (rule.flags.includes('L')) return { destination, status, env };
    assert.equal(rule.substitution, '-', 'The contract interpreter requires an explicit stop on path rewrites');
  }
  return { destination: request.pathname, status: 200, env };
}

const robotsHeaders = (env) => Array.from(configuration.matchAll(/^\s*Header\s+always\s+set\s+X-Robots-Tag\s+"([^"]+)"\s+env=(\S+)\s*$/gm))
  .filter((match) => env[match[2]]).map((match) => match[1]);

test('Hostinger preserva páginas existentes, arquivos e diretórios antes do fallback de agência', () => {
  for (const [path, destination] of [['/brunch', 'brunch/index.html'], ['/reservar', 'reservar/index.html'], ['/admin', 'admin/index.html'], ['/CRM', '/index.html'], ['/agente', '/index.html'], ['/formulario/synthetic', '/index.html']]) {
    const result = evaluate(path);
    assert.equal(result.status, 200, path);
    assert.equal(result.destination, destination, path);
    assert.equal(result.env.VAGAFOGO_AGENCY_LINK, undefined, path);
  }
  for (const path of ['/assets/synthetic.js', '/robots.txt', '/sitemap.xml', '/favicon.ico', '/existing-file']) {
    assert.deepEqual(evaluate(path, { file: true }), { destination: path, status: 200, env: {} });
  }
  assert.deepEqual(evaluate('/existing-directory', { directory: true }), { destination: '/existing-directory', status: 200, env: {} });
});

test('Hostinger abre slugs de agência no app e mantém noindex antes e depois da reescrita interna', () => {
  for (const path of ['/synthetic-agency', '/Synthetic-Agency/', '/' + 'a'.repeat(60), '/synthetic-agency?ref=ignored']) {
    const result = evaluate(path);
    assert.equal(result.status, 200, path);
    assert.equal(result.destination, '/index.html', path);
    assert.equal(result.env.VAGAFOGO_AGENCY_LINK, '1', path);
    assert.ok(robotsHeaders(result.env).some((header) => /\bnoindex\b/.test(header)), 'The original request must stay unindexed');
    assert.ok(robotsHeaders({ REDIRECT_VAGAFOGO_AGENCY_LINK: '1' }).some((header) => /\bnoindex\b/.test(header)), 'The internal redirect must retain noindex');
  }
});

test('Hostinger mantém 404 para caminhos aninhados, arquivos ausentes e slugs fora do contrato', () => {
  for (const path of ['/one/two', '/a', '/ab', '/' + 'a'.repeat(61), '/-agency', '/agency-', '/two--names', '/missing.png', '/404']) {
    assert.equal(evaluate(path).status, 404, path);
  }
});
