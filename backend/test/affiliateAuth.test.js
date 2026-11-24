const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { reservationFlowFixture } = require("./helpers/reservationFlowFixture");

let fixture = reservationFlowFixture({});
const replaceModule = (id, exports) => {
  const filename = require.resolve(id);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
};
replaceModule("firebase/firestore", new Proxy({}, { get: (_target, key) => fixture.firestore[key] }));
replaceModule("../dist/services/firebase", { db: {} });
replaceModule("../dist/server/formulariosPublicos", express.Router());
replaceModule("../dist/server/formulariosAdmin", express.Router());
const admin = require("../dist/services/firebaseAdmin");
const crm = require("../dist/middleware/crmAdminAuth");
const affiliate = require("../dist/middleware/affiliateAuth");
const api = require("../dist/server/api").default;

const claims = (uid, extra = {}) => ({ uid, sub: uid, exp: Math.floor(Date.now() / 1000) + 3600, ...extra });
const seed = {
  "affiliate_agencies/agency-a": { status: "active" },
  "affiliate_agencies/agency-b": { status: "active" },
  "affiliate_partners/partner-a": { status: "active", agencyId: "agency-a" },
  "affiliate_partners/partner-b": { status: "active", agencyId: "agency-b" },
  "affiliate_partners/independent": { status: "active", agencyId: null },
  "affiliate_memberships/agency-user": { role: "agency", status: "active", agencyId: "agency-a" },
  "affiliate_memberships/partner-user": { role: "partner", status: "active", agencyId: "agency-a", partnerId: "partner-a" },
  "affiliate_memberships/independent-user": { role: "partner", status: "active", agencyId: null, partnerId: "independent" },
  "reservas/private": { nome: "Private visitor", cpf: "00000000000", status: "pago" },
  "pacotes/brunch": { nome: "Brunch", ativo: true },
};

