const { test } = require("node:test");
const assert = require("node:assert/strict");

process.env.FIREBASE_SERVICE_ACCOUNT = "";

const {
  pediuAcaoHumanaSite,
  ofereceuAtendimentoHumanoSite,
  confirmouOfertaHumanaSite,
  deveEfetivarHandoffSite,
  intencaoRemarcacaoLegadaSite,
  alvoRemarcacaoLegadaSite,
} = require("../dist/services/siteHumanHandoffPolicy");
const {
  alterarModoConversaSite,
  obterConversaSite,
  registrarMensagemConversaSite,
  recuperarBotAposOfertaHumanaSite,
  recuperarBotParaRemarcacaoSite,
  removerConversaSite,
  salvarContinuacaoWhatsappSite,
} = require("../dist/services/siteChatConversations");

const offer = "Sobre prazos de cancelamento, não tenho essa informação confirmada por aqui. Se você já tem uma reserva e precisa tratar cancelamento ou prazo, posso pedir que a equipe continue seu atendimento. Quer que eu faça isso?";
let sequence = 0;
const session = () => `site_test_handoff_policy_${Date.now()}_${++sequence}`;
const addMessage = (sessionId, from, text, sourceId) => registrarMensagemConversaSite(sessionId, {
  from, text, sourceId, name: "Cliente", phone: "5562999990000",
});

const createLegacyReschedule = async (sessionId) => {
  await addMessage(sessionId, "client", "Queria alterar a data da minha reserva para 01/11/2026 às 11h", "client:change");
  await addMessage(sessionId, "bot", "Não consigo visualizar o andamento da remarcação. Nossa equipe vai continuar pelo WhatsApp.", "bot:old-change");
  await salvarContinuacaoWhatsappSite(sessionId, {
    requestId: "site-whatsapp:legacy-reschedule", status: "sent", requestedAt: Date.now(), requestedHuman: true,
    reason: "alteracao_reserva", context: "Alteração de data", phone: "5562999990000", sentAt: Date.now(),
    lastAttemptAt: Date.now(), lastError: null, gatewayJid: "confirmed@lid",
  });
  await alterarModoConversaSite(sessionId, { mode: "human", updatedBy: "jatoba", reason: "alteracao_reserva" });
};

test("retoma remarcação legada já encaminhada ao WhatsApp sem reencaminhar a coleta", async () => {
  const sessionId = session();
  await createLegacyReschedule(sessionId);
  const before = await obterConversaSite(sessionId);
  assert.match(intencaoRemarcacaoLegadaSite(before, "529.982.247-25"), /Queria alterar/);
  const result = await recuperarBotParaRemarcacaoSite(sessionId, "529.982.247-25");
  assert.equal(result.recovered, true);
  assert.equal(result.conversation.mode, "bot");
  assert.equal(result.conversation.handoffPending, false);
  assert.equal(result.conversation.whatsappContinuation.status, "cancelled");
  assert.equal(result.conversation.whatsappContinuation.requestedHuman, false);
  assert.equal(result.conversation.whatsappContinuation.sentAt, before.whatsappContinuation.sentAt, "mantém prova do envio antigo");
  assert.deepEqual(result.conversation.messages, before.messages);
  await removerConversaSite(sessionId);
});

test("remarcação legada não toma atendimento manual, bloqueado, cancelamento ou atendente explícito", async () => {
  for (const scenario of ["operator", "blocked", "manual", "human-request", "cancellation", "human-accepted"]) {
    const sessionId = session();
    await createLegacyReschedule(sessionId);
    if (scenario === "operator") await alterarModoConversaSite(sessionId, { mode: "human", updatedBy: "operador@fazenda" });
    if (scenario === "blocked") await alterarModoConversaSite(sessionId, { mode: "blocked", updatedBy: "admin" });
    if (scenario === "manual") await addMessage(sessionId, "agent", "Estou acompanhando a alteração", "agent:manual");
    if (scenario === "human-request") await addMessage(sessionId, "client", "Quero falar com um atendente", "client:human");
    if (scenario === "cancellation") await addMessage(sessionId, "client", "Quero cancelar minha reserva", "client:cancel");
    if (scenario === "human-accepted") {
      await addMessage(sessionId, "bot", "Quer que eu encaminhe para nossa equipe?", "bot:human-offer");
      await addMessage(sessionId, "client", "Sim, pode encaminhar", "client:human-accepted");
    }
    const before = await obterConversaSite(sessionId);
    const result = await recuperarBotParaRemarcacaoSite(sessionId, "Qual o andamento da remarcação?");
    assert.equal(result.recovered, false, scenario);
    assert.equal(result.conversation.mode, before.mode, scenario);
    assert.equal(result.conversation.updatedBy, before.updatedBy, scenario);
    await removerConversaSite(sessionId);
  }
});

