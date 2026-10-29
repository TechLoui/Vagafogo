const { test } = require("node:test");
const assert = require("node:assert/strict");

process.env.FIREBASE_SERVICE_ACCOUNT = "";

const {
  obterConversaSite,
  registrarMensagemConversaSite,
  removerConversaSite,
  alterarModoConversaSite,
} = require("../dist/services/siteChatConversations");
const {
  solicitouContinuacaoWhatsapp,
  recusouContinuacaoWhatsapp,
  telefoneContinuacaoWhatsapp,
  solicitouNovaTentativaWhatsapp,
  processarContinuacaoWhatsappSite: processarContinuacaoWhatsappSiteReal,
  dadosContinuacaoWhatsapp,
  mensagemContinuacaoWhatsapp,
} = require("../dist/services/siteWhatsAppContinuation");

const processarContinuacaoWhatsappSite = (input, dependencies = {}) => processarContinuacaoWhatsappSiteReal(input, {
  notifyTeam: async () => ({ enfileirado: true }),
  ...dependencies,
});

let sequence = 0;
const session = () => `site_test_whatsapp_continuation_${Date.now()}_${++sequence}`;
const register = (sessionId, text, phone = "", sourceId = "client:request") => registrarMensagemConversaSite(sessionId, {
  from: "client", text, phone, sourceId,
});
const forbidden = async () => { throw new Error("UNEXPECTED_EXTERNAL_CALL"); };

test("mensagem de handoff humano pede chamada no WhatsApp das 08h às 17h sem aprovar a alteração", () => {
  for (const reason of ["alteracao_reserva", "cancelamento_reserva", "solicitacao_cliente", "problema_pagamento", "excecao_operacional"]) {
    const message = mensagemContinuacaoWhatsapp("Mara", "Cliente pediu para mudar a data da reserva.", true, reason);
    assert.match(message, /ligue pelo botão de chamada deste WhatsApp/);
    assert.match(message, /das 08h às 17h/);
    assert.doesNotMatch(message, /altera[cç][aã]o (?:aprovada|confirmada|conclu[ií]da)|resposta garantida|retornaremos|informe seu WhatsApp/i);
  }
  const owner = mensagemContinuacaoWhatsapp("Mara", "Ligação não atendida", true, "ligacao_nao_atendida");
  assert.match(owner, /https:\/\/wa\.me\/5562991150376/);
  assert.doesNotMatch(owner, /5562992225471|botão de chamada|08h às 17h/);
  const bot = mensagemContinuacaoWhatsapp("Mara", "Dúvida sobre trilha", false);
  assert.doesNotMatch(bot, /ligue|botão de chamada|08h às 17h/);
});

test("avisa a equipe após coletar telefone mesmo se a mensagem ao cliente falhar", async () => {
  const sessionId = session();
  await register(sessionId, "Preciso alterar minha reserva para 31/10 às 09:00, para 2 pessoas");
  const alerts = [];
  const dependencies = {
    send: async () => ({ enviado: false, motivo: "WHATSAPP_UNAVAILABLE" }),
    setHuman: forbidden,
    notifyTeam: async (payload) => { alerts.push(payload); return { enfileirado: true }; },
  };
  const collecting = await processarContinuacaoWhatsappSite({ sessionId, sourceId: "client:request", human: true, reason: "alteracao_reserva" }, dependencies);
  assert.equal(collecting.continuation.status, "awaiting_phone");
  assert.doesNotMatch(collecting.reply, /5562992225471|botão de chamada|08h às 17h/);
  assert.equal(alerts.length, 0);
  await register(sessionId, "Meu WhatsApp para este atendimento é (61) 99999-0000.", "5561999990000", "client:phone");
  const result = await processarContinuacaoWhatsappSite({ sessionId, sourceId: "client:phone" }, dependencies);
  assert.equal(result.continuation.status, "failed");
  assert.match(result.reply, /abra https:\/\/wa\.me\/5562992225471 e toque no botão de chamada/);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].telefone, "5561999990000");
  assert.equal(alerts[0].sourceMessageId, collecting.continuation.requestId);
  assert.equal(alerts[0].motivo, "alteracao_reserva");
  assert.match(alerts[0].resumo, /31\/10 às 09:00, para 2 pessoas/);
  await removerConversaSite(sessionId);
});

