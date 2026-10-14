const { test } = require("node:test");
const assert = require("node:assert/strict");

process.env.FIREBASE_SERVICE_ACCOUNT = "";

const {
  alterarModoConversaSite,
  listarConversasSite,
  listarMensagensConversaSite,
  marcarConversaSiteLida,
  obterConversaSite,
  registrarMensagemConversaSite,
  removerConversaSite,
} = require("../dist/services/siteChatConversations");

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
