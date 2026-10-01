const test = require("node:test");
const assert = require("node:assert/strict");

const { operatorPhoneVariants } = require("../dist/services/agentInternalOperators.js");

test("reconhece celular brasileiro com e sem o nono digito como a mesma identidade", () => {
  assert.deepEqual(
    operatorPhoneVariants("+55 (62) 99115-0376"),
    ["5562991150376", "556291150376"],
  );
  assert.deepEqual(
    operatorPhoneVariants("+55 (62) 9115-0376"),
    ["556291150376", "5562991150376"],
  );
});

test("nao altera telefone fixo brasileiro", () => {
  assert.deepEqual(operatorPhoneVariants("+55 (62) 3333-4444"), ["556233334444"]);
});

test("aceita numero nacional e inclui o codigo do Brasil", () => {
  assert.deepEqual(
    operatorPhoneVariants("(61) 98189-1707"),
    ["5561981891707", "556181891707"],
  );
});
