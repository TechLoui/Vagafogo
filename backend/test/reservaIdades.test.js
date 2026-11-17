const test = require("node:test");
const assert = require("node:assert/strict");
const firebaseAdmin = require("../dist/services/firebaseAdmin");
const { simularReservaAgente, validarParticipacaoSite } = require("../dist/services/agentReservationTools");
const { regraIdade, validarIdadesCheckout, validarIdadesPorTipo } = require("../dist/services/reservaIdades");

const crianca = { id: "child-doc", nome: "Criança", idadeMinima: "6", idadeMaxima: 10 };
const isento = { id: "free-doc", nome: "Isento" };
const adulto = { id: "adult-doc", nome: "Adulto", perguntarIdade: false };
const catalogo = [adulto, crianca, isento];

test("usa a configuração da categoria e exige idade numérica inteira de cada criança, inclusive as isentas", () => {
  assert.deepEqual(regraIdade(crianca), { minima: 6, maxima: 10 });
  assert.deepEqual(regraIdade(isento), { minima: 0, maxima: 4 });
  assert.equal(regraIdade(adulto), undefined);

  const quantidades = { [crianca.id]: 2, [isento.id]: 1, [adulto.id]: 1 };
  for (const ages of [undefined, [], [6], [6, 8, 9], [false, 6], [null, 6], ["6", 8], [6.5, 9], [5, 6], [8, 11]]) {
    assert.equal(validarIdadesPorTipo(catalogo, quantidades, { [crianca.id]: ages, [isento.id]: [0] }).pendencias.length, 1);
  }
  assert.deepEqual(validarIdadesPorTipo(catalogo, quantidades, {
    [crianca.id]: [6, 10],
    [isento.id]: [0],
  }), { idades: { [crianca.id]: [6, 10], [isento.id]: [0] }, pendencias: [] });
});

test("checkout valida cada grupo separadamente e não deixa crianças sem representação nos grupos", () => {
  const grupo = { nome: "Brunch", participantesPorTipo: { [crianca.id]: 1 }, idadesPorTipo: { [crianca.id]: [6] } };
  const dados = {
    participantesPorTipo: { [crianca.id]: 2 },
    gruposParticipacao: [grupo, { ...grupo, nome: "Trilha" }],
    criancas: 2,
    naoPagante: 0,
  };
  assert.equal(validarIdadesCheckout(catalogo, dados).pendencias.length, 0);
  assert.ok(validarIdadesCheckout(catalogo, { ...dados, gruposParticipacao: [grupo] }).pendencias.length > 0);
  const semIdade = { ...grupo, nome: "Trilha", idadesPorTipo: {} };
  assert.match(validarIdadesCheckout(catalogo, { ...dados, gruposParticipacao: [grupo, semIdade] }).pendencias[0], /Trilha/);
  assert.ok(validarIdadesCheckout(catalogo, {
    gruposParticipacao: [{ participantesPorTipo: { infantil: 1 }, idadesPorTipo: { infantil: [5] } }],
    criancas: 0,
    naoPagante: 0,
  }).pendencias.length > 0);
});

test("checkout sem grupo exige idades dos participantes legados", () => {
  const dados = { gruposParticipacao: [], criancas: 1, naoPagante: 1 };
  assert.equal(validarIdadesCheckout(catalogo, dados).pendencias.length, 2);
  const idadesPorTipo = { [crianca.id]: [7], [isento.id]: [0] };
  assert.deepEqual(validarIdadesCheckout(catalogo, { ...dados, idadesPorTipo }), { pendencias: [], idades: idadesPorTipo });
});

test("agente impede pagamento sem idades completas e chat mantém a idade zero", async (t) => {
  const snapshot = (records) => ({
    docs: records.map(({ id, ...raw }) => ({ id, data: () => raw })),
  });
  const collections = {
    tipos_clientes: catalogo,
    pacotes: [{ id: "brunch", nome: "Brunch", precoAdulto: 100, precoCrianca: 40, horarios: ["10:00"], limite: 20 }],
    combos: [],
  };
  t.mock.method(firebaseAdmin, "obterFirestoreAdmin", () => ({
    collection: (name) => ({
      get: async () => snapshot(collections[name]),
      doc: () => ({ get: async () => ({ exists: false }) }),
      where: () => ({ get: async () => snapshot([]) }),
    }),
  }));
  const input = {
    pacoteId: "brunch",
    data: "2099-08-10",
    horario: "10:00",
    participantesPorTipo: { [adulto.id]: 1, [crianca.id]: 2, [isento.id]: 1 },
  };
  assert.equal((await simularReservaAgente(input)).prontoParaPagamento, false);
  const idadesInvalidas = { [crianca.id]: [6], [isento.id]: [false] };
  assert.equal((await simularReservaAgente({ ...input, idadesPorTipo: idadesInvalidas })).requisitosPendentes.length, 2);
  const idadesPorTipo = { [crianca.id]: [6, 10], [isento.id]: [0] };
  const resultado = await simularReservaAgente({ ...input, idadesPorTipo });
  assert.equal(resultado.prontoParaPagamento, true);
  assert.deepEqual(resultado.idadesPorTipo, idadesPorTipo);
  const participantesSite = await validarParticipacaoSite({ ...input, idadesPorTipo });
  assert.deepEqual(participantesSite.idadesPorTipo, idadesPorTipo);
  assert.deepEqual(participantesSite.pendencias, []);
});