test("recuperação de remarcação revalida operador assumido após o snapshot local", async () => {
  const sessionId = session();
  await createLegacyReschedule(sessionId);
  const cached = await obterConversaSite(sessionId);
  let writes = 0;
  const remote = { ...cached, updatedBy: "operador@fazenda", handoffPending: false, controlUpdatedAt: Date.now() + 100 };
  const db = { collection: () => ({ doc: () => ({ id: sessionId }) }), runTransaction: async (callback) => callback({
    get: async () => ({ exists: true, id: sessionId, data: () => remote }), set: () => { writes++; },
  }) };
  const result = await recuperarBotParaRemarcacaoSite(sessionId, "Pode remarcar?", { db });
  assert.equal(result.recovered, false);
  assert.equal(result.conversation.updatedBy, "operador@fazenda");
  assert.equal(writes, 0);
  await removerConversaSite(sessionId);
});

test("legado de nome, titular e participantes continua com atendimento humano", async () => {
  for (const message of ["Quero alterar o nome do titular da minha reserva", "Preciso mudar a quantidade de participantes", "Quero trocar o pacote da minha reserva"]) {
    const sessionId = session();
    await createLegacyReschedule(sessionId);
    let conversation = await obterConversaSite(sessionId);
    assert.equal(intencaoRemarcacaoLegadaSite(conversation, message), null, message);
    await addMessage(sessionId, "client", message, "client:other-change");
    conversation = await obterConversaSite(sessionId);
    assert.equal(intencaoRemarcacaoLegadaSite(conversation, "oi?"), null, message);
    await removerConversaSite(sessionId);
  }
});

test("restaura somente alvo explícito, sem reaproveitar data atual ou data de consulta de andamento", () => {
  const now = Date.parse("2026-10-30T14:00:00Z");
  assert.deepEqual(alvoRemarcacaoLegadaSite("Queria alterar a data da minha reserva para 01/11/2026 às 11h", now), { novaData: "2026-11-01", novoHorario: "11:00" });
  assert.deepEqual(alvoRemarcacaoLegadaSite("Quero mudar o dia de 31/10 para 01/11 às 11:30", now), { novaData: "2026-11-01", novoHorario: "11:30" });
  assert.deepEqual(alvoRemarcacaoLegadaSite("Quero alterar o horário de 09h para 13h", now), { novoHorario: "13:00" });
  assert.deepEqual(alvoRemarcacaoLegadaSite("Quero remarcar para 2026-11-07 às 11:00", now), { novaData: "2026-11-07", novoHorario: "11:00" });
  assert.deepEqual(alvoRemarcacaoLegadaSite("Qual o andamento da remarcação para 01/11 às 11h?", now), {});
  assert.deepEqual(alvoRemarcacaoLegadaSite("Quero mudar a data para 31/02/2026 às 25h", now), {});
});

test("pergunta de status não apaga alvo original e horário do combo continua remarcação", () => {
  const now = Date.now();
  const conversation = { mode: "human", updatedBy: "jatoba", handoffPending: true, controlUpdatedAt: now,
    messages: [
      { from: "client", text: "Quero alterar o horário do combo Brunch + Trilha para 11h", ts: now - 5 },
      { from: "bot", text: "Encaminhei a alteração", ts: now - 4 },
      { from: "client", text: "Qual o andamento da remarcação para 12h?", ts: now - 3 },
    ] };
  const intent = intencaoRemarcacaoLegadaSite(conversation, "oi?");
  assert.equal(intent, conversation.messages[0].text);
  assert.deepEqual(alvoRemarcacaoLegadaSite(intent), { novoHorario: "11:00" });
  conversation.messages[0].text = "Preciso mudar a data da minha experiência para 03/11/2026";
  assert.equal(intencaoRemarcacaoLegadaSite(conversation, "oi?"), conversation.messages[0].text);
});