test("repete o aviso interno que falhou sem repetir mensagem já entregue ao cliente", async () => {
  const sessionId = session();
  await register(sessionId, "Quero falar com a equipe pelo WhatsApp", "5561999990000");
  let clientSends = 0;
  const alertIds = [];
  const dependencies = {
    send: async () => { clientSends++; return { enviado: true, jid: "confirmed@lid" }; },
    setHuman: async () => "",
    notifyTeam: async (payload) => {
      alertIds.push(payload.sourceMessageId);
      if (alertIds.length === 1) throw new Error("FIREBASE_TEMPORARILY_UNAVAILABLE");
      return { enfileirado: true };
    },
  };
  const failed = await processarContinuacaoWhatsappSite({ sessionId, sourceId: "client:request", human: true }, dependencies);
  assert.equal(failed.continuation.status, "failed");
  assert.equal(failed.continuation.lastError, "TEAM_ALERT_UNAVAILABLE");
  assert.doesNotMatch(failed.reply, /Nossa equipe continuará o atendimento por lá/);
  const retried = await processarContinuacaoWhatsappSite({ sessionId, sourceId: "client:retry" }, dependencies);
  assert.equal(retried.continuation.status, "sent");
  assert.equal(clientSends, 1);
  assert.equal(alertIds.length, 2);
  assert.equal(new Set(alertIds).size, 1);
  await removerConversaSite(sessionId);
});

test("reconhece pedidos pelo WhatsApp sem confundir menções e recusas", () => {
  for (const text of ["Me chama no wpp", "pode enviar no WhatsApp?", "Prefiro continuar pelo zap", "WhatsApp por favor", "Pode me chamar no WhatsApp (61) 98254-1136.", "Preciso de atendimento no WhatsApp"]) {
    assert.equal(solicitouContinuacaoWhatsapp(text), true, text);
  }
  for (const text of ["Não me mande WhatsApp", "Não quero falar pelo WhatsApp", "Não quero continuar pelo WhatsApp", "Não tenho WhatsApp, quero continuar aqui", "Não quero contato pelo WhatsApp", "não quero mais receber mensagens no whatsapp", "não precisa mandar no WhatsApp", "Não tive retorno no WhatsApp", "Qual é o WhatsApp?", "Meu WhatsApp para este atendimento é (61) 98254-1136.", "Meu WhatsApp é (61) 98254-1136.", "Meu telefone de contato no WhatsApp é (61) 98254-1136."]) {
    assert.equal(solicitouContinuacaoWhatsapp(text), false, text);
  }
  assert.equal(recusouContinuacaoWhatsapp("Prefiro não informar meu WhatsApp."), true);
  assert.equal(recusouContinuacaoWhatsapp("Prefiro seguir por aqui"), true);
  assert.equal(telefoneContinuacaoWhatsapp("me chama no wpp (62) 99999-0000"), "5562999990000");
  assert.equal(telefoneContinuacaoWhatsapp("+55 (62) 99999-0000"), "5562999990000");
  assert.equal(telefoneContinuacaoWhatsapp("(55) 99999-0000"), "5555999990000");
  assert.equal(telefoneContinuacaoWhatsapp("31/10/2026 às 11h"), "");
  assert.equal(telefoneContinuacaoWhatsapp("123456789012345"), "");
  assert.equal(telefoneContinuacaoWhatsapp("55629999999999999"), "");
  assert.equal(solicitouNovaTentativaWhatsapp("Tenta novamente"), true);
  assert.equal(solicitouNovaTentativaWhatsapp("Pode enviar de novo?"), true);
  assert.equal(solicitouNovaTentativaWhatsapp("Tenta reservar amanhã"), false);
});

test("pede DDD sem exigir nome e envia automaticamente após receber telefone", async () => {
  const sessionId = session();
  await register(sessionId, "Me chama no wpp");
  let sent = 0;
  const deps = {
    send: async (phone, text, requestId) => {
      sent++;
      assert.equal(phone, "5562999990000");
      assert.match(text, /Cliente: Me chama no wpp/);
      assert.match(requestId, /^site-whatsapp-continuation:/);
      return { enviado: true, jid: `${phone}@s.whatsapp.net` };
    },
    setHuman: forbidden,
  };
  const collecting = await processarContinuacaoWhatsappSite({ sessionId, sourceId: "client:request" }, deps);
  assert.equal(collecting.human, false);
  assert.equal(collecting.whatsapp_continuation_available, false);
  assert.deepEqual(collecting.bookingUi, { step: "identity_phone", whatsappContinuation: true });
  assert.match(collecting.reply, /WhatsApp com DDD/);
  assert.equal(sent, 0);
  assert.doesNotMatch(collecting.reply, /5562992225471|botão de chamada|08h às 17h/);
  const requestId = collecting.continuation.requestId;

  await register(sessionId, "(62) 99999-0000", "5562999990000", "client:phone");
  const sentResult = await processarContinuacaoWhatsappSite({ sessionId, sourceId: "client:phone" }, deps);
  assert.equal(sentResult.continuation.status, "sent");
  assert.equal(sentResult.continuation.requestId, requestId);
  assert.match(sentResult.reply, /Enviei uma mensagem/);
  assert.equal(sentResult.human, false);
  assert.equal(sentResult.whatsapp_continuation_available, true);
  assert.equal(sent, 1);
  const restored = await obterConversaSite(sessionId);
  assert.equal(dadosContinuacaoWhatsapp(restored.whatsappContinuation).whatsapp_continuation.status, "sent");
  await removerConversaSite(sessionId);
});

