const { test } = require("node:test");
const assert = require("node:assert/strict");

process.env.FIREBASE_SERVICE_ACCOUNT = "";

const { relatouLigacaoNaoAtendida, podeEscalonarLigacaoSite, podeResponderContinuacaoAutomaticaSite } = require("../dist/services/siteOwnerEscalation");
const { processarContinuacaoWhatsappSite } = require("../dist/services/siteWhatsAppContinuation");
const {
  registrarMensagemConversaSite, alterarModoConversaSite, obterConversaSite, removerConversaSite,
} = require("../dist/services/siteChatConversations");
const { montarMensagemAlertaAtendimentoHumano } = require("../dist/services/whatsappHumanHandoffAlerts");

let sequence = 0;
const session = () => `site_owner_escalation_${Date.now()}_${++sequence}`;
const register = (id, text, phone = "5561999990000", sourceId = "client:initial") => registrarMensagemConversaSite(id, {
  from: "client", text, phone, sourceId,
});

test("reconhece ligação sem atendimento sem ativar por horário, hipótese, resolução ou despedida", () => {
  for (const text of [
    "Estou tentando ligar, mas não atende", "Liguei e ninguém atendeu o telefone", "Não consegui falar por telefone",
    "O telefone só chama", "O telefone cai na caixa postal", "Tentei ligar e não fui atendida", "Estou ligando e não estão atendendo",
  ]) assert.equal(relatouLigacaoNaoAtendida(text), true, text);
  for (const text of [
    "...", "Oi", "Obrigado", "Qual o horário?", "Posso ligar?", "Quero ligar para vocês",
    "Se eu ligar e ninguém atender o telefone?", "Não vou ligar", "Liguei e não atende, mas agora consegui falar",
    "Telefone estava ocupado, mas agora atendeu", "Se eu tentar ligar e ninguém atender, o que faço?",
    "Liguei e não atendeu, mas já me atenderam",
  ]) assert.equal(relatouLigacaoNaoAtendida(text), false, text);
  assert.equal(podeEscalonarLigacaoSite("Estou tentando ligar, mas não atende", { mode: "human", updatedBy: "jatoba", handoffPending: true }), true);
  assert.equal(podeEscalonarLigacaoSite("Estou tentando ligar, mas não atende", { mode: "human", updatedBy: "operador", handoffPending: false }), false);
});

test("o próprio Uirá não recebe o próprio contato nem alerta, inclusive após coleta", async () => {
  for (const phone of ["5562991150376", "556291150376"]) {
    const id = session();
    await register(id, "Estou tentando ligar, mas não atende", phone);
    const conversation = await obterConversaSite(id);
    assert.equal(podeEscalonarLigacaoSite(conversation.lastMessage, conversation), false);
    const forbidden = async () => { throw new Error("UNEXPECTED_NETWORK_CALL"); };
    const result = await processarContinuacaoWhatsappSite({ sessionId: id, sourceId: "client:initial", ownerEscalation: true }, {
      send: forbidden, setHuman: forbidden, notifyTeam: forbidden,
    });
    assert.equal(result.continuation.status, "cancelled");
    assert.match(result.reply, /Não vou enviar um aviso para o mesmo número/);
    assert.equal(result.human, false);
    await removerConversaSite(id);
  }
  const id = session();
  await register(id, "Estou tentando ligar, mas não atende", "");
  const forbidden = async () => { throw new Error("UNEXPECTED_NETWORK_CALL"); };
  const deps = { send: forbidden, setHuman: forbidden, notifyTeam: forbidden };
  const collecting = await processarContinuacaoWhatsappSite({ sessionId: id, sourceId: "client:initial", ownerEscalation: true }, deps);
  assert.equal(collecting.continuation.status, "awaiting_phone");
  await register(id, "Meu WhatsApp é (62) 99115-0376", "5562991150376", "client:phone");
  const ownPhone = await processarContinuacaoWhatsappSite({ sessionId: id, sourceId: "client:phone" }, deps);
  assert.equal(ownPhone.continuation.status, "cancelled");
  assert.equal(ownPhone.bookingUi, null);
  await removerConversaSite(id);
});

