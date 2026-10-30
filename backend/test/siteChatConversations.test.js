const { test } = require("node:test");
const assert = require("node:assert/strict");
const { isSiteNamePrompt, isSitePhonePrompt, nameFromSiteMessage, normalizeSiteVisitorName, pendingSiteVisitorRequest, siteVisitorIdentityDecision } = require("../dist/services/siteChatIdentity");
const { estadoRetomadaSite } = require("../dist/services/siteBookingFollowups");
const { recusouRetomadaSite, aceitouRetomadaSite, encerrouOuAdiouRetomadaSite, politicaContatoRetomadaSite } = require("../dist/services/siteFollowupContactPolicy");

process.env.FIREBASE_SERVICE_ACCOUNT = "";

const {
  alterarModoConversaSite,
  atualizarProgressoReservaSite,
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
  preservarEntregaRetomadaSite,
  suspenderRetomadaComercialSite,
} = require("../dist/services/siteChatConversations");

test("confirmação assíncrona de remarcação chega ao polling sem repetir resposta normal do bot", () => {
  const now = Date.now();
  const messages = [
    { id: "normal", from: "bot", text: "Aguardo a data", ts: now - 2 },
    { id: "result", sourceId: "rescheduling-result:request1", from: "bot", text: "Sua reserva foi remarcada", ts: now - 1 },
    { id: "manual", from: "agent", text: "Estamos à disposição", ts: now },
  ];
  assert.deepEqual(combinarMensagensSite(messages, [], 0, true, now).map((message) => message.id), ["result", "manual"]);
});

test("atendimento de reserva existente não reativa recuperação comercial após uma FAQ", async () => {
  const sessionId = `site_reschedule_followup_${Date.now()}`;
  const first = await registrarMensagemConversaSite(sessionId, { from: "client", text: "Quero alterar o horário da minha reserva", phone: "5562999000000" });
  await registrarMensagemConversaSite(sessionId, { from: "bot", text: "O pedido aguarda autorização do Uirá." });
  await atualizarProgressoReservaSite(sessionId, null, first.message.ts);
  await suspenderRetomadaComercialSite(sessionId);
  const faq = await registrarMensagemConversaSite(sessionId, { from: "client", text: "Qual o horário de funcionamento?" });
  await registrarMensagemConversaSite(sessionId, { from: "bot", text: "Consulte os horários oficiais." });
  await atualizarProgressoReservaSite(sessionId, null, faq.message.ts);
  let conversation = await obterConversaSite(sessionId);
  assert.equal(conversation.bookingFollowup.existingReservationService, true);
  assert.equal(conversation.bookingFollowup.optedIn, false);
  assert.equal(estadoRetomadaSite(conversation, faq.message.ts + 16 * 60_000), "atendimento_pausado");
  const purchase = await registrarMensagemConversaSite(sessionId, { from: "client", text: "Quero fazer uma nova reserva" });
  await registrarMensagemConversaSite(sessionId, { from: "bot", text: "Qual experiência deseja?" });
  await atualizarProgressoReservaSite(sessionId, { step: "experiences" }, purchase.message.ts);
  conversation = await obterConversaSite(sessionId);
  assert.equal(conversation.bookingFollowup.existingReservationService, false);
  assert.equal(conversation.bookingFollowup.optedIn, true);
  await removerConversaSite(sessionId);
});

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

test("guarda a etapa para retomar e respeita recusa de contato", async () => {
  const sessionId = `site_test_${Date.now()}_resumeabcdef`;
  const client = await registrarMensagemConversaSite(sessionId, {
    from: "client", text: "Quero reservar o brunch", phone: "5562999999999", name: "Maria",
  });
  await registrarMensagemConversaSite(sessionId, { from: "bot", text: "Qual dia fica melhor?" });
  const ui = { step: "date", draft: { ofertaId: "brunch", data: "2026-10-20" } };
  await atualizarProgressoReservaSite(sessionId, ui, client.message.ts);
  let conversation = await obterConversaSite(sessionId);
  assert.deepEqual(conversation.bookingUi, ui);
  assert.equal(conversation.bookingFollowup.optedIn, true);
  assert.equal(conversation.bookingFollowup.lastClientAt, client.message.ts);

  const refusal = await registrarMensagemConversaSite(sessionId, {
    from: "client", text: "Não me envie mensagens no WhatsApp.",
  });
  await registrarMensagemConversaSite(sessionId, { from: "bot", text: "Tudo bem, não enviarei." });
  await atualizarProgressoReservaSite(sessionId, null, refusal.message.ts);
  conversation = await obterConversaSite(sessionId);
  assert.equal(conversation.bookingFollowup.optedIn, false);
  assert.equal(conversation.bookingUi, null);
  await removerConversaSite(sessionId);
});

