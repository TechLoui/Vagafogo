const { test } = require("node:test");
const assert = require("node:assert/strict");

process.env.FIREBASE_SERVICE_ACCOUNT = "";

const {
  escolhaModoReservaSite,
  urlFormularioReservaSite,
  selecionarModoReservaSite,
  corrigirRepeticaoModoReservaSite,
  carregarContextoModoReservaSite,
  uiReservaGuiadaSemRepetirEscolha,
} = require("../dist/services/siteBookingMode");
const {
  registrarMensagemConversaSite,
  obterConversaSite,
  removerConversaSite,
  alterarModoConversaSite,
} = require("../dist/services/siteChatConversations");

const knownDraft = () => ({
  tipoOferta: "combo", ofertaId: "combo-brunch-trilha", data: "2026-11-01", horario: "09:00",
  horariosPorPacote: { brunch: "09:00" },
  participantesPorTipo: { adulto: 2, nao_pagante: 1 },
  idadesPorTipo: { nao_pagante: [1] },
  nome: "Cliente", cpf: "12345678900", telefone: "5562999999999", email: "cliente@example.com",
});
let sequence = 0;
const session = () => `site_test_booking_mode_${Date.now()}_${++sequence}`;

test("reconhece a escolha exata e typed mode sem interpretar pergunta ou recusa como escolha", () => {
  assert.equal(escolhaModoReservaSite("Prefiro preencher o formulário da reserva por conta própria."), "site");
  assert.equal(escolhaModoReservaSite("Quero fazer a reserva guiada pela Jatobá, passo a passo."), "site_chat");
  assert.equal(escolhaModoReservaSite("Formulário por favor"), "site");
  assert.equal(escolhaModoReservaSite("", { step: "booking_mode", mode: "self_service" }), "site");
  assert.equal(escolhaModoReservaSite("", { step: "booking_mode", mode: "guided" }), "site_chat");
  for (const value of ["Como preencher o formulário?", "Quais dados preciso preencher no formulário", "Não quero preencher o formulário", "Ainda não sei como prefiro reservar", "Prefiro o formulário ou posso fazer no chat?"]) {
    assert.equal(escolhaModoReservaSite(value), null, value);
  }
});

test("URL do formulário preserva combo, data, 09h, dois adultos e criança de um ano sem PII", () => {
  const url = new URL(urlFormularioReservaSite(knownDraft()));
  assert.equal(url.origin, "https://vagafogo.com.br");
  assert.equal(url.pathname, "/reservar");
  assert.equal(url.searchParams.get("combo"), "combo-brunch-trilha");
  assert.equal(url.searchParams.get("data"), "2026-11-01");
  assert.equal(url.searchParams.get("horario"), "09:00");
  assert.deepEqual(JSON.parse(url.searchParams.get("participantes")), { adulto: 2, nao_pagante: 1 });
  assert.deepEqual(JSON.parse(url.searchParams.get("idades")), { nao_pagante: [1] });
  assert.deepEqual(JSON.parse(url.searchParams.get("horarios")), { brunch: "09:00" });
  for (const field of ["nome", "cpf", "telefone", "email", "agent_checkout"]) assert.equal(url.searchParams.has(field), false);
  const empty = new URL(urlFormularioReservaSite({}));
  assert.equal(empty.search, "");
  for (const date of ["2026-02-31", "2026-99-01", "data inválida"]) {
    assert.equal(new URL(urlFormularioReservaSite({ data: date })).searchParams.has("data"), false, date);
  }
  const invalidMaps = new URL(urlFormularioReservaSite({
    participantesPorTipo: { adulto: 2, excessivo: 100, constructor: 3, "tipo inválido": 1 },
    idadesPorTipo: { crianca: [1], prototype: [2] },
    horariosPorPacote: { brunch: "09:00", "../escape": "10:00" },
  }));
  assert.deepEqual(JSON.parse(invalidMaps.searchParams.get("participantes")), { adulto: 2 });
  assert.deepEqual(JSON.parse(invalidMaps.searchParams.get("idades")), { crianca: [1] });
  assert.deepEqual(JSON.parse(invalidMaps.searchParams.get("horarios")), { brunch: "09:00" });
});