test("cliente já pendente recebe contato do Uirá e novo alerta :owner sem repetir genérico", async () => {
  const id = session();
  await register(id, "Quero falar com a equipe");
  const sends = [];
  const alerts = [];
  const deps = {
    send: async (phone, text, requestId) => { sends.push({ text, requestId }); return { enviado: true, jid: `${phone}@s.whatsapp.net` }; },
    setHuman: async () => "",
    notifyTeam: async (payload) => { alerts.push(payload); return { enfileirado: true }; },
  };
  const generic = await processarContinuacaoWhatsappSite({ sessionId: id, sourceId: "client:initial", human: true }, deps);
  const initialControl = (await obterConversaSite(id)).controlUpdatedAt;
  await register(id, "Estou tentando ligar, mas não atende", "5561999990000", "client:unanswered");
  const owner = await processarContinuacaoWhatsappSite({ sessionId: id, sourceId: "client:unanswered", human: true, ownerEscalation: true }, deps);
  assert.equal(alerts.length, 2);
  assert.equal(alerts[0].motivo, "solicitacao_cliente");
  assert.equal(alerts[1].motivo, "ligacao_nao_atendida");
  assert.equal(alerts[1].sourceMessageId, `${generic.continuation.requestId}:owner`);
  assert.match(alerts[1].resumo, /Estou tentando ligar, mas não atende/);
  assert.match(owner.reply, /Uirá/);
  assert.match(owner.reply, /https:\/\/wa\.me\/5562991150376/);
  assert.match(owner.reply, /Registrei o aviso ao Uirá/);
  assert.match(sends[1].text, /https:\/\/wa\.me\/5562991150376/);
  assert.equal((await obterConversaSite(id)).controlUpdatedAt, initialControl);

  const restored = await obterConversaSite(id);
  assert.equal(restored.whatsappContinuation.reason, "ligacao_nao_atendida");
  await register(id, "Liguei de novo, ninguém atende o telefone", "5561999990000", "client:repeat");
  const repeated = await processarContinuacaoWhatsappSite({ sessionId: id, sourceId: "client:repeat", human: true, ownerEscalation: true }, deps);
  assert.equal(repeated.continuation.requestId, owner.continuation.requestId);
  assert.equal(sends.length, 2);
  assert.equal(new Set(alerts.filter((alert) => alert.motivo === "ligacao_nao_atendida").map((alert) => alert.sourceMessageId)).size, 1);
  assert.equal(podeEscalonarLigacaoSite("...", restored), false);
  assert.equal(podeEscalonarLigacaoSite("Obrigado", restored), false);
  const message = montarMensagemAlertaAtendimentoHumano(alerts[1]);
  assert.match(message, /Ligação sem atendimento/);
  assert.match(message, /https:\/\/wa\.me\/5561999990000/);
  await removerConversaSite(id);
});

test("sem telefone mostra contato do Uirá e pede DDD antes de notificar; coleta mantém episódio", async () => {
  const id = session();
  await register(id, "Estou tentando ligar, mas não atende", "");
  await alterarModoConversaSite(id, { mode: "human", updatedBy: "jatoba" });
  const alerts = [];
  let sends = 0;
  const deps = {
    send: async (phone, text) => { sends++; assert.match(text, /https:\/\/wa\.me\/5562991150376/); return { enviado: true, jid: `${phone}@s.whatsapp.net` }; },
    setHuman: async () => "",
    notifyTeam: async (payload) => { alerts.push(payload); return { enfileirado: true }; },
  };
  const collecting = await processarContinuacaoWhatsappSite({ sessionId: id, sourceId: "client:initial", human: true, ownerEscalation: true }, deps);
  assert.equal(collecting.continuation.status, "awaiting_phone");
  assert.match(collecting.reply, /informe seu WhatsApp com DDD/);
  assert.match(collecting.reply, /https:\/\/wa\.me\/5562991150376/);
  assert.equal(alerts.length, 0);
  assert.equal(sends, 0);
  await register(id, "Meu nome é João", "", "client:name");
  const stillCollecting = await processarContinuacaoWhatsappSite({ sessionId: id, sourceId: "client:name" }, deps);
  assert.equal(stillCollecting.continuation.status, "awaiting_phone");
  assert.equal(stillCollecting.human, false);
  assert.equal(stillCollecting.bookingUi.step, "identity_phone");
  assert.match(stillCollecting.reply, /informe seu WhatsApp com DDD/);
  assert.equal(stillCollecting.continuation.requestId, collecting.continuation.requestId);
  assert.match(stillCollecting.continuation.context, /Estou tentando ligar, mas não atende/);
  assert.equal(alerts.length, 0);
  await register(id, "Meu WhatsApp para este atendimento é (61) 99999-0000.", "5561999990000", "client:phone");
  const completed = await processarContinuacaoWhatsappSite({ sessionId: id, sourceId: "client:phone" }, deps);
  assert.equal(completed.continuation.status, "sent");
  assert.equal(completed.continuation.requestId, collecting.continuation.requestId);
  assert.equal(alerts[0].sourceMessageId, collecting.continuation.requestId);
  assert.equal(alerts[0].motivo, "ligacao_nao_atendida");
  assert.equal(alerts[0].telefone, "5561999990000");
  await removerConversaSite(id);
});