test("não retoma um atendimento encerrado com agradecimento", async () => {
  const sessionId = `site_test_${Date.now()}_finishedabcdef`;
  const message = await registrarMensagemConversaSite(sessionId, {
    from: "client", text: "Obrigado!", phone: "5562999999999", name: "Paulo",
  });
  await registrarMensagemConversaSite(sessionId, { from: "bot", text: "Por nada! 🌿" });
  await atualizarProgressoReservaSite(sessionId, null, message.message.ts);
  assert.equal((await obterConversaSite(sessionId)).bookingFollowup.optedIn, false);
  await removerConversaSite(sessionId);
});

test("recusa de retomada persiste após outra dúvida e só aceite explícito permite contato", async () => {
  const sessionId = `site_test_${Date.now()}_stickyoptout`;
  const first = await registrarMensagemConversaSite(sessionId, { from: "client", text: "Quero reservar", phone: "5562999999999" });
  await atualizarProgressoReservaSite(sessionId, { step: "experiences" }, first.message.ts);
  const refusal = await registrarMensagemConversaSite(sessionId, { from: "client", text: "Não me envie mensagens pelo WhatsApp.", sourceId: "client:refusal" });
  assert.equal(refusal.conversation.bookingFollowup.optedOut, true);
  assert.equal(refusal.conversation.bookingFollowup.optedIn, false);
  const question = await registrarMensagemConversaSite(sessionId, { from: "client", text: "Qual o horário do brunch?", sourceId: "client:question" });
  await registrarMensagemConversaSite(sessionId, { from: "bot", text: "Você pode escolher o horário disponível." });
  await atualizarProgressoReservaSite(sessionId, { step: "time" }, question.message.ts);
  let conversation = await obterConversaSite(sessionId);
  assert.equal(conversation.bookingFollowup.optedOut, true);
  assert.equal(conversation.bookingFollowup.optedIn, false);
  const accepted = await registrarMensagemConversaSite(sessionId, { from: "client", text: "Pode me enviar um lembrete para retomar a conversa.", sourceId: "client:accept" });
  assert.equal(accepted.conversation.bookingFollowup.optedOut, false);
  await atualizarProgressoReservaSite(sessionId, { step: "time" }, accepted.message.ts);
  conversation = await obterConversaSite(sessionId);
  assert.equal(conversation.bookingFollowup.optedIn, true);
  await removerConversaSite(sessionId);
});

test("mensagem do cliente reinicia atividade antes da resposta e duplicata não altera o relógio", async () => {
  const sessionId = `site_test_${Date.now()}_activityclock`;
  const first = await registrarMensagemConversaSite(sessionId, { from: "client", text: "Quero reservar", phone: "5562999999999" });
  await atualizarProgressoReservaSite(sessionId, { step: "date" }, first.message.ts);
  const conversation = await obterConversaSite(sessionId);
  const deliveredAt = first.message.ts - 1_000;
  conversation.bookingFollowup.sentAt = deliveredAt;
  const originalNow = Date.now;
  try {
    Date.now = () => first.message.ts + 10_000;
    const next = await registrarMensagemConversaSite(sessionId, { from: "client", text: "Prefiro dia 4", sourceId: "client:next" });
    assert.equal(next.conversation.bookingFollowup.lastClientAt, first.message.ts + 10_000);
    assert.equal(next.conversation.bookingFollowup.sentAt, deliveredAt);
    Date.now = () => first.message.ts + 20_000;
    const duplicate = await registrarMensagemConversaSite(sessionId, { from: "client", text: "Prefiro dia 4", sourceId: "client:next" });
    assert.equal(duplicate.duplicated, true);
    assert.equal(duplicate.conversation.bookingFollowup.lastClientAt, first.message.ts + 10_000);
    assert.equal(duplicate.conversation.bookingFollowup.sentAt, deliveredAt);
  } finally {
    Date.now = originalNow;
    await removerConversaSite(sessionId);
  }
});

