const test = require("node:test");
const assert = require("node:assert/strict");
const firebaseAdmin = require("../dist/services/firebaseAdmin");

const {
  PaymentIdempotencyKeyError,
  calcularHashRequisicaoPagamento,
  iniciarTentativaPagamento,
  normalizarChaveIdempotenciaPagamento,
} = require("../dist/services/paymentIdempotency");

test("aceita e normaliza uma chave de idempotencia segura", () => {
  assert.equal(
    normalizarChaveIdempotenciaPagamento("  payment-12345678  "),
    "payment-12345678"
  );
});

test("rejeita chave ausente, curta ou com caracteres inseguros", () => {
  for (const value of [undefined, "short", "payment key with spaces"]) {
    assert.throws(
      () => normalizarChaveIdempotenciaPagamento(value),
      PaymentIdempotencyKeyError
    );
  }
});

test("gera o mesmo fingerprint independentemente da ordem dos campos", () => {
  const first = {
    nome: "Cliente",
    valor: 150,
    billingType: "CREDIT_CARD",
    pacoteIds: ["a", "b"],
  };
  const second = {
    pacoteIds: ["a", "b"],
    billingType: "CREDIT_CARD",
    valor: 150,
    nome: "Cliente",
  };

  assert.equal(
    calcularHashRequisicaoPagamento(first),
    calcularHashRequisicaoPagamento(second)
  );
});

test("nao persiste diferencas de numero ou codigo de seguranca no fingerprint", () => {
  const base = {
    nome: "Cliente",
    valor: 150,
    creditCard: {
      holderName: "CLIENTE TESTE",
      number: "4111111111111111",
      expiryMonth: "12",
      expiryYear: "2030",
      ccv: "123",
    },
  };
  const otherSecrets = {
    ...base,
    creditCard: {
      ...base.creditCard,
      number: "5555555555554444",
      ccv: "999",
    },
  };

  assert.equal(
    calcularHashRequisicaoPagamento(base),
    calcularHashRequisicaoPagamento(otherSecrets)
  );
});

test("detecta alteracoes nos dados comerciais da tentativa", () => {
  const base = { nome: "Cliente", valor: 150, billingType: "CREDIT_CARD" };
  assert.notEqual(
    calcularHashRequisicaoPagamento(base),
    calcularHashRequisicaoPagamento({ ...base, valor: 151 })
  );
});

test("validação nova permite retomar um pagamento anterior sem abrir tentativa nova", async (t) => {
  const payload = { participantesPorTipo: { crianca: 1 } };
  const key = "previous-payment-1234";
  let existing = null;
  t.mock.method(firebaseAdmin, "obterFirestoreAdmin", () => ({
    collection: () => ({ doc: () => ({}) }),
    runTransaction: (callback) => callback({
      get: async () => ({ exists: existing !== null, data: () => existing }),
      create: () => assert.fail("Nenhuma tentativa nova pode ser criada"),
    }),
  }));
  assert.deepEqual(await iniciarTentativaPagamento(key, payload, false), { type: "missing" });

  existing = {
    requestHash: calcularHashRequisicaoPagamento(payload),
    status: "completed",
    httpStatus: 200,
    responseBody: { resultado: "anterior" },
  };
  assert.deepEqual(await iniciarTentativaPagamento(key, payload, false), {
    type: "replay",
    response: { httpStatus: 200, body: { resultado: "anterior" } },
  });
  assert.deepEqual(await iniciarTentativaPagamento(key, { ...payload, outro: true }, false), { type: "conflict" });
});