test("operador e bloqueio impedem escalonamento sem qualquer envio ou alteração de controle", async () => {
  for (const mode of ["human", "blocked"]) {
    const id = session();
    await register(id, "Estou tentando ligar, mas não atende");
    await alterarModoConversaSite(id, { mode, updatedBy: "operador@vagafogo.com.br" });
    const forbidden = async () => { throw new Error("UNEXPECTED_NETWORK_CALL"); };
    const before = await obterConversaSite(id);
    assert.equal(podeResponderContinuacaoAutomaticaSite(before), false);
    assert.equal(podeEscalonarLigacaoSite(before.lastMessage, before), false);
    await assert.rejects(() => processarContinuacaoWhatsappSite({ sessionId: id, sourceId: "client:initial", ownerEscalation: true, human: true }, {
      send: forbidden, setHuman: forbidden, notifyTeam: forbidden,
    }), /SITE_CHAT_(?:OPERATOR_ACTIVE|SESSION_BLOCKED)/);
    assert.equal((await obterConversaSite(id)).updatedBy, before.updatedBy);
    await removerConversaSite(id);
  }
});

test("pedido, retry e coleta automática só seguem com bot ou handoff automático ainda pendente", () => {
  assert.equal(podeResponderContinuacaoAutomaticaSite(null), true);
  assert.equal(podeResponderContinuacaoAutomaticaSite({ mode: "bot", updatedBy: "operador", handoffPending: false }), true);
  assert.equal(podeResponderContinuacaoAutomaticaSite({ mode: "human", updatedBy: "jatoba", handoffPending: true }), true);
  assert.equal(podeResponderContinuacaoAutomaticaSite({ mode: "human", updatedBy: "jatoba", handoffPending: false }), false);
  assert.equal(podeResponderContinuacaoAutomaticaSite({ mode: "human", updatedBy: "operador", handoffPending: true }), false);
  assert.equal(podeResponderContinuacaoAutomaticaSite({ mode: "blocked", updatedBy: "jatoba", handoffPending: true }), false);
});

test("falha do alerta ao Uirá é honesta mesmo quando mensagem ao cliente também falhou", async () => {
  const id = session();
  await register(id, "O telefone só chama");
  const result = await processarContinuacaoWhatsappSite({ sessionId: id, sourceId: "client:initial", ownerEscalation: true, human: true }, {
    send: async () => ({ enviado: false, motivo: "WHATSAPP_UNAVAILABLE" }),
    setHuman: async () => "",
    notifyTeam: async () => { throw new Error("QUEUE_UNAVAILABLE"); },
  });
  assert.match(result.reply, /Não consegui confirmar o envio do aviso ao Uirá/);
  assert.doesNotMatch(result.reply, /Seu relato foi encaminhado/);
  assert.doesNotMatch(result.reply, /Registrei o aviso/);
  assert.match(result.reply, /https:\/\/wa\.me\/5562991150376/);
  assert.match(result.continuation.requestId, /:owner$/);
  await removerConversaSite(id);
});