test("retomada guarda todas as etapas e contexto de formulário sem criar interface", async () => {
  const sessionId = `site_test_${Date.now()}_allfollowupsteps`;
  const first = await registrarMensagemConversaSite(sessionId, { from: "client", text: "Quero reservar", phone: "5562999999999" });
  const steps = ["identity_name", "identity_phone", "booking_mode", "phone", "experiences", "date", "time", "participants", "guidance", "contact", "summary", "payment", "availability"];
  for (const step of steps) {
    await atualizarProgressoReservaSite(sessionId, { step }, first.message.ts);
    assert.equal((await obterConversaSite(sessionId)).bookingFollowup.step, step);
  }
  await atualizarProgressoReservaSite(sessionId, null, first.message.ts, {
    data: "2026-12-04", horario: "09:00", ofertaId: "combo-1", ofertaNome: "Brunch + Trilha",
  });
  const conversation = await obterConversaSite(sessionId);
  assert.equal(conversation.bookingUi, null);
  assert.equal(conversation.bookingFollowup.date, "2026-12-04");
  assert.equal(conversation.bookingFollowup.hour, "09:00");
  assert.equal(conversation.bookingFollowup.offerId, "combo-1");
  assert.equal(conversation.bookingFollowup.offerName, "Brunch + Trilha");
  await removerConversaSite(sessionId);
});

test("política de contato reconhece encerramento e adiamento sem confundir dúvida ou pagamento falhado", () => {
  for (const text of ["Obrigado pela ajuda!", "Vou decidir e depois entro em contato", "Depois eu volto e falo com vocês", "Já reservei pelo site", "Consegui finalizar minha reserva", "07/09 fiz sim, mas já fui na fazenda"]) {
    assert.equal(encerrouOuAdiouRetomadaSite(text), true, text);
  }
  for (const text of ["Não consegui finalizar minha reserva", "Já reservei?", "Se eu for hoje, ainda tem vaga?", "Vou decidir agora pelo WhatsApp", "Já fui ao site e quero reservar amanhã"]) {
    assert.equal(encerrouOuAdiouRetomadaSite(text), false, text);
  }
  assert.equal(recusouRetomadaSite("Não quero receber mensagens."), true);
  assert.equal(aceitouRetomadaSite("Pode me enviar um lembrete."), true);
  assert.equal(aceitouRetomadaSite("Não me envie um lembrete."), false);
  assert.deepEqual(politicaContatoRetomadaSite([{ from: "client", text: "Quanto custa?" }], true), { optedOut: true, finished: false });
  assert.equal(politicaContatoRetomadaSite([
    { from: "client", text: "Depois eu volto" }, { from: "client", text: "Quero reservar hoje" },
  ]).finished, false);
});

test("entrega confirmada não desaparece numa gravação de cache antigo", () => {
  const preserved = preservarEntregaRetomadaSite({ sentAt: null, lastAttemptAt: 100, lastError: "offline", optedIn: true }, {
    sentAt: 200, lastAttemptAt: 200, lastError: null,
  });
  assert.equal(preserved.sentAt, 200);
  assert.equal(preserved.lastAttemptAt, 200);
  assert.equal(preserved.lastError, null);
  assert.equal(preserved.optedIn, true);
  const failed = preservarEntregaRetomadaSite({ sentAt: null, lastAttemptAt: 100, lastError: null }, { lastAttemptAt: 300, lastError: "DISPATCH_PACED" });
  assert.equal(failed.sentAt, null);
  assert.equal(failed.lastAttemptAt, 300);
  assert.equal(failed.lastError, "DISPATCH_PACED");
});