test("escolha selfservice persiste canal sem apagar dados mesmo sem flag antiga siteBookingStarted", async () => {
  const previous = knownDraft();
  let savedPatch;
  let savedChoice;
  const result = await selecionarModoReservaSite({ sessionId: session(), phone: previous.telefone, mode: "site" }, {
    getDraft: async () => ({ encontrado: true, dados: previous }),
    saveDraft: async (input) => { savedPatch = input; return { encontrado: true, dados: { ...previous, ...input } }; },
    saveChoice: async (...args) => { savedChoice = args; },
  });
  assert.equal(savedPatch.canalConclusao, "site");
  assert.equal(savedPatch.siteBookingStarted, true);
  assert.deepEqual(savedPatch.participantesPorTipo, previous.participantesPorTipo);
  assert.deepEqual(savedPatch.idadesPorTipo, previous.idadesPorTipo);
  assert.equal(savedPatch.horario, "09:00");
  assert.equal(result.saved, true);
  assert.equal(savedChoice[1], "site");
  assert.match(result.reply, /formulário oficial/);
  assert.doesNotMatch(result.reply, /Como prefere/);
});

test("anônimo pode escolher formulário sem telefone e a escolha permanece no documento da sessão", async () => {
  const sessionId = session();
  await registrarMensagemConversaSite(sessionId, { from: "client", text: "Prefiro o formulário", sourceId: "client:choice" });
  const forbidden = async () => { throw new Error("PHONE_MUST_NOT_BE_REQUIRED"); };
  const result = await selecionarModoReservaSite({ sessionId, phone: "", mode: "site", bookingUi: { draft: knownDraft() } }, {
    getDraft: forbidden, saveDraft: forbidden,
  });
  assert.equal(result.saved, true);
  const restored = await obterConversaSite(sessionId);
  assert.equal(restored.bookingMode, "site");
  assert.equal(restored.bookingFormUrl, result.booking_form_url);
  assert.equal(restored.phone, "");
  await removerConversaSite(sessionId);
});

test("falha ao salvar rascunho é informada sem inventar sucesso nem perder link parcial", async () => {
  const result = await selecionarModoReservaSite({ sessionId: session(), phone: "5562999999999", mode: "site", bookingUi: { draft: knownDraft() } }, {
    getDraft: async () => ({ encontrado: true, dados: knownDraft() }),
    saveDraft: async () => { throw new Error("TEMPORARY_DATABASE_FAILURE"); },
    saveChoice: async () => undefined,
  });
  assert.equal(result.saved, false);
  assert.match(result.reply, /Não consegui confirmar o salvamento/);
  assert.equal(new URL(result.booking_form_url).searchParams.get("horario"), "09:00");
});

test("guided persiste site_chat e normaliza respostaInterativa; repetição do modelo é removida", async () => {
  const result = await selecionarModoReservaSite({ sessionId: session(), phone: "5562999999999", mode: "site_chat" }, {
    getDraft: async () => ({ encontrado: true, dados: knownDraft() }),
    saveDraft: async (input) => ({ encontrado: true, dados: input }),
    saveChoice: async () => undefined,
  });
  assert.deepEqual(result.selection, { step: "booking_mode", mode: "guided" });
  assert.equal(result.draft.canalConclusao, "site_chat");
  const body = { resposta: "Como prefere reservar?", booking_ui: { step: "booking_mode" }, handoff: null };
  assert.equal(corrigirRepeticaoModoReservaSite(body, result.mode, result.draft), true);
  assert.notEqual(body.booking_ui.step, "booking_mode");
  assert.equal(body.booking_ui.step, "availability");
  assert.match(body.resposta, /Posso conferir as vagas/);
  assert.doesNotMatch(body.resposta, /Confira os participantes|vaga confirmada|vagas confirmadas|calculado/i);
  assert.deepEqual(body.booking_ui.draft.participantesPorTipo, { adulto: 2, nao_pagante: 1 });
  assert.equal(body.handoff, null);
  assert.equal(body.booking_form_url, undefined);
  const formBody = { resposta: "Como prefere?", booking_ui: { step: "booking_mode" } };
  corrigirRepeticaoModoReservaSite(formBody, "site", knownDraft());
  assert.equal(formBody.booking_ui, null);
  assert.match(formBody.booking_form_url, /^https:\/\/vagafogo.com.br\/reservar\?/);
  assert.equal(formBody.booking_mode_selected, undefined);
});

