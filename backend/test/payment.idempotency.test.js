const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PaymentIdempotencyKeyError,
  calcularHashRequisicaoPagamento,
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