test("pedidos de contato pelo WhatsApp nao sao tratados como nome", () => {
  for (const text of ["Me chama no WhatsApp", "me chama no wpp", "Contato pelo zap", "WhatsApp por favor", "Me chama no whats"]) {
    assert.equal(nameFromSiteMessage(text, true), "");
    assert.equal(normalizeSiteVisitorName(text), "");
    assert.equal(pendingSiteVisitorRequest([
      { from: "bot", text: "Como posso chamar você?" },
      { from: "client", text },
      { from: "client", text: "(62) 99999-9999" },
    ]), text);
  }
  assert.equal(isSitePhonePrompt("Para continuar pelo WhatsApp, informe seu WhatsApp com DDD."), true);
  assert.equal(pendingSiteVisitorRequest([
    { from: "client", text: "WhatsApp: (62) 99999-9999" },
    { from: "client", text: "Meu WhatsApp é (62) 99999-9999." },
  ]), "");
});

test("identificacao inicial preserva a pergunta feita antes do nome e do WhatsApp", () => {
  assert.equal(nameFromSiteMessage("Qual o valor da trilha?"), "");
  assert.equal(nameFromSiteMessage("Sou do Instituto Federal de Brasília"), "");
  assert.equal(nameFromSiteMessage("Meu nome é Maria Silva."), "Maria Silva");
  assert.equal(nameFromSiteMessage("Eu sou Paulo Henrique", true), "Paulo Henrique");
  assert.equal(nameFromSiteMessage("Eu sou Paulo Henrique"), "Paulo Henrique");
  assert.equal(nameFromSiteMessage("Eu sou o Paulo Henrique, quero reservar"), "Paulo Henrique");
  assert.equal(nameFromSiteMessage("Me chamo Ana Paula"), "Ana Paula");
  assert.equal(nameFromSiteMessage("Eu sou do Instituto Federal de Brasília", true), "");
  assert.equal(normalizeSiteVisitorName("Eu sou Paulo Henrique"), "Paulo Henrique");
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
  assert.equal(pendingSiteVisitorRequest([
    { from: "client", text: "Bom dia" },
    { from: "client", text: "Eu sou Paulo Henrique" },
    { from: "client", text: "Meu WhatsApp é (62) 99999-9999." },
  ]), "");
  const messages = [
    { from: "client", text: "Quero consultar minha reserva" },
    { from: "client", text: "Meu nome é Maria Silva." },
    { from: "client", text: "Meu WhatsApp é (62) 99999-9999." },
  ];
  const askName = siteVisitorIdentityDecision({ name: "", phone: "", hadName: false, hadPhone: false, messages });
  assert.equal(askName.step, "identity_name");
  assert.match(askName.reply, /Como posso chamar você/);
  assert.doesNotMatch(askName.reply, /equipe|campanhas/i);
  assert.doesNotMatch(askName.reply, /Claro!/i);
  const firstGreeting = siteVisitorIdentityDecision({
    name: "", phone: "", hadName: false, hadPhone: false,
    messages: [{ from: "client", text: "oi" }],
  });
  const secondGreeting = siteVisitorIdentityDecision({
    name: "", phone: "", hadName: false, hadPhone: false,
    messages: [
      { from: "client", text: "oi" },
      { from: "bot", text: firstGreeting.reply },
      { from: "client", text: "oi" },
    ],
  });
  assert.match(firstGreeting.reply, /^Oi!/);
  assert.match(secondGreeting.reply, /estou por aqui/i);
  assert.notEqual(secondGreeting.reply, firstGreeting.reply);
  assert.equal(isSiteNamePrompt(secondGreeting.reply), true);
  assert.equal(nameFromSiteMessage("Andrea", isSiteNamePrompt(secondGreeting.reply)), "Andrea");
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
  }).reply, /Me conta como posso te ajudar hoje/);
  assert.doesNotMatch(siteVisitorIdentityDecision({
    name: "Patrícia", phone: "5561998722812", hadName: true, hadPhone: false,
    messages: [{ from: "client", text: "Olá" }, { from: "client", text: "Patrícia" }, { from: "client", text: "Meu WhatsApp para este atendimento é (61) 99872-2812." }],
  }).reply, /fico à disposição|brunch|trilha|combo|dados já estão vinculados/i);
});