test("recuperação preserva data e horário recebidos em respostas aos campos do fluxo antigo", () => {
  const now = Date.now();
  const conversation = { mode: "human", updatedBy: "jatoba", handoffPending: true, controlUpdatedAt: now,
    messages: [
      { from: "client", text: "Quero alterar a data da minha reserva", ts: now - 9 },
      { from: "bot", text: "Qual a nova data desejada?", ts: now - 8 },
      { from: "client", text: "03/11/2026", ts: now - 7 },
      { from: "bot", text: "Qual o novo horário?", ts: now - 6 },
      { from: "client", text: "11h", ts: now - 5 },
      { from: "bot", text: "A equipe continuará no WhatsApp", ts: now - 4 },
      { from: "client", text: "Qual o andamento da remarcação?", ts: now - 3 },
    ] };
  assert.deepEqual(alvoRemarcacaoLegadaSite(intencaoRemarcacaoLegadaSite(conversation, "52998224725")), { novaData: "2026-11-03", novoHorario: "11:00" });
});
const createLegacyOffer = async (sessionId, question = "Qual o prazo de cancelamento da reserva?") => {
  await addMessage(sessionId, "client", question, "client:policy");
  await addMessage(sessionId, "bot", offer, "bot:offer");
  await alterarModoConversaSite(sessionId, { mode: "human", updatedBy: "jatoba", reason: "cancelamento_reserva" });
};

test("oferta da screenshot e dúvidas de prazo/desconto não autorizam handoff", () => {
  assert.equal(ofereceuAtendimentoHumanoSite(offer), true);
  for (const message of [
    "Qual o prazo de cancelamento da reserva?",
    "O aniversariante tem desconto??",
    "Pode cancelar a reserva até quantos dias antes?",
    "Gostaria de saber se pode cancelar a reserva",
    "Se eu cancelar a reserva, tem reembolso?",
    "Existe reembolso?",
  ]) {
    assert.equal(pediuAcaoHumanaSite(message), false, message);
    assert.equal(deveEfetivarHandoffSite({ message, reply: offer, messages: [] }), false, message);
  }
  assert.equal(deveEfetivarHandoffSite({ message: "Qual o horário?", reply: "Posso encaminhar você para nossa equipe. Quer que eu faça isso?", messages: [] }), false);
});

test("aceite a oferta, pedido humano e operação real continuam autorizando handoff", () => {
  const messages = [{ from: "bot", text: offer }];
  for (const message of ["Sim", "Sim, pode encaminhar", "Pode sim encaminhar", "Pode encaminhar, por favor", "Sim por favor pode pedir"]) {
    assert.equal(confirmouOfertaHumanaSite(message, messages), true, message);
    assert.equal(deveEfetivarHandoffSite({ message, reply: offer, messages }), true, message);
  }
  assert.equal(confirmouOfertaHumanaSite("Sim", [{ from: "bot", text: "Você deseja visitar amanhã?" }]), false);
  assert.equal(confirmouOfertaHumanaSite("Não", messages), false);
  for (const message of ["Não", "Não quero atendente", "Prefiro continuar por aqui"]) {
    assert.equal(deveEfetivarHandoffSite({ message, reply: "Seguimos por aqui.", messages }), false, message);
  }
  for (const message of ["Quero cancelar minha reserva", "Preciso alterar minha reserva para o dia 01/11", "Pode cancelar minha reserva, por favor?", "Quero falar com um atendente", "Preciso de reembolso"]) {
    assert.equal(deveEfetivarHandoffSite({ message, reply: offer, messages: [] }), true, message);
  }
});

