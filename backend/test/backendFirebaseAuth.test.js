const test = require("node:test");
const assert = require("node:assert/strict");
const { criarInicializadorFirebaseBackend, BACKEND_FIREBASE_UID } = require("../dist/services/backendFirebaseAuth");

test("backend authenticates once before use with its reserved UID and private service claim", async () => {
  const calls = [];
  const initialize = criarInicializadorFirebaseBackend({
    getAdminAuth: () => ({ createCustomToken: async (uid, claims) => { calls.push({ uid, claims }); return "mock-private-token"; } }),
    signIn: async (token) => { assert.equal(token, "mock-private-token"); calls.push("signed-in"); },
  });
  await Promise.all([initialize(), initialize(), initialize()]);
  await initialize();
  assert.deepEqual(calls, [{ uid: BACKEND_FIREBASE_UID, claims: { serverBackend: true } }, "signed-in"]);
});

test("backend has no anonymous fallback when Admin SDK is missing", async () => {
  let signedIn = false;
  const initialize = criarInicializadorFirebaseBackend({ getAdminAuth: () => null, signIn: async () => { signedIn = true; } });
  await assert.rejects(initialize(), { message: "BACKEND_FIREBASE_AUTH_UNAVAILABLE" });
  assert.equal(signedIn, false);
});

test("failed service sign-in exposes no credential and permits a deliberate startup retry", async () => {
  let attempts = 0;
  const initialize = criarInicializadorFirebaseBackend({
    getAdminAuth: () => ({ createCustomToken: async () => "mock-private-token" }),
    signIn: async () => { if (++attempts === 1) throw new Error("sensitive mock-private-token"); },
  });
  await assert.rejects(initialize(), { message: "BACKEND_FIREBASE_AUTH_UNAVAILABLE" });
  await initialize();
  assert.equal(attempts, 2);
});
