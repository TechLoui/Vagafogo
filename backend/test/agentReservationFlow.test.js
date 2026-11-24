const test = require("node:test");
const assert = require("node:assert/strict");
const firebaseAdmin = require("../dist/services/firebaseAdmin.js");

const {
  cpfValidoParaReservaAgente,
  consultarReservaClienteAgente,
  reservaClientePodeConsultar,
  reservationDraftIdentity,
  reservaAgenteTemConfirmacaoResumo,
} = require("../dist/services/agentReservationTools.js");

test("pagamento exige confirmacao explicita do resumo", () => {
  assert.equal(reservaAgenteTemConfirmacaoResumo({}), false);
  assert.equal(reservaAgenteTemConfirmacaoResumo({ confirmouResumo: false }), false);
  assert.equal(reservaAgenteTemConfirmacaoResumo({ confirmouResumo: "true" }), false);
  assert.equal(reservaAgenteTemConfirmacaoResumo({ confirmouResumo: true }), true);
});

test("CPF precisa passar pelos dois digitos verificadores antes do pagamento", () => {
  assert.equal(cpfValidoParaReservaAgente("529.982.247-25"), true);
  assert.equal(cpfValidoParaReservaAgente("970.560.661-15"), false);
  assert.equal(cpfValidoParaReservaAgente("979.560.661-16"), false);
  assert.equal(cpfValidoParaReservaAgente("111.111.111-11"), false);
  assert.equal(cpfValidoParaReservaAgente("123"), false);
  assert.equal(cpfValidoParaReservaAgente("529982247250"), false);
});

test("consulta da reserva exige identidade diferente no site e no WhatsApp", () => {
  const reserva = { cpf: "529.982.247-25", telefone: "+55 (62) 99222-5471" };
  assert.equal(reservaClientePodeConsultar(reserva, { canal: "site", cpf: "52998224725" }), true);
  assert.equal(reservaClientePodeConsultar(reserva, { canal: "site", cpf: "11111111111" }), false);
  assert.equal(reservaClientePodeConsultar(reserva, { canal: "site", telefone: reserva.telefone }), false);
  assert.equal(reservaClientePodeConsultar(reserva, { canal: "whatsapp", telefone: "556292225471" }), true);
  assert.equal(reservaClientePodeConsultar(reserva, { canal: "whatsapp", telefone: "5562999999999" }), false);
});

const mockLookup = (t, records = {}) => {
  const reads = [];
  t.mock.method(firebaseAdmin, "obterFirestoreAdmin", () => ({
    collection: (name) => {
      assert.equal(name, "reservas");
      // No where()/list API: lookup must read only the supplied document code.
      return { doc: (code) => ({ get: async () => {
        reads.push(code);
        return { exists: Object.hasOwn(records, code), data: () => records[code] };
      } }) };
    },
  }));
  return reads;
};
const BOOKING_CODE = "d65f6a92-03b6-4d11-a649-b74bd0efeb98";

test("site never consults customer history with only CPF or CPF plus known phone", async (t) => {
  const reads = mockLookup(t);
  for (const codigo of [undefined, "short", "A".repeat(129), BOOKING_CODE + "/nested"]) {
    assert.deepEqual(await consultarReservaClienteAgente({ canal: "site", cpf: "52998224725", telefone: "5562999991234", codigo }),
      { encontrada: false, motivo: "codigo_invalido" });
  }
  assert.deepEqual(reads, []);
});

test("site requires matching CPF and unpredictable code, and returns only that reservation", async (t) => {
  const record = { cpf: "529.982.247-25", data: "2099-01-01", status: "pago", atividade: "Brunch", horario: "11:00", participantes: 2,
    nome: "PRIVATE NAME", email: "PRIVATE EMAIL", telefone: "PRIVATE PHONE", commercialAttribution: { partnerId: "PRIVATE PARTNER" } };
  const reads = mockLookup(t, { [BOOKING_CODE]: record, otherCustomerBooking: { ...record, data: "2099-12-31" } });
  const result = await consultarReservaClienteAgente({ canal: "site", cpf: "52998224725", codigo: BOOKING_CODE });
  assert.equal(result.encontrada, true);
  assert.equal(result.reservas.length, 1);
  assert.equal(result.maisReservas, false);
  assert.equal(result.reservas[0].data, "2099-01-01");
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|cpf|email|telefone|partnerId/);
  assert.deepEqual(reads, [BOOKING_CODE]);
  const mismatch = await consultarReservaClienteAgente({ canal: "site", cpf: "11144477735", codigo: BOOKING_CODE });
  const absent = await consultarReservaClienteAgente({ canal: "site", cpf: "52998224725", codigo: "B".repeat(20) });
  assert.deepEqual(mismatch, { encontrada: false, motivo: "nao_localizada" });
  assert.deepEqual(absent, mismatch);
});

test("site does not read any reservation when CPF is absent or invalid even with a valid code", async (t) => {
  const reads = mockLookup(t);
  for (const cpf of [undefined, "11111111111", "123"]) {
    assert.deepEqual(await consultarReservaClienteAgente({ canal: "site", cpf, codigo: BOOKING_CODE }),
      { encontrada: false, motivo: "cpf_necessario" });
  }
  assert.deepEqual(reads, []);
});

test("WhatsApp keeps document code plus verified phone, never listing history", async (t) => {
  const reads = mockLookup(t, { [BOOKING_CODE]: { telefone: "+55 (62) 99222-5471", status: "pago", atividade: "Brunch", data: "2099-01-01" } });
  const found = await consultarReservaClienteAgente({ canal: "whatsapp", codigo: BOOKING_CODE, telefone: "556292225471" });
  assert.equal(found.encontrada, true);
  assert.equal(found.codigo, BOOKING_CODE);
  assert.deepEqual(await consultarReservaClienteAgente({ canal: "whatsapp", codigo: BOOKING_CODE, telefone: "5562999999999" }),
    { encontrada: false, motivo: "nao_localizada" });
  assert.deepEqual(reads, [BOOKING_CODE, BOOKING_CODE]);
});

test("rascunhos do site sao separados por atendimento, sem alterar o do WhatsApp", () => {
  const telefone = "5562992225471";
  const siteA = reservationDraftIdentity({ sessionId: "site_atendimento_um_123", telefone });
  const siteB = reservationDraftIdentity({ sessionId: "site_atendimento_dois_456", telefone });
  const whatsapp = reservationDraftIdentity({ sessionId: `whatsapp_${telefone}`, telefone });
  assert.notEqual(siteA.id, siteB.id);
  assert.notEqual(siteA.id, whatsapp.id);
  assert.equal(whatsapp.sessionId, `whatsapp_${telefone}`);
});