async function setup(t, { authAvailable = true, dbAvailable = true } = {}) {
  fixture = reservationFlowFixture(seed);
  const previous = process.env.CRM_ADMIN_EMAILS;
  process.env.CRM_ADMIN_EMAILS = "owner@example.com";
  t.after(() => {
    if (previous === undefined) delete process.env.CRM_ADMIN_EMAILS;
    else process.env.CRM_ADMIN_EMAILS = previous;
  });
  const tokens = {
    owner: claims("owner", { email: "OWNER@example.com", email_verified: true }),
    unverified: claims("unverified", { email: "owner@example.com", email_verified: false }),
    claimAdmin: claims("claimed-admin", { admin: true }),
    agency: claims("agency-user"), partner: claims("partner-user"), independent: claims("independent-user"),
    outsider: claims("outsider", { role: "admin", agencyId: "agency-a" }),
  };
  const verifications = [];
  t.mock.method(admin, "obterAuthAdmin", () => authAvailable ? {
    verifyIdToken: async (token, checkRevoked) => {
      verifications.push({ token, checkRevoked });
      assert.equal(checkRevoked, true);
      if (!tokens[token]) throw new Error("mock invalid or revoked token");
      return tokens[token];
    },
  } : null);
  t.mock.method(admin, "obterFirestoreAdmin", () => dbAvailable ? fixture.db : null);
  const app = express();
  app.get("/api/affiliates/me", affiliate.exigirAfiliado, (_req, res) => res.json(affiliate.obterIdentidadeAfiliado(res)));
  app.get("/identity", affiliate.exigirIdentidadeFirebase, (_req, res) => {
    const identity = affiliate.obterIdentidadeFirebase(res);
    res.json({ uid: identity.uid, emailVerified: identity.emailVerified });
  });
  app.use("/api", api);
  const server = await new Promise((resolve) => { const value = app.listen(0, "127.0.0.1", () => resolve(value)); });
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, token, method = "GET", body) => {
    const response = await fetch(base + path, {
      method, headers: { ...(token ? { Authorization: "Bearer " + token } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
  return { request, tokens, verifications };
}

test("CRM policy retains verified allowlist and explicit boolean admin only", () => {
  assert.equal(crm.usuarioPodeAdministrarCrm({ email: "OWNER@example.com", email_verified: true }, " owner@example.com "), true);
  assert.equal(crm.usuarioPodeAdministrarCrm({ email: "owner@example.com", email_verified: false }, "owner@example.com"), false);
  assert.equal(crm.usuarioPodeAdministrarCrm({ admin: "true" }, ""), false);
  assert.equal(crm.usuarioPodeAdministrarCrm({ role: "admin" }, ""), false);
  assert.equal(crm.usuarioPodeAdministrarCrm({ admin: true }, ""), true);
  assert.equal(crm.politicaAdminCrmConfigurada(" , "), false);
});

test("profile authenticates current owner and creates bounded server-owned browser approval", async (t) => {
  const { request, tokens } = await setup(t);
  const result = await request("/api/affiliates/me", "owner");
  assert.deepEqual(result, { status: 200, body: { uid: "owner", email: "OWNER@example.com", role: "admin", agencyId: null, partnerId: null } });
  const approval = fixture.value("_crm_admin_access/owner");
  assert.equal(approval.status, "active");
  assert.ok(approval.approvedUntil.toMillis() <= tokens.owner.exp * 1000);
  assert.ok(approval.approvedUntil.toMillis() > Date.now());
  assert.equal((await request("/api/reservas", "owner")).status, 200);
});

test("agency, agency partner and independent partner receive immutable UID scope, never browser admin", async (t) => {
  const { request } = await setup(t);
  for (const [token, role, agencyId, partnerId] of [
    ["agency", "agency", "agency-a", null],
    ["partner", "partner", "agency-a", "partner-a"],
    ["independent", "partner", null, "independent"],
  ]) {
    const result = await request("/api/affiliates/me?agencyId=agency-b&partnerId=partner-b&role=admin", token);
    assert.equal(result.status, 200);
    assert.equal(result.body.role, role);
    assert.equal(result.body.agencyId, agencyId);
    assert.equal(result.body.partnerId, partnerId);
    assert.equal(fixture.value("_crm_admin_access/" + result.body.uid), undefined);
  }
});

test("anonymous, invalid, revoked and unassigned users fail closed without leaking profile", async (t) => {
  const { request, verifications } = await setup(t);
  assert.equal((await request("/api/affiliates/me")).status, 401);
  assert.equal((await request("/api/affiliates/me", "revoked")).status, 401);
  assert.equal((await request("/api/affiliates/me", "unverified")).status, 403);
  assert.equal((await request("/api/affiliates/me", "outsider")).status, 403);
  assert.equal(fixture.writes.length, 0);
  assert.ok(verifications.every((value) => value.checkRevoked));
});

test("unassigned Firebase identity can redeem an invitation but has no affiliate permission", async (t) => {
  const { request } = await setup(t);
  assert.equal((await request("/identity", "outsider")).status, 200);
  assert.equal((await request("/api/affiliates/me", "outsider")).status, 403);
});

test("suspension of membership, partner or parent agency takes effect with the same token", async (t) => {
  const { request } = await setup(t);
  assert.equal((await request("/api/affiliates/me", "partner")).status, 200);
  for (const path of ["affiliate_agencies/agency-a", "affiliate_partners/partner-a", "affiliate_memberships/partner-user"]) {
    const original = fixture.value(path);
    fixture.rows.set(path, { ...original, status: "disabled" });
    const denied = await request("/api/affiliates/me", "partner");
    assert.equal(denied.status, 403);
    assert.equal(denied.body.code, "AFFILIATE_ACCESS_DISABLED");
    fixture.rows.set(path, original);
  }
});

test("corrupted, cross-agency and elevated membership records never acquire access", async (t) => {
  const { request } = await setup(t);
  const original = fixture.value("affiliate_memberships/partner-user");
  for (const change of [
    { role: "admin" }, { agencyId: "agency-b" }, { partnerId: "partner-b" },
    { agencyId: undefined }, { agencyId: "agency-a/hidden" }, { partnerId: "missing" },
  ]) {
    fixture.rows.set("affiliate_memberships/partner-user", { ...original, ...change });
    assert.equal((await request("/api/affiliates/me", "partner")).status, 403);
  }
  assert.equal(fixture.writes.length, 0);
});

test("all legacy private CRUD blocks agencies, partners and public requests before touching data", async (t) => {
  const { request } = await setup(t);
  for (const token of [undefined, "agency", "partner", "independent", "outsider"]) {
    for (const [path, method] of [
      ["/api/reservas", "GET"], ["/api/reservas", "POST"], ["/api/pacotes", "POST"],
      ["/api/reservas/private", "PUT"], ["/api/reservas/private", "DELETE"],
    ]) {
      const result = await request(path, token, method, method === "GET" ? undefined : { agencyId: "agency-a", status: "pago", admin: true });
      assert.equal(result.status, token ? 403 : 401, `${method} ${path} ${token}`);
      assert.equal(JSON.stringify(result.body).includes("Private visitor"), false);
    }
  }
  assert.equal(fixture.writes.length, 0);
  assert.equal(fixture.value("reservas/private").status, "pago");
  assert.equal((await request("/api/pacotes")).status, 200);
});

test("unavailable authentication/storage never falls back to granting an administrator", async (t) => {
  const { request } = await setup(t, { authAvailable: false });
  assert.equal((await request("/api/affiliates/me")).status, 401);
  assert.equal((await request("/api/affiliates/me", "owner")).status, 503);
  assert.equal(fixture.writes.length, 0);
});

test("missing Firestore Admin blocks both owner approval and affiliate profile", async (t) => {
  const { request } = await setup(t, { dbAvailable: false });
  assert.equal((await request("/api/affiliates/me", "owner")).status, 503);
  assert.equal((await request("/api/affiliates/me", "partner")).status, 503);
});