test("guarda reidrata dados recentes mesmo com modo já conhecido e substitui URL antiga", async () => {
  let reads = 0;
  const fresh = { ...knownDraft(), data: "2026-11-02", horario: "10:00", horariosPorPacote: { brunch: "10:00" } };
  const chosen = await carregarContextoModoReservaSite({
    sessionId: session(), phone: "5562999999999", mode: "site",
    draft: { data: "2026-11-01", horario: "09:00" },
  }, { getDraft: async () => { reads++; return { encontrado: true, dados: { ...fresh, canalConclusao: "site_chat" } }; } });
  assert.equal(reads, 1);
  assert.equal(chosen.mode, "site");
  assert.deepEqual(chosen.draft.participantesPorTipo, { adulto: 2, nao_pagante: 1 });
  const body = { resposta: "Como prefere reservar?", booking_ui: { step: "booking_mode" } };
  corrigirRepeticaoModoReservaSite(body, chosen.mode, chosen.draft, urlFormularioReservaSite(knownDraft()));
  const url = new URL(body.booking_form_url);
  assert.equal(url.searchParams.get("data"), "2026-11-02");
  assert.equal(url.searchParams.get("horario"), "10:00");
  assert.deepEqual(JSON.parse(url.searchParams.get("idades")), { nao_pagante: [1] });
  const guided = { resposta: "Como prefere reservar?", booking_ui: { step: "booking_mode" } };
  corrigirRepeticaoModoReservaSite(guided, "site_chat", chosen.draft);
  assert.equal(guided.booking_ui.step, "availability");
});

test("handoff operacional real vence cartão booking_mode antigo após qualquer escolha", () => {
  const { deveEfetivarHandoffSite } = require("../dist/services/siteHumanHandoffPolicy");
  for (const mode of ["site", "site_chat"]) {
    const body = { resposta: "Vou encaminhar o cancelamento para a equipe.", booking_ui: { step: "booking_mode" }, handoff: { motivo: "cancelamento_reserva" } };
    assert.equal(deveEfetivarHandoffSite({ message: "Quero cancelar minha reserva", reply: body.resposta, messages: [] }), true);
    assert.equal(corrigirRepeticaoModoReservaSite(body, mode, knownDraft()), false);
    assert.equal(body.handoff.motivo, "cancelamento_reserva");
    assert.equal(body.booking_form_url, undefined);
    const informative = { resposta: "Posso pedir que a equipe continue seu atendimento. Quer que eu faça isso?", booking_ui: { step: "booking_mode" }, handoff: { motivo: "cancelamento_reserva" } };
    if (!deveEfetivarHandoffSite({ message: "Qual o prazo de cancelamento da reserva?", reply: informative.resposta, messages: [] })) informative.handoff = null;
    assert.equal(corrigirRepeticaoModoReservaSite(informative, mode, knownDraft()), true);
    assert.equal(informative.handoff, null);
  }
});

test("fallback guiado só solicita oferta, data ou participantes quando faltam", () => {
  assert.equal(uiReservaGuiadaSemRepetirEscolha({}).step, "experiences");
  assert.equal(uiReservaGuiadaSemRepetirEscolha({ ofertaId: "combo-real" }).step, "date");
  assert.equal(uiReservaGuiadaSemRepetirEscolha({ ofertaId: "combo-real", data: "2026-11-01", participantesPorTipo: { adulto: 0 } }).step, "participants");
  const complete = uiReservaGuiadaSemRepetirEscolha(knownDraft());
  assert.equal(complete.step, "availability");
  assert.deepEqual(complete.draft.idadesPorTipo, { nao_pagante: [1] });
  assert.match(complete.reply, /Posso conferir as vagas/);
});

test("cartão de modo antigo não substitui resposta válida à dúvida atual", () => {
  for (const mode of ["site", "site_chat"]) {
    const reply = "A trilha recebe visitantes das 9h às 16h, com entrada até 15h.";
    const body = { resposta: reply, booking_ui: { step: "booking_mode" }, mensagens_adicionais: ["Veja as orientações da visita."] };
    assert.equal(corrigirRepeticaoModoReservaSite(body, mode, knownDraft()), true);
    assert.equal(body.resposta, reply);
    assert.equal(body.booking_ui, null);
    assert.deepEqual(body.mensagens_adicionais, ["Veja as orientações da visita."]);
    assert.equal(body.booking_form_url, undefined);
  }
});

test("preferência não é persistida sobre operador que assumiu a conversa", async () => {
  const sessionId = session();
  await registrarMensagemConversaSite(sessionId, { from: "client", text: "Quero o formulário", sourceId: "client:choice" });
  await alterarModoConversaSite(sessionId, { mode: "human", updatedBy: "operator" });
  await assert.rejects(() => selecionarModoReservaSite({ sessionId, phone: "", mode: "site" }), /SITE_CHAT_MODE_CHANGED/);
  assert.equal((await obterConversaSite(sessionId)).updatedBy, "operator");
  await removerConversaSite(sessionId);
});
