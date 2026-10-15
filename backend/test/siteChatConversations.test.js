const { test } = require("node:test");
const assert = require("node:assert/strict");

process.env.FIREBASE_SERVICE_ACCOUNT = "";

const {
  alterarModoConversaSite,
  filtrarMensagensSiteVigentes,
  limitarHistoricoSite,
  listarConversasSite,
  listarMensagensConversaSite,
  marcarConversaSiteLida,
  obterConversaSite,
  registrarMensagemConversaSite,
  removerConversaSite,
} = require("../dist/services/siteChatConversations");

test("descarta mensagens com mais de sete dias mesmo em conversa ainda ativa", () => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const messages = [
    { id: "old", ts: now - 8 * day },
    { id: "recent", ts: now - 6 * day },
  ];
  assert.deepEqual(filtrarMensagensSiteVigentes(messages, now).map((item) => item.id), ["recent"]);
});

test("limita o historico para caber em um documento sem perder as mensagens novas", () => {
  const now = Date.now();
  const messages = Array.from({ length: 120 }, (_, index) => ({ id: String(index), ts: now - 120 + index, text: "x".repeat(12_000) }));
  const retained = limitarHistoricoSite(messages, now);
  assert.ok(Buffer.byteLength(JSON.stringify(retained), "utf8") <= 700_000);
  assert.equal(retained.at(-1).id, "119");
  assert.ok(retained.length < messages.length);
});

test("unifica o atendimento do site e entrega a resposta manual ao visitante", async () => {
  const sessionId = `site_test_${Date.now()}_abcdef`;
  await registrarMensagemConversaSite(sessionId, {
    from: "client",
    text: "Quero tirar uma dúvida",
    sourceId: "client:one",
    name: "Visitante",
    phone: "5562999999999",
    incrementUnread: true,
  });

  const duplicated = await registrarMensagemConversaSite(sessionId, {
    from: "client",
    text: "Quero tirar uma dúvida",
    sourceId: "client:one",
    incrementUnread: true,
  });
  assert.equal(duplicated.duplicated, true);

  await alterarModoConversaSite(sessionId, { mode: "human", updatedBy: "operador@vagafogo.com.br" });
  await registrarMensagemConversaSite(sessionId, {
    from: "agent",
    text: "Olá! Já estou acompanhando por aqui.",
    sourceId: "manual:one",
  });

  const conversation = await obterConversaSite(sessionId);
  assert.equal(conversation.mode, "human");
  assert.equal(conversation.channel, "site");
  assert.equal(conversation.unread, 1);

  const contacts = await listarConversasSite();
  assert.equal(contacts.some((contact) => contact.jid === `site:${sessionId}`), true);

  const visitorMessages = await listarMensagensConversaSite(sessionId, 0, true);
  assert.deepEqual(visitorMessages.map((message) => message.text), ["Olá! Já estou acompanhando por aqui."]);

  await marcarConversaSiteLida(sessionId);
  assert.equal((await obterConversaSite(sessionId)).unread, 0);
  await removerConversaSite(sessionId);
  assert.equal(await obterConversaSite(sessionId), null);
});

test("permite iniciar anonimamente e associar o WhatsApp quando a Jatobá o solicitar", async () => {
  const sessionId = `site_test_${Date.now()}_phoneupgrade`;
  await registrarMensagemConversaSite(sessionId, {
    from: "client",
    text: "Qual o valor do brunch?",
    sourceId: "client:anonymous",
    phone: "",
  });
  assert.equal((await obterConversaSite(sessionId)).phone, "");

  await registrarMensagemConversaSite(sessionId, {
    from: "client",
    text: "Quero reservar. Meu WhatsApp é (62) 99999-9999.",
    sourceId: "client:identified",
    phone: "5562999999999",
  });
  const conversation = await obterConversaSite(sessionId);
  assert.equal(conversation.phone, "5562999999999");
  assert.equal(conversation.messages.length, 2);
  await removerConversaSite(sessionId);
});

test("encaminhamento do site permanece pendente até um atendente assumir", async () => {
  const sessionId = `site_test_${Date.now()}_handoff`;
  await registrarMensagemConversaSite(sessionId, {
    from: "client",
    text: "Preciso falar com uma pessoa da equipe",
    sourceId: "client:handoff",
  });

  const pending = await alterarModoConversaSite(sessionId, {
    mode: "human",
    reason: "solicitacao_cliente",
    updatedBy: "jatoba",
  });
  assert.equal(pending.handoffPending, true);
  assert.ok(pending.handoffRequestedAt > 0);
  assert.equal((await listarConversasSite()).find((contact) => contact.sessionId === sessionId).handoffPending, true);

  await registrarMensagemConversaSite(sessionId, {
    from: "client",
    text: "Ainda estou aguardando",
    sourceId: "client:waiting",
  });
  assert.equal((await obterConversaSite(sessionId)).handoffPending, true);

  const assumed = await alterarModoConversaSite(sessionId, {
    mode: "human",
    updatedBy: "atendente@vagafogo.com.br",
  });
  assert.equal(assumed.handoffPending, false);
  assert.equal(assumed.handoffRequestedAt, null);
  await removerConversaSite(sessionId);
});