test("repara legado da screenshot antes da pergunta sobre aniversariante", async () => {
  const sessionId = session();
  await createLegacyOffer(sessionId);
  await addMessage(sessionId, "client", "O aniversariante tem desconto??", "client:birthday");
  const result = await recuperarBotAposOfertaHumanaSite(sessionId);
  assert.equal(result.recovered, true);
  assert.equal(result.conversation.mode, "bot");
  assert.equal(result.conversation.handoffPending, false);
  assert.equal(result.conversation.messages.at(-1).text, "O aniversariante tem desconto??");
  await removerConversaSite(sessionId);
});

test("repara oferta antiga também para que o aceite atual possa efetivar encaminhamento", async () => {
  const sessionId = session();
  await createLegacyOffer(sessionId);
  await addMessage(sessionId, "client", "Sim, pode encaminhar", "client:accept");
  const result = await recuperarBotAposOfertaHumanaSite(sessionId);
  assert.equal(result.recovered, true);
  assert.equal(deveEfetivarHandoffSite({ message: "Sim, pode encaminhar", reply: "Vou chamar a equipe.", messages: result.conversation.messages }), true);
  await removerConversaSite(sessionId);
});

test("operação real, operador, bloqueio e resposta manual preservam modo humano", async () => {
  for (const scenario of ["operational", "operator", "blocked", "manual"]) {
    const sessionId = session();
    await createLegacyOffer(sessionId, scenario === "operational" ? "Quero cancelar minha reserva" : undefined);
    if (scenario === "operator") await alterarModoConversaSite(sessionId, { mode: "human", updatedBy: "atendente@vagafogo.com.br" });
    if (scenario === "blocked") await alterarModoConversaSite(sessionId, { mode: "blocked", updatedBy: "admin" });
    if (scenario === "manual") await addMessage(sessionId, "agent", "Estou verificando seu pedido.", "agent:reply");
    const before = await obterConversaSite(sessionId);
    const result = await recuperarBotAposOfertaHumanaSite(sessionId);
    assert.equal(result.recovered, false, scenario);
    assert.equal(result.conversation.mode, before.mode, scenario);
    assert.equal(result.conversation.updatedBy, before.updatedBy, scenario);
    await removerConversaSite(sessionId);
  }
});

test("transferência WhatsApp já enviada nunca é desfeita por reparo de oferta", async () => {
  const sessionId = session();
  await createLegacyOffer(sessionId);
  await salvarContinuacaoWhatsappSite(sessionId, {
    requestId: "site-whatsapp:test", status: "sent", requestedAt: Date.now(), requestedHuman: true,
    reason: "solicitacao_cliente", context: "Pedido registrado", phone: "5562999990000",
    sentAt: Date.now(), lastAttemptAt: Date.now(), lastError: null, gatewayJid: "confirmed@lid",
  });
  const result = await recuperarBotAposOfertaHumanaSite(sessionId);
  assert.equal(result.recovered, false);
  assert.equal(result.conversation.mode, "human");
  await removerConversaSite(sessionId);
});

test("reparo revalida na transação operador que assumiu depois do snapshot em cache", async (t) => {
  const sessionId = session();
  await createLegacyOffer(sessionId);
  const cached = await obterConversaSite(sessionId);
  const remote = { ...cached, updatedBy: "operador@vagafogo.com.br", handoffPending: false, controlUpdatedAt: Date.now() + 100 };
  let writes = 0;
  let transactionReads = 0;
  const firestore = {
    collection: () => ({ doc: () => ({ id: sessionId }) }),
    runTransaction: async (callback) => callback({
      get: async () => { transactionReads++; return { exists: true, id: sessionId, data: () => remote }; },
      set: () => { writes++; },
    }),
  };
  const firebaseAdmin = require("../dist/services/firebaseAdmin");
  t.mock.method(firebaseAdmin, "obterFirestoreAdmin", () => firestore);
  const result = await recuperarBotAposOfertaHumanaSite(sessionId);
  assert.equal(transactionReads, 1);
  assert.equal(writes, 0);
  assert.equal(result.recovered, false);
  assert.equal(result.conversation.updatedBy, "operador@vagafogo.com.br");
  t.mock.restoreAll();
  await removerConversaSite(sessionId);
});
