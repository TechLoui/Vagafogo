const { test } = require("node:test");
const assert = require("node:assert/strict");
const { nameFromSiteMessage, pendingSiteVisitorRequest, siteVisitorIdentityDecision } = require("../dist/services/siteChatIdentity");

process.env.FIREBASE_SERVICE_ACCOUNT = "";

const {
  alterarModoConversaSite,
  combinarMensagensSite,
  filtrarMensagensSiteVigentes,
  limitarHistoricoSite,
  listarConversasSite,
  listarMensagensConversaSite,
  marcarConversaSiteLida,
  obterConversaSite,
  registrarMensagemConversaSite,
  removerConversaSite,
  serializarMensagemConversaSite,
} = require("../dist/services/siteChatConversations");

test("nao grava campos opcionais indefinidos nas mensagens do Firestore", () => {
  const plain = serializarMensagemConversaSite({
    id: "client:test", from: "client", text: "Oi", ts: Date.now(),
    sourceId: undefined, mediaType: undefined,
  });
  assert.equal(Object.hasOwn(plain, "sourceId"), false);
  assert.equal(Object.hasOwn(plain, "mediaType"), false);
  assert.deepEqual(Object.values(plain).filter((value) => value === undefined), []);
  const withMedia = serializarMensagemConversaSite({
    id: "bot:photo", from: "bot", text: "Foto", ts: Date.now(),
    sourceId: "bot:photo", mediaType: "image/jpeg",
  });
  assert.equal(withMedia.sourceId, "bot:photo");
  assert.equal(withMedia.mediaType, "image/jpeg");
});

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

test("painel combina o cache com o arquivo completo dos ultimos sete dias", () => {
  const now = Date.now();
  const archived = Array.from({ length: 150 }, (_, index) => ({
    id: `message-${index}`,
    from: index % 3 === 0 ? "agent" : "client",
    text: `Mensagem ${index}`,
    ts: now - 150 + index,
  }));
  const cached = archived.slice(-120);
  assert.equal(combinarMensagensSite(cached, archived, 0, false, now).length, 150);
  assert.equal(combinarMensagensSite(cached, archived, now - 20, false, now).length, 19);
  assert.equal(combinarMensagensSite(cached, archived, 0, true, now).length, 50);
  const expired = { id: "expired", from: "client", text: "Antiga", ts: now - 8 * 24 * 60 * 60 * 1000 };
  assert.equal(combinarMensagensSite(cached, [...archived, expired], 0, false, now).length, 150);
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
    text: "Meu nome é Maria Silva.",
    sourceId: "client:named",
    name: "Maria Silva",
  });
  await registrarMensagemConversaSite(sessionId, {
    from: "client",
    text: "Meu WhatsApp é (62) 99999-9999.",
    sourceId: "client:identified",
    phone: "5562999999999",
    name: "Maria Silva",
  });
  const conversation = await obterConversaSite(sessionId);
  assert.equal(conversation.name, "Maria Silva");
  assert.equal(conversation.phone, "5562999999999");
  assert.equal(conversation.messages.length, 3);
  assert.equal((await listarConversasSite()).find((contact) => contact.sessionId === sessionId).phone, "5562999999999");
  await removerConversaSite(sessionId);
});

test("identificacao inicial preserva a pergunta feita antes do nome e do WhatsApp", () => {
  assert.equal(nameFromSiteMessage("Qual o valor da trilha?"), "");
  assert.equal(nameFromSiteMessage("Sou do Instituto Federal de Brasília"), "");
  assert.equal(nameFromSiteMessage("Meu nome é Maria Silva."), "Maria Silva");
  assert.equal(nameFromSiteMessage("Maria Silva", true), "Maria Silva");
  assert.equal(nameFromSiteMessage("Maria", true), "Maria");
  assert.equal(nameFromSiteMessage("Amanhã", true), "");
  assert.equal(nameFromSiteMessage("Sim", true), "");
  assert.equal(pendingSiteVisitorRequest([
    { from: "client", text: "Quero consultar minha reserva" },
    { from: "bot", text: "Como posso chamar você?" },
    { from: "client", text: "Meu nome é Maria Silva." },
    { from: "client", text: "Meu WhatsApp é (62) 99999-9999." },
  ]), "Quero consultar minha reserva");
  assert.equal(pendingSiteVisitorRequest([
    { from: "client", text: "Bom dia" },
    { from: "client", text: "Meu nome é Maria." },
    { from: "client", text: "Meu WhatsApp é (62) 99999-9999." },
  ]), "");
  assert.equal(pendingSiteVisitorRequest([
    { from: "client", text: "Maria Silva" },
    { from: "client", text: "(62) 99999-9999" },
  ]), "");
  const messages = [
    { from: "client", text: "Quero consultar minha reserva" },
    { from: "client", text: "Meu nome é Maria Silva." },
    { from: "client", text: "Meu WhatsApp é (62) 99999-9999." },
  ];
  const askName = siteVisitorIdentityDecision({ name: "", phone: "", hadName: false, hadPhone: false, messages });
  assert.equal(askName.step, null);
  assert.match(askName.reply, /Como posso chamar você/);
  assert.doesNotMatch(askName.reply, /equipe|campanhas/i);
  assert.equal(siteVisitorIdentityDecision({ name: "Maria Silva", phone: "", hadName: false, hadPhone: false, messages }).step, "identity_phone");
  assert.doesNotMatch(siteVisitorIdentityDecision({ name: "Maria Silva", phone: "", hadName: false, hadPhone: false, messages }).reply, /campanhas/i);
  const ready = siteVisitorIdentityDecision({ name: "Maria Silva", phone: "5562999999999", hadName: true, hadPhone: false, messages });
  assert.equal(ready.reply, "");
  assert.equal(ready.pendingRequest, "Quero consultar minha reserva");
  assert.equal(siteVisitorIdentityDecision({ name: "Maria Silva", phone: "5562999999999", hadName: false, hadPhone: true, messages }).pendingRequest, "Quero consultar minha reserva");
  assert.equal(siteVisitorIdentityDecision({ name: "Maria Silva", phone: "5562999999999", hadName: true, hadPhone: true, messages }).pendingRequest, "");
  assert.match(siteVisitorIdentityDecision({
    name: "Maria Silva", phone: "5562999999999", hadName: true, hadPhone: false,
    messages: [{ from: "client", text: "Bom dia" }, { from: "client", text: "Meu nome é Maria Silva." }, { from: "client", text: "Meu WhatsApp é (62) 99999-9999." }],
  }).reply, /Como posso ajudar/);
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
