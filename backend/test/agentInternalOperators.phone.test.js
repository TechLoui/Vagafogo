const test = require("node:test");
const assert = require("node:assert/strict");

const {
  internalPermissionsFrom,
  operatorPhoneVariants,
} = require("../dist/services/agentInternalOperators.js");

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

test("migra permissao antiga de reservas somente para confirmadas", () => {
  const permissions = internalPermissionsFrom({
    consultarReservas: true,
    consultarDisponibilidade: true,
    alterarDisponibilidade: false,
  });
  assert.equal(permissions.consultarReservasConfirmadas, true);
  assert.equal(permissions.consultarReservasPendentes, false);
  assert.equal(permissions.consultarReservasCanceladas, false);
});

test("preserva escopos granulares de disponibilidade", () => {
  const permissions = internalPermissionsFrom({
    alterarDia: true,
    alterarExperiencia: false,
    alterarHorario: true,
    ajustarVagasExtras: false,
  });
  assert.equal(permissions.alterarDia, true);
  assert.equal(permissions.alterarExperiencia, false);
  assert.equal(permissions.alterarHorario, true);
  assert.equal(permissions.ajustarVagasExtras, false);
});