test("handoff preserva pedido e contexto do site e pausa bot do WhatsApp após envio", async () => {
  const sessionId = session();
  await register(sessionId, "Minha reserva é brunch e trilha para 2 pessoas em 31/10/2026", "5562999990000");
  await registrarMensagemConversaSite(sessionId, { from: "bot", text: "Qual data deseja solicitar?", sourceId: "bot:date" });
  await register(sessionId, "Quero alterar para 01/11/2026 às 11h", "5562999990000", "client:change");
  const calls = [];
  const result = await processarContinuacaoWhatsappSite({
    sessionId, sourceId: "client:change", human: true, reason: "alteracao_reserva",
  }, {
    send: async (phone, text) => {
      calls.push("send");
      assert.match(text, /brunch e trilha para 2 pessoas/);
      assert.match(text, /01\/11\/2026 às 11h/);
      assert.match(text, /ligue pelo botão de chamada deste WhatsApp, das 08h às 17h/);
      return { enviado: true, jid: "resolved@lid" };
    },
    setHuman: async (phone, jid, name, reason) => {
      calls.push("human");
      assert.equal(jid, "resolved@lid");
      assert.equal(reason, "alteracao_reserva");
      return "";
    },
  });
  assert.deepEqual(calls, ["send", "human"]);
  assert.equal(result.human, true);
  assert.match(result.reply, /abra https:\/\/wa\.me\/5562992225471 e toque no botão de chamada/);
  assert.match(result.reply, /08h às 17h/);
  assert.doesNotMatch(result.reply, /Nossa equipe continuará|informe seu WhatsApp|altera[cç][aã]o aprovada/i);
  assert.equal((await obterConversaSite(sessionId)).mode, "human");
  await removerConversaSite(sessionId);
});

test("falha não afirma envio e retry preserva requestId sem duplicar entrega confirmada", async () => {
  const sessionId = session();
  await register(sessionId, "Pode enviar no WhatsApp", "5562999990000");
  const ids = [];
  let sendAttempts = 0;
  let humanAttempts = 0;
  const deps = {
    send: async (phone, text, requestId) => {
      ids.push(requestId);
      sendAttempts++;
      return sendAttempts === 1 ? { enviado: false, motivo: "DISPATCH_PACED" } : { enviado: true, jid: `${phone}@s.whatsapp.net` };
    },
    setHuman: async () => ++humanAttempts === 1 ? "WHATSAPP_HANDOFF_NOT_CONFIRMED" : "",
  };
  const first = await processarContinuacaoWhatsappSite({ sessionId, sourceId: "client:request", human: true }, deps);
  assert.equal(first.continuation.status, "failed");
  assert.match(first.reply, /Não consegui confirmar o envio/);
  assert.equal(first.whatsapp_continuation_available, true);
  const second = await processarContinuacaoWhatsappSite({ sessionId, sourceId: "client:retry1" }, deps);
  assert.equal(second.continuation.status, "failed");
  assert.ok(second.continuation.sentAt);
  assert.match(second.reply, /Enviei a mensagem.*não consegui confirmar o encaminhamento/);
  const third = await processarContinuacaoWhatsappSite({ sessionId, sourceId: "client:retry2" }, deps);
  assert.equal(third.continuation.status, "sent");
  assert.equal(sendAttempts, 2);
  assert.equal(humanAttempts, 2);
  assert.equal(new Set(ids).size, 1);
  await removerConversaSite(sessionId);
});

test("solicitações concorrentes e repetidas não reenviam mensagem já entregue", async () => {
  const sessionId = session();
  await register(sessionId, "Me chama no wpp", "5562999990000");
  let sent = 0;
  const deps = { send: async () => { sent++; return { enviado: true }; }, setHuman: forbidden };
  await Promise.all([
    processarContinuacaoWhatsappSite({ sessionId, sourceId: "client:request" }, deps),
    processarContinuacaoWhatsappSite({ sessionId, sourceId: "client:request" }, deps),
  ]);
  await processarContinuacaoWhatsappSite({ sessionId, sourceId: "client:repeat" }, deps);
  assert.equal(sent, 1);
  await removerConversaSite(sessionId);
});

