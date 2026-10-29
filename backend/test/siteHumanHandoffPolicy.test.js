const { test } = require("node:test");
const assert = require("node:assert/strict");

process.env.FIREBASE_SERVICE_ACCOUNT = "";

const {
  pediuAcaoHumanaSite,
  ofereceuAtendimentoHumanoSite,
  confirmouOfertaHumanaSite,
  deveEfetivarHandoffSite,
} = require("../dist/services/siteHumanHandoffPolicy");
const {
  alterarModoConversaSite,
  obterConversaSite,
  registrarMensagemConversaSite,
  recuperarBotAposOfertaHumanaSite,
  removerConversaSite,
  salvarContinuacaoWhatsappSite,
} = require("../dist/services/siteChatConversations");

const offer = "Sobre prazos de cancelamento, não tenho essa informação confirmada por aqui. Se você já tem uma reserva e precisa tratar cancelamento ou prazo, posso pedir que a equipe continue seu atendimento. Quer que eu faça isso?";
let sequence = 0;
const session = () => `site_test_handoff_policy_${Date.now()}_${++sequence}`;
const addMessage = (sessionId, from, text, sourceId) => registrarMensagemConversaSite(sessionId, {
  from, text, sourceId, name: "Cliente", phone: "5562999990000",
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