test("permite pular nome e WhatsApp sem perder a pergunta anterior", () => {
  const messages = [
    { from: "client", text: "Olá" },
    { from: "bot", text: "Como posso chamar você?" },
    { from: "client", text: "Aí tem arvorismo?" },
    { from: "bot", text: "Entendi. Para continuar, me diga seu primeiro nome, por favor. 🌿" },
    { from: "client", text: "Prefiro não informar meu nome." },
  ];
  assert.equal(normalizeSiteVisitorName(messages.at(-1).text), "");
  const askPhone = siteVisitorIdentityDecision({ name: "", phone: "", hadName: false, hadPhone: false, messages });
  assert.equal(askPhone.step, "identity_phone");
  assert.doesNotMatch(askPhone.reply, /Obrigada,\s*!/);
  messages.push({ from: "bot", text: askPhone.reply }, { from: "client", text: "Prefiro não informar meu WhatsApp." });
  const continueWithoutIdentity = siteVisitorIdentityDecision({ name: "", phone: "", hadName: false, hadPhone: false, messages });
  assert.equal(continueWithoutIdentity.reply, "");
  assert.equal(continueWithoutIdentity.pendingRequest, "Aí tem arvorismo?");
  messages.push({ from: "bot", text: "Não temos arvorismo, mas temos uma trilha ecológica." }, { from: "client", text: "Como funciona a trilha?" });
  const nextQuestion = siteVisitorIdentityDecision({ name: "", phone: "", hadName: false, hadPhone: false, messages });
  assert.equal(nextQuestion.reply, "");
  assert.equal(nextQuestion.pendingRequest, "");
});

test("a recusa curta vale somente para a etapa que a Jatobá perguntou", () => {
  const messages = [
    { from: "client", text: "Oi" },
    { from: "bot", text: "Como posso chamar você?" },
    { from: "client", text: "Prefiro não informar" },
  ];
  const askPhone = siteVisitorIdentityDecision({ name: "", phone: "", hadName: false, hadPhone: false, messages });
  assert.equal(askPhone.step, "identity_phone");
  messages.push({ from: "bot", text: askPhone.reply }, { from: "client", text: "Prefiro não informar" });
  assert.match(siteVisitorIdentityDecision({ name: "", phone: "", hadName: false, hadPhone: false, messages }).reply, /como posso te ajudar hoje/i);
});

test("o atendimento guarda apenas o nome extraído de uma apresentação", async () => {
  const sessionId = `site_test_${Date.now()}_name_intro`;
  const first = await registrarMensagemConversaSite(sessionId, {
    from: "client", text: "Eu sou Paulo Henrique", name: "Eu sou Paulo Henrique",
  });
  assert.equal(first.conversation.name, "Paulo Henrique");
  const next = await registrarMensagemConversaSite(sessionId, {
    from: "client", text: "Quero reservar para amanhã", name: "Eu sou Paulo Henrique",
  });
  assert.equal(next.conversation.name, "Paulo Henrique");
});

test("continua a conversa apos receber o WhatsApp e recupera uma resposta interrompida", async () => {
  const sessionId = `site_test_${Date.now()}_phone_recovery`;
  await registrarMensagemConversaSite(sessionId, { from: "client", text: "Patrícia", name: "Patrícia" });
  await registrarMensagemConversaSite(sessionId, {
    from: "bot", text: "Qual é o seu WhatsApp com DDD?", name: "Patrícia",
  });
  const beforePhone = await obterConversaSite(sessionId);
  const hadPhone = Boolean(beforePhone.phone);
  assert.equal(isSitePhonePrompt(beforePhone.lastMessage), true);
  const received = await registrarMensagemConversaSite(sessionId, {
    from: "client", text: "Meu WhatsApp para este atendimento é (61) 99872-2812.",
    name: "Patrícia", phone: "5561998722812",
  });
  assert.equal(hadPhone, false);
  assert.equal(received.conversation.phone, "5561998722812");
  assert.equal(received.conversation.bookingFollowup.step, "identity_phone");
  assert.equal(received.conversation.bookingFollowup.optedIn, true);
  assert.equal(estadoRetomadaSite(received.conversation, received.message.ts + 16 * 60_000), "pronta");
  const decision = siteVisitorIdentityDecision({
    name: received.conversation.name, phone: received.conversation.phone,
    hadName: true, hadPhone,
    messages: received.conversation.messages,
  });
  assert.match(decision.reply, /Me conta como posso te ajudar hoje/);
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