test("novo encaminhamento humano após continuação genérica envia o novo contexto uma vez", async () => {
  const sessionId = session();
  await register(sessionId, "Me chama no wpp", "5562999990000");
  const messages = [];
  const ids = [];
  const deps = {
    send: async (phone, text, requestId) => { messages.push(text); ids.push(requestId); return { enviado: true, jid: `${phone}@s.whatsapp.net` }; },
    setHuman: async () => "",
  };
  await processarContinuacaoWhatsappSite({ sessionId, sourceId: "client:request" }, deps);
  await register(sessionId, "Preciso alterar minha reserva para 02/11/2026", "5562999990000", "client:new-handoff");
  await processarContinuacaoWhatsappSite({ sessionId, sourceId: "client:new-handoff", human: true, reason: "alteracao_reserva" }, deps);
  await processarContinuacaoWhatsappSite({ sessionId, sourceId: "client:new-handoff", human: true, reason: "alteracao_reserva" }, deps);
  assert.equal(messages.length, 2);
  assert.match(messages[1], /02\/11\/2026/);
  assert.equal(new Set(ids).size, 2);
  await removerConversaSite(sessionId);
});

test("bloqueio do contato no gateway não muda modo nem confirma envio", async () => {
  const sessionId = session();
  await register(sessionId, "Me chama no WhatsApp", "5562999990000");
  let humanChanges = 0;
  const result = await processarContinuacaoWhatsappSite({ sessionId, sourceId: "client:request", human: true }, {
    send: async () => ({ enviado: false, motivo: "CONTACT_BLOCKED" }),
    setHuman: async () => { humanChanges++; return ""; },
  });
  assert.equal(humanChanges, 0);
  assert.equal(result.continuation.sentAt, null);
  assert.equal(result.continuation.status, "failed");
  assert.match(result.reply, /Não consegui confirmar o envio/);
  await removerConversaSite(sessionId);
});

test("encaminhamento usa o JID confirmado e preserva bloqueio feito após envio", async (t) => {
  const originalUrl = process.env.AGENT_GATEWAY_URL;
  process.env.AGENT_GATEWAY_URL = "https://gateway.invalid";
  t.after(() => {
    if (originalUrl === undefined) delete process.env.AGENT_GATEWAY_URL;
    else process.env.AGENT_GATEWAY_URL = originalUrl;
  });
  const requests = [];
  let mode = "bot";
  t.mock.method(global, "fetch", async (url, options) => {
    requests.push({ url: String(url), body: options.body ? JSON.parse(options.body) : null });
    if (String(url).endsWith("/api/contacts")) {
      return new Response(JSON.stringify({ contacts: [{ jid: "confirmed@lid", phone: "5562999990000", mode }] }), { headers: { "Content-Type": "application/json" } });
    }
    assert.equal(String(url), "https://gateway.invalid/api/contacts/confirmed%40lid/mode");
    assert.equal(JSON.parse(options.body).mode, "human");
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  });
  const deps = { send: async () => ({ enviado: true, jid: "confirmed@lid" }) };
  const firstSession = session();
  await register(firstSession, "Me chama no wpp", "5562999990000");
  const first = await processarContinuacaoWhatsappSite({ sessionId: firstSession, sourceId: "client:request", human: true }, deps);
  assert.equal(first.continuation.status, "sent");
  assert.equal(requests.length, 2);
  assert.equal(requests[1].body.updatedBy, "site_whatsapp_handoff");
  await removerConversaSite(firstSession);

  requests.length = 0;
  mode = "blocked";
  const blockedSession = session();
  await register(blockedSession, "Me chama no wpp", "5562999990000");
  const blocked = await processarContinuacaoWhatsappSite({ sessionId: blockedSession, sourceId: "client:request", human: true }, deps);
  assert.equal(blocked.continuation.status, "failed");
  assert.equal(blocked.continuation.lastError, "CONTACT_BLOCKED");
  assert.equal(requests.length, 1);
  await removerConversaSite(blockedSession);
});

test("recusa encerra coleta sem disparo e bloqueio impede qualquer envio", async () => {
  const sessionId = session();
  await register(sessionId, "Me chama no WhatsApp");
  const deps = { send: forbidden, setHuman: forbidden };
  await processarContinuacaoWhatsappSite({ sessionId, sourceId: "client:request", human: true }, deps);
  const cancelled = await processarContinuacaoWhatsappSite({ sessionId, sourceId: "client:decline", cancelled: true }, deps);
  assert.equal(cancelled.continuation.status, "cancelled");
  assert.equal(cancelled.bookingUi, null);
  assert.equal(cancelled.human, false);
  assert.equal((await obterConversaSite(sessionId)).mode, "bot");
  assert.match(cancelled.reply, /seguimos por aqui/);
  await alterarModoConversaSite(sessionId, { mode: "blocked", updatedBy: "admin" });
  await assert.rejects(() => processarContinuacaoWhatsappSite({ sessionId, sourceId: "client:blocked" }, deps), /SITE_CHAT_SESSION_BLOCKED/);
  await removerConversaSite(sessionId);
});
