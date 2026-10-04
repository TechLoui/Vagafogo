import express, { ErrorRequestHandler, Response } from "express";
import cors from "cors";
import { criarCobrancaHandler } from "../services/assas";
import "dotenv/config";
import webhookRouter, {
  iniciarProcessadorConfirmacoesReservaAgente,
  processarConfirmacaoReservaAgente,
} from "./webhook";
import apiRouter from "./api";
import {
  iniciarLimpezaAutomaticaReservas,
  obterCamposRetencaoReservaNaAtualizacao,
} from "../services/reservaRetention";
import {
  excluirEmailDaFila,
  excluirEmailsEmMassa,
  enviarEmailManual,
  listarFilaEmailsConfirmacao,
  processarEmailsConfirmacaoPendentes,
  tentarReenviarEmailConfirmacaoReserva,
} from "../services/emailReservas";
import {
  desconectarWhatsApp,
  iniciarWhatsApp,
  obterStatusWhatsApp,
  encerrarWhatsAppSeMemoriaAlta,
  logarConfigWhatsapp,
  prepararBoasVindasWhatsapp,
} from "../services/whatsapp";
import { enviarMensagemTransacionalPeloAgente } from "../services/agentTransactionalWhatsapp";
import {
  cancelarCampanhaWhatsapp,
  criarCampanhaWhatsapp,
  armazenarMidiaCampanhaWhatsapp,
  enviarTesteInternoCampanhaWhatsapp,
  iniciarCampanhaWhatsapp,
  iniciarProcessadorCampanhasWhatsapp,
  obterCapacidadeCampanhasWhatsapp,
  obterAtribuicaoCampanhaPorTelefone,
  pausarCampanhaWhatsapp,
  processarFilaCampanhasWhatsapp,
  registrarAckCampanhaExterno,
  registrarCliqueCampanha,
  registrarRespostaCampanhaExterna,
  reenfileirarErrosCampanhaWhatsapp,
  removerMidiaCampanhaWhatsapp,
  retomarCampanhaWhatsapp,
} from "../services/whatsappCampaigns";
import {
  iniciarProcessadorAvisosNovaReserva,
  processarAvisosNovaReservaEquipe,
  reenfileirarAvisoNovaReservaEquipe,
} from "../services/whatsappReservationAlerts";
import {
  iniciarProcessadorConfirmacoesReservaWhatsapp,
  processarConfirmacaoReservaWhatsapp,
} from "../services/whatsappReservationConfirmations";
import { iniciarProcessadorLembretesWhatsappDoDia } from "../services/whatsappDailyReminders";
import { garantirConfiguracaoAutomacoesWhatsapp } from "../services/whatsappAutomationConfig";
import { exigirAdminCrm, obterIdentidadeAdminCrm } from "../middleware/crmAdminAuth";
import { limitarEventosJornada } from "../middleware/crmJourneyRateLimit";
import { registrarEventoJornada } from "../services/crmJourneys";
import { agentServiceConfigured, requestAgentService, type AgentResponse } from "../services/agentGateway";
import { exigirServicoAgente } from "../middleware/agentInternalAuth";
import {
  armazenarFotoGaleriaAgente,
  definirFotoPadraoGaleriaAgente,
  excluirFotoGaleriaAgente,
  listarGaleriaAgente,
  obterFotosGaleriaParaAgente,
} from "../services/agentMediaGallery";
import {
  atualizarLeadAgente,
  criarLinkCartaoAgente,
  criarLinkPixExistenteAgente,
  diagnosticarIntegridadeAgente,
  excluirLeadAgente,
  excluirRascunhoReservaAgente,
  excluirTodosLeadsAgente,
  finalizarLeadAgentePorEncerramento,
  finalizarLeadAgentePorDuvidaResolvida,
  iniciarFinalizadorLeadsAgente,
  listarCatalogoAgente,
  obterCheckoutAgente,
  obterRascunhoReservaAgente,
  registrarInatividadeLeadAgente,
  registrarLeadAgente,
  reservaAgenteTemConfirmacaoResumo,
  salvarRascunhoReservaAgente,
  simularReservaAgente,
} from "../services/agentReservationTools";
import {
  alterarDisponibilidadeOperadorAgente,
  atualizarOperadorInternoAgente,
  consultarDisponibilidadeOperadorAgente,
  consultarReservasOperadorAgente,
  excluirOperadorInternoAgente,
  listarAuditoriaOperadoresAgente,
  listarOperadoresInternosAgente,
  obterContextoOperadorInternoAgente,
  salvarOperadorInternoAgente,
} from "../services/agentInternalOperators";

const app = express();

// Railway encaminha o IP original por um unico proxy. Necessario para que o
// rate limit das submissoes publicas nao trate todos os visitantes como um so.
app.set("trust proxy", 1);

// Permitir requisições do localhost:5173 (seu front-end)
app.use(cors());

const decodeHeader = (value: string | undefined) => {
  try { return decodeURIComponent(value ?? ""); } catch { return value ?? ""; }
};

app.post('/crm/agente/galeria', express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '5mb' }), exigirAdminCrm, async (req, res) => {
  try {
    if (!Buffer.isBuffer(req.body)) {
      res.status(400).json({ error: 'AGENT_GALLERY_MEDIA_BODY_INVALID' });
      return;
    }
    const foto = await armazenarFotoGaleriaAgente(
      req.body,
      req.get('Content-Type'),
      decodeHeader(req.get('X-File-Name')),
      decodeHeader(req.get('X-Gallery-Category')),
      decodeHeader(req.get('X-Gallery-Title')),
      decodeHeader(req.get('X-Gallery-Caption')),
      obterIdentidadeAdminCrm(res),
    );
    res.status(201).json({ foto });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(message === 'FIREBASE_ADMIN_UNAVAILABLE' ? 503 : 400).json({ error: message });
  }
});

app.post('/crm/campanhas/midia', express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '5mb' }), exigirAdminCrm, async (req, res) => {
  try {
    if (!Buffer.isBuffer(req.body)) {
      res.status(400).json({ success: false, error: 'CAMPAIGN_MEDIA_BODY_INVALID' });
      return;
    }
    const midia = await armazenarMidiaCampanhaWhatsapp(
      req.body,
      req.get('Content-Type'),
      decodeURIComponent(req.get('X-File-Name') ?? 'campanha'),
      obterIdentidadeAdminCrm(res),
    );
    res.status(201).json({ success: true, midia });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const statusCode = message === 'FIREBASE_ADMIN_UNAVAILABLE' ? 503 : 400;
    res.status(statusCode).json({ success: false, error: message });
  }
});

// Formularios extensos podem ultrapassar o default de 100 KB do body-parser.
// A validacao de dominio ainda limita o documento normalizado antes do Firestore.
app.use(express.json({ limit: "1mb" }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    build: '2026-10-04.3-existing-pix-link',
    timestamp: new Date().toISOString(),
  });
});

app.get('/r/:campanhaId/:destinatarioId', async (req, res) => {
  const base = (process.env.PUBLIC_SITE_BASE_URL ?? "https://vagafogo.com.br").trim().replace(/\/+$/, "");
  const campaignId = String(req.params.campanhaId ?? "").slice(0, 100);
  const recipientId = String(req.params.destinatarioId ?? "").slice(0, 100);
  await registrarCliqueCampanha(campaignId, recipientId).catch((error) => {
    console.error("[crm][campanha] Falha ao registrar clique:", error);
  });
  const query = new URLSearchParams({
    cid: campaignId,
    rid: recipientId,
    source_channel: "whatsapp",
    utm_source: "whatsapp",
    utm_medium: "campaign",
    utm_campaign: campaignId,
  });
  res.set("Cache-Control", "no-store");
  res.redirect(302, `${base}/reservar?${query.toString()}`);
});

app.get('/checkout-agente/:token', async (req, res) => {
  res.set("Cache-Control", "no-store, max-age=0");
  res.set("Pragma", "no-cache");
  try {
    res.json(await obterCheckoutAgente(req.params.token));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "AGENT_CHECKOUT_NOT_FOUND" ? 404
      : message === "AGENT_CHECKOUT_EXPIRED" ? 410
        : message === "FIREBASE_ADMIN_UNAVAILABLE" ? 503
          : 400;
    res.status(status).json({ error: message });
  }
});

const responderProxyAgente = (res: Response, response: AgentResponse) => {
  if (response.contentType.includes("application/json")) {
    res.status(response.status).json(response.body);
    return;
  }
  res.status(response.status).type(response.contentType).send(response.body);
};

// O painel /agente conversa somente com o backend principal. O segredo entre
// servicos nunca e exposto no navegador.
app.get('/crm/agente/status', exigirAdminCrm, async (_req, res) => {
  responderProxyAgente(res, await requestAgentService("gateway", "/api/whatsapp/status"));
});

app.get('/crm/agente/operadores', exigirAdminCrm, async (_req, res) => {
  try {
    res.json({ operadores: await listarOperadoresInternosAgente() });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/crm/agente/operadores-auditoria', exigirAdminCrm, async (req, res) => {
  try {
    res.json({ operacoes: await listarAuditoriaOperadoresAgente(req.query.limite) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/crm/agente/operadores', exigirAdminCrm, async (req, res) => {
  try {
    const identity = obterIdentidadeAdminCrm(res);
    res.status(201).json({
      operador: await salvarOperadorInternoAgente(req.body ?? {}, identity.email ?? identity.uid),
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.patch('/crm/agente/operadores/:id', exigirAdminCrm, async (req, res) => {
  try {
    const identity = obterIdentidadeAdminCrm(res);
    res.json({
      operador: await atualizarOperadorInternoAgente(
        req.params.id,
        req.body ?? {},
        identity.email ?? identity.uid,
      ),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(message === 'AGENT_INTERNAL_OPERATOR_NOT_FOUND' ? 404 : 400).json({ error: message });
  }
});

app.delete('/crm/agente/operadores/:id', exigirAdminCrm, async (req, res) => {
  try {
    res.json(await excluirOperadorInternoAgente(req.params.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(message === 'AGENT_INTERNAL_OPERATOR_NOT_FOUND' ? 404 : 400).json({ error: message });
  }
});

app.get('/crm/agente/galeria', exigirAdminCrm, async (_req, res) => {
  try {
    res.json({ fotos: await listarGaleriaAgente() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(message === 'FIREBASE_ADMIN_UNAVAILABLE' ? 503 : 400).json({ error: message });
  }
});

app.delete('/crm/agente/galeria/:id', exigirAdminCrm, async (req, res) => {
  try {
    res.json(await excluirFotoGaleriaAgente(req.params.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(message === 'FIREBASE_ADMIN_UNAVAILABLE' ? 503 : 400).json({ error: message });
  }
});

app.patch('/crm/agente/galeria/padroes/:id', exigirAdminCrm, async (req, res) => {
  try {
    res.json(await definirFotoPadraoGaleriaAgente(req.params.id, req.body?.ativo));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === 'FIREBASE_ADMIN_UNAVAILABLE' ? 503
      : message === 'AGENT_GALLERY_DEFAULT_NOT_FOUND' ? 404
        : 400;
    res.status(status).json({ error: message });
  }
});

app.get('/crm/agente/qrcode', exigirAdminCrm, async (_req, res) => {
  responderProxyAgente(res, await requestAgentService("gateway", "/api/whatsapp/qrcode", { timeoutMs: 15_000 }));
});

app.post('/crm/agente/logout', exigirAdminCrm, async (_req, res) => {
  responderProxyAgente(res, await requestAgentService("gateway", "/api/whatsapp/logout", { method: "POST" }));
});

app.post('/crm/agente/reset', exigirAdminCrm, async (_req, res) => {
  responderProxyAgente(res, await requestAgentService("gateway", "/api/whatsapp/reset", { method: "POST" }));
});

app.post('/crm/agente/teste-whatsapp', exigirAdminCrm, async (req, res) => {
  const phone = String(req.body?.phone ?? "").replace(/\D/g, "").slice(0, 15);
  const text = String(req.body?.text ?? "").trim().slice(0, 4096);
  if (!phone || !text) {
    res.status(400).json({ error: "Informe telefone e mensagem." });
    return;
  }
  responderProxyAgente(res, await requestAgentService("gateway", "/api/whatsapp/test", {
    method: "POST",
    body: { phone, text },
  }));
});

app.get('/crm/agente/contatos', exigirAdminCrm, async (_req, res) => {
  responderProxyAgente(res, await requestAgentService("gateway", "/api/contacts"));
});

app.get('/crm/agente/contatos/:jid/mensagens', exigirAdminCrm, async (req, res) => {
  const after = Number.isFinite(Number(req.query.after)) ? Math.max(0, Number(req.query.after)) : 0;
  responderProxyAgente(res, await requestAgentService(
    "gateway",
    `/api/contacts/${encodeURIComponent(req.params.jid)}/messages?after=${after}`,
  ));
});

app.post('/crm/agente/contatos/:jid/modo', exigirAdminCrm, async (req, res) => {
  const mode = String(req.body?.mode ?? "").trim().toLowerCase();
  if (!['bot', 'human', 'blocked'].includes(mode)) {
    res.status(400).json({ error: "Modo invalido." });
    return;
  }
  const identity = obterIdentidadeAdminCrm(res);
  responderProxyAgente(res, await requestAgentService(
    "gateway",
    `/api/contacts/${encodeURIComponent(req.params.jid)}/mode`,
    {
      method: "POST",
      body: {
        mode,
        reason: String(req.body?.reason ?? "").trim().slice(0, 250),
        phone: String(req.body?.phone ?? "").replace(/\D/g, "").slice(0, 15),
        name: String(req.body?.name ?? "").trim().slice(0, 120),
        updatedBy: identity.email ?? identity.uid,
      },
    },
  ));
});

app.post('/crm/agente/contatos/:jid/enviar', exigirAdminCrm, async (req, res) => {
  const text = String(req.body?.text ?? "").trim().slice(0, 4096);
  const requestId = String(req.body?.requestId ?? "").trim().slice(0, 160);
  if (!text) {
    res.status(400).json({ error: "Mensagem vazia." });
    return;
  }
  responderProxyAgente(res, await requestAgentService("gateway", "/api/whatsapp/send", {
    method: "POST",
    body: { jid: req.params.jid, text, requestId },
  }));
});

app.post('/crm/agente/reservas/:id/reenviar-confirmacao', exigirAdminCrm, async (req, res) => {
  try {
    const resultado = await processarConfirmacaoReservaAgente(String(req.params.id ?? "").slice(0, 100), true);
    res.status(resultado.enviado || resultado.motivo === "ja_enviado" ? 200 : 409).json(resultado);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.delete('/crm/agente/contatos/:jid/sessao', exigirAdminCrm, async (req, res) => {
  const response = await requestAgentService(
    "gateway",
    `/api/contacts/${encodeURIComponent(req.params.jid)}/session`,
    { method: "DELETE" },
  );
  if (response.status >= 200 && response.status < 300) {
    const phone = String(req.body?.phone ?? "").replace(/\D/g, "").slice(0, 15);
    await finalizarLeadAgentePorEncerramento(phone).catch((error) => {
      console.error("[agent-leads] Falha ao finalizar lead apos encerramento manual:", error);
    });
    if (phone) {
      await requestAgentService("ai", `/api/sessions/${encodeURIComponent(`whatsapp_${phone}`)}`, {
        method: "DELETE",
      }).catch((error) => {
        console.error("[agent] Falha ao descartar contexto efemero apos encerramento manual:", error);
      });
    }
  }
  responderProxyAgente(res, response);
});

app.get('/crm/agente/prompt', exigirAdminCrm, async (_req, res) => {
  responderProxyAgente(res, await requestAgentService("ai", "/api/prompt"));
});

app.post('/crm/agente/prompt', exigirAdminCrm, async (req, res) => {
  const prompt = String(req.body?.prompt ?? "").trim();
  if (!prompt || prompt.length > 50_000) {
    res.status(400).json({ error: "Prompt invalido." });
    return;
  }
  responderProxyAgente(res, await requestAgentService("ai", "/api/prompt", { method: "POST", body: { prompt } }));
});

app.get('/crm/agente/config', exigirAdminCrm, async (_req, res) => {
  responderProxyAgente(res, await requestAgentService("ai", "/api/config"));
});

app.post('/crm/agente/config', exigirAdminCrm, async (req, res) => {
  responderProxyAgente(res, await requestAgentService("ai", "/api/config", { method: "POST", body: req.body ?? {} }));
});

app.post('/crm/agente/testar', exigirAdminCrm, async (req, res) => {
  const pergunta = String(req.body?.pergunta ?? "").trim().slice(0, 4096);
  const sessionId = String(req.body?.session_id ?? "").trim().slice(0, 160);
  if (!pergunta) {
    res.status(400).json({ error: "Mensagem vazia." });
    return;
  }
  responderProxyAgente(res, await requestAgentService("ai", "/ask", {
    method: "POST",
    body: {
      pergunta,
      session_id: sessionId,
      mode: "test",
      telefone: "5500000000000",
      nome_contato: "Contato de teste",
    },
    timeoutMs: 100_000,
  }));
});

app.post('/crm/agente/testar-interno', exigirAdminCrm, async (req, res) => {
  const pergunta = String(req.body?.pergunta ?? "").trim().slice(0, 4096);
  const phone = String(req.body?.telefone ?? "").replace(/\D/g, "").slice(0, 15);
  const sessionId = String(req.body?.session_id ?? "").trim().slice(0, 160);
  if (!pergunta || !phone) {
    res.status(400).json({ error: "Informe operador e mensagem." });
    return;
  }
  responderProxyAgente(res, await requestAgentService("ai", "/ask", {
    method: "POST",
    body: {
      pergunta,
      session_id: sessionId || `teste-interno-${phone}`,
      mode: "test",
      telefone: phone,
      nome_contato: "Teste de acesso interno",
      internal_test: true,
    },
    timeoutMs: 100_000,
  }));
});

app.patch('/crm/agente/leads/:id', exigirAdminCrm, async (req, res) => {
  try {
    res.json(await atualizarLeadAgente(req.params.id, req.body ?? {}));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(message === "AGENT_LEAD_NOT_FOUND" ? 404 : 400).json({ error: message });
  }
});

app.delete('/crm/agente/leads/:id', exigirAdminCrm, async (req, res) => {
  try {
    res.json(await excluirLeadAgente(req.params.id));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.delete('/crm/agente/leads', exigirAdminCrm, async (_req, res) => {
  try {
    res.json(await excluirTodosLeadsAgente());
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Webhook test - resposta instantânea
app.get('/crm/agente/diagnostico', exigirAdminCrm, async (_req, res) => {
  const [gateway, ai] = await Promise.all([
    requestAgentService("gateway", "/api/whatsapp/status", { timeoutMs: 15_000 }),
    requestAgentService("ai", "/", { timeoutMs: 15_000 }),
  ]);
  let reservas = { ok: false, pacotes: 0, erro: null as string | null };
  try {
    const catalogo = await listarCatalogoAgente();
    reservas = { ok: true, pacotes: catalogo.pacotes.length + catalogo.combos.length, erro: null };
  } catch (error) {
    reservas.erro = error instanceof Error ? error.message : String(error);
  }
  let integridade: Awaited<ReturnType<typeof diagnosticarIntegridadeAgente>> | { ok: false; erro: string };
  try {
    integridade = await diagnosticarIntegridadeAgente(30);
  } catch (error) {
    integridade = { ok: false, erro: error instanceof Error ? error.message : String(error) };
  }
  res.json({
    ok: gateway.status < 400 && ai.status < 400 && reservas.ok,
    configuracao: {
      gatewayUrl: agentServiceConfigured("gateway"),
      aiUrl: agentServiceConfigured("ai"),
      tokenInterno: Boolean((process.env.AGENT_INTERNAL_API_TOKEN ?? "").trim()),
      firebasePrincipal: Boolean((process.env.FIREBASE_SERVICE_ACCOUNT ?? "").trim()),
      asaas: Boolean((process.env.ASAAS_API_KEY ?? "").trim()),
    },
    gateway: { ok: gateway.status < 400, status: gateway.status, dados: gateway.body },
    ai: { ok: ai.status < 400, status: ai.status, dados: ai.body },
    reservas,
    integridade,
  });
});

// Ferramentas consumidas exclusivamente pelo backend de IA. Nenhuma credencial
// do banco principal e compartilhada com o servico do agente.
app.get('/internal/agente/ferramentas/pacotes', exigirServicoAgente, async (_req, res) => {
  try {
    res.json(await listarCatalogoAgente());
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/internal/agente/operadores/contexto', exigirServicoAgente, async (req, res) => {
  try {
    res.json(await obterContextoOperadorInternoAgente(req.body?.telefone));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/internal/agente/operadores/reservas', exigirServicoAgente, async (req, res) => {
  try {
    res.json(await consultarReservasOperadorAgente(req.body ?? {}));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(message.includes('ACCESS_DENIED') || message.includes('PERMISSION_DENIED') ? 403 : 400).json({ error: message });
  }
});

app.post('/internal/agente/operadores/disponibilidade', exigirServicoAgente, async (req, res) => {
  try {
    res.json(await consultarDisponibilidadeOperadorAgente(req.body ?? {}));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(message.includes('ACCESS_DENIED') || message.includes('PERMISSION_DENIED') ? 403 : 400).json({ error: message });
  }
});

app.post('/internal/agente/operadores/disponibilidade/alterar', exigirServicoAgente, async (req, res) => {
  try {
    res.json(await alterarDisponibilidadeOperadorAgente(req.body ?? {}));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(message.includes('ACCESS_DENIED') || message.includes('PERMISSION_DENIED') ? 403 : 400).json({ error: message });
  }
});

app.get('/internal/agente/ferramentas/galeria', exigirServicoAgente, async (req, res) => {
  try {
    res.json(await obterFotosGaleriaParaAgente(req.query.categoria, req.query.limite));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(message === 'FIREBASE_ADMIN_UNAVAILABLE' ? 503 : 400).json({ error: message });
  }
});

app.post('/internal/agente/ferramentas/disponibilidade', exigirServicoAgente, async (req, res) => {
  try {
    res.json(await simularReservaAgente(req.body ?? {}));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/internal/agente/ferramentas/link-cartao', exigirServicoAgente, async (req, res) => {
  try {
    const campaignAttribution = await obterAtribuicaoCampanhaPorTelefone(req.body?.telefone).catch(() => ({}));
    res.json(await criarLinkCartaoAgente({ ...(req.body ?? {}), ...campaignAttribution }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(message === 'FIREBASE_ADMIN_UNAVAILABLE' ? 503 : 400).json({ error: message });
  }
});

app.post('/internal/agente/ferramentas/link-pix-existente', exigirServicoAgente, async (req, res) => {
  try {
    res.json(await criarLinkPixExistenteAgente(req.body ?? {}));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(message === 'FIREBASE_ADMIN_UNAVAILABLE' ? 503 : 400).json({ error: message });
  }
});

app.post('/internal/agente/ferramentas/lead', exigirServicoAgente, async (req, res) => {
  try {
    const operator = await obterContextoOperadorInternoAgente(req.body?.telefone);
    if (operator.autorizado) {
      res.json({ registrado: false, motivo: 'operador_interno' });
      return;
    }
    res.status(201).json(await registrarLeadAgente(req.body ?? {}));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/internal/agente/eventos/atendimento-resolvido', exigirServicoAgente, async (req, res) => {
  try {
    res.json(await finalizarLeadAgentePorDuvidaResolvida(req.body?.telefone));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/internal/agente/eventos/inatividade', exigirServicoAgente, async (req, res) => {
  try {
    res.json(await registrarInatividadeLeadAgente(req.body?.telefone, req.body?.tentativa));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/internal/agente/ferramentas/rascunho-reserva/obter', exigirServicoAgente, async (req, res) => {
  try {
    res.json(await obterRascunhoReservaAgente(req.body ?? {}));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(message === 'FIREBASE_ADMIN_UNAVAILABLE' ? 503 : 400).json({ error: message });
  }
});

app.post('/internal/agente/ferramentas/rascunho-reserva/salvar', exigirServicoAgente, async (req, res) => {
  try {
    res.status(201).json(await salvarRascunhoReservaAgente(req.body ?? {}));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(message === 'FIREBASE_ADMIN_UNAVAILABLE' ? 503 : 400).json({ error: message });
  }
});

app.post('/internal/agente/ferramentas/rascunho-reserva/excluir', exigirServicoAgente, async (req, res) => {
  try {
    res.json(await excluirRascunhoReservaAgente(req.body ?? {}));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(message === 'FIREBASE_ADMIN_UNAVAILABLE' ? 503 : 400).json({ error: message });
  }
});

app.post('/internal/agente/eventos/ack', exigirServicoAgente, async (req, res) => {
  const messageId = String(req.body?.messageId ?? "").trim().slice(0, 200);
  const ack = Number(req.body?.ack);
  if (!messageId || !Number.isFinite(ack)) {
    res.status(400).json({ error: "AGENT_ACK_INVALID" });
    return;
  }
  await registrarAckCampanhaExterno({ messageId, ack });
  res.status(202).json({ ok: true });
});

app.post('/internal/agente/eventos/inbound', exigirServicoAgente, async (req, res) => {
  const telefone = String(req.body?.telefone ?? "").replace(/\D/g, "").slice(0, 15);
  const mensagem = String(req.body?.mensagem ?? "").trim().slice(0, 4096);
  const messageId = String(req.body?.messageId ?? "").trim().slice(0, 200);
  if (!telefone || !mensagem || !messageId) {
    res.status(400).json({ error: "AGENT_INBOUND_INVALID" });
    return;
  }
  const operator = await obterContextoOperadorInternoAgente(telefone);
  if (operator.autorizado) {
    res.status(202).json({ ok: true, ignorado: 'operador_interno' });
    return;
  }
  await registrarRespostaCampanhaExterna({ telefone, mensagem, messageId, recebidoEm: new Date() });
  res.status(202).json({ ok: true });
});

app.post('/internal/agente/ferramentas/criar-pix', exigirServicoAgente, async (req, res) => {
  const idempotencyKey = String(req.body?.idempotencyKey ?? "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(idempotencyKey)) {
    res.status(400).json({ error: "AGENT_PAYMENT_IDEMPOTENCY_KEY_INVALID" });
    return;
  }
  if (req.body?.creditCard || req.body?.creditCardHolderInfo) {
    res.status(400).json({ error: "AGENT_CARD_DATA_NOT_ACCEPTED" });
    return;
  }
  if (!reservaAgenteTemConfirmacaoResumo(req.body ?? {})) {
    res.status(400).json({ error: "AGENT_PAYMENT_SUMMARY_CONFIRMATION_REQUIRED" });
    return;
  }
  try {
    // A cobranca nunca confia no valor ou na composicao enviados pela IA. Tudo
    // e recalculado no sistema Vagafogo imediatamente antes de criar o PIX.
    const disponibilidade = await simularReservaAgente(req.body ?? {});
    if (!disponibilidade.disponivel) {
      res.status(409).json({ error: "AGENT_AVAILABILITY_CHANGED", disponibilidade });
      return;
    }
    if (!disponibilidade.prontoParaPagamento) {
      res.status(400).json({ error: "AGENT_RESERVATION_DATA_INCOMPLETE", requisitosPendentes: disponibilidade.requisitosPendentes });
      return;
    }
    const campaignAttribution = await obterAtribuicaoCampanhaPorTelefone(req.body?.telefone).catch(() => ({}));
    const categorias = disponibilidade.categoriasLegadas;
    req.headers["idempotency-key"] = idempotencyKey;
    req.body = {
      ...(req.body ?? {}),
      valor: disponibilidade.valor,
      atividade: disponibilidade.oferta.nome,
      participantes: disponibilidade.participantes,
      participantesPorTipo: disponibilidade.participantesPorTipo,
      adultos: categorias.adultos,
      bariatrica: categorias.bariatrica,
      criancas: categorias.criancas,
      naoPagante: categorias.naoPagantes,
      pacoteIds: disponibilidade.oferta.pacoteIds,
      comboId: disponibilidade.oferta.tipo === "combo" ? disponibilidade.oferta.id : null,
      horario: disponibilidade.horario,
      horariosPorPacote: disponibilidade.horariosPorPacote,
      gruposParticipacao: [{
        tipo: disponibilidade.oferta.tipo,
        refId: disponibilidade.oferta.id,
        nome: disponibilidade.oferta.nome,
        pacoteIds: disponibilidade.oferta.pacoteIds,
        participantesPorTipo: disponibilidade.participantesPorTipo,
        participantes: disponibilidade.participantes,
        idadesPorTipo: disponibilidade.idadesPorTipo,
      }],
      billingType: "PIX",
      creditCard: undefined,
      creditCardHolderInfo: undefined,
      atribuicao: {
        ...(req.body?.atribuicao && typeof req.body.atribuicao === "object" ? req.body.atribuicao : {}),
        sessionId: String(req.body?.sessionId ?? req.body?.atribuicao?.sessionId ?? "").slice(0, 100),
        sourceChannel: "whatsapp",
        utmSource: "whatsapp",
        utmMedium: "agente",
        utmCampaign: "reserva_assistida",
        capturedAt: new Date().toISOString(),
        ...campaignAttribution,
      },
      whatsappMarketingOptIn: req.body?.whatsappMarketingOptIn === true,
    };
    await criarCobrancaHandler(req, res);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/webhook-test', (req, res) => {
  res.status(200).send('OK');
});

app.post("/criar-cobranca", criarCobrancaHandler);
app.post("/crm/jornadas/evento", express.text({ type: "text/plain", limit: "20kb" }), limitarEventosJornada, async (req, res) => {
  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const resultado = await registrarEventoJornada(payload);
    res.status(202).json({ success: true, ...resultado });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const statusCode = message === "FIREBASE_ADMIN_UNAVAILABLE" ? 503 : 400;
    res.status(statusCode).json({ success: false, error: message });
  }
});
app.use('/webhook', webhookRouter);
app.use('/api', apiRouter);

// Endpoint para testar atualização de status (apenas para debug)
app.post('/test-update-status/:reservaId', async (req, res) => {
  try {
    const { reservaId } = req.params;
    const { status } = req.body;
    
    const { doc, getDoc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('../services/firebase');
    
    const reservaRef = doc(db, 'reservas', reservaId);
    const reservaSnap = await getDoc(reservaRef);
    const reservaAtual = reservaSnap.exists()
      ? (reservaSnap.data() as Record<string, any>)
      : {};
    await updateDoc(reservaRef, {
      status: status || 'pago',
      dataPagamento: new Date(),
      ...obterCamposRetencaoReservaNaAtualizacao({
        status: status || 'pago',
        confirmada: ['pago', 'confirmado'].includes(
          (status || 'pago').toString().trim().toLowerCase()
        ),
        criadoEm: reservaAtual.criadoEm,
      }),
    });
    
    res.json({ success: true, message: `Status atualizado para: ${status || 'pago'}` });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// Endpoint para processar emails de confirmação
// Query params:
//   ?incluir_antigas=true  -> processa reservas com data anterior a hoje (cuidado!)
//   ?limite=N              -> limite de envios por execucao (default 50)
//   ?data_minima=YYYY-MM-DD -> so envia para reservas com data >= esta data
app.post('/process-emails', async (req, res) => {
  try {
    const incluirAntigas = req.query?.incluir_antigas === 'true';
    const limiteParam = Number(req.query?.limite ?? '');
    const limite = Number.isFinite(limiteParam) && limiteParam > 0 ? limiteParam : undefined;
    const dataMinimaParam = typeof req.query?.data_minima === 'string' ? req.query.data_minima : undefined;

    const resultado = await processarEmailsConfirmacaoPendentes({
      incluirAntigas,
      limite,
      dataMinima: dataMinimaParam,
    });
    res.json({ success: true, ...resultado });
  } catch (error: any) {
    console.error('Erro ao processar emails:', error);
    res.status(500).json({ error: error?.message || 'Erro desconhecido' });
  }
});

// Excluir varios emails da fila de uma vez
// Body: { reservaIds: string[] }
app.post('/emails/excluir-em-massa', async (req, res) => {
  try {
    const raw = (req.body as { reservaIds?: unknown })?.reservaIds;
    if (!Array.isArray(raw)) {
      res.status(400).json({ success: false, error: 'reservaIds deve ser um array.' });
      return;
    }
    const reservaIds = raw
      .map((id) => (typeof id === 'string' ? id.trim() : ''))
      .filter((id) => id.length > 0);
    if (reservaIds.length === 0) {
      res.status(400).json({ success: false, error: 'Informe ao menos 1 reserva.' });
      return;
    }
    const resultado = await excluirEmailsEmMassa(reservaIds);
    res.json({ success: true, ...resultado });
  } catch (error: any) {
    console.error('Erro ao excluir emails em massa:', error);
    res.status(500).json({ success: false, error: error?.message || 'Erro desconhecido' });
  }
});

app.get('/emails/fila', async (req, res) => {
  try {
    const limit = Number(req.query.limit ?? 200);
    const resultado = await listarFilaEmailsConfirmacao(
      Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 200,
    );
    res.json({ success: true, ...resultado });
  } catch (error: any) {
    console.error('Erro ao carregar fila de emails:', error);
    res.status(500).json({ error: error?.message || 'Erro desconhecido' });
  }
});

app.post('/emails/:reservaId/retry', async (req, res) => {
  try {
    const { reservaId } = req.params;
    const resultado = await tentarReenviarEmailConfirmacaoReserva(reservaId);

    if (resultado.enviado) {
      res.json({ success: true, ...resultado });
      return;
    }

    const status =
      resultado.motivo === "RESERVA_NAO_ENCONTRADA"
        ? 404
        : resultado.motivo === "LIMITE_ATINGIDO"
          ? 429
          : 400;

    res.status(status).json({ success: false, ...resultado });
  } catch (error: any) {
    console.error('Erro ao reenviar email:', error);
    res.status(500).json({ success: false, error: error?.message || 'Erro desconhecido' });
  }
});

app.post('/emails/:reservaId/excluir', async (req, res) => {
  try {
    const { reservaId } = req.params;
    const resultado = await excluirEmailDaFila(reservaId);

    if (resultado.excluido) {
      res.json({ success: true, ...resultado });
      return;
    }

    res.status(resultado.motivo === "RESERVA_NAO_ENCONTRADA" ? 404 : 400).json({
      success: false,
      ...resultado,
    });
  } catch (error: any) {
    console.error('Erro ao excluir email da fila:', error);
    res.status(500).json({ success: false, error: error?.message || 'Erro desconhecido' });
  }
});

// Boas-vindas via WhatsApp ao marcar chegada do cliente
app.get('/whatsapp/status', exigirAdminCrm, (_req, res) => {
  res.json(obterStatusWhatsApp());
});

app.get('/crm/campanhas/capacidade', exigirAdminCrm, (_req, res) => {
  res.json(obterCapacidadeCampanhasWhatsapp());
});

app.delete('/crm/campanhas/midia', exigirAdminCrm, async (req, res) => {
  try {
    await removerMidiaCampanhaWhatsapp(req.body?.storagePath, obterIdentidadeAdminCrm(res));
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const statusCode = message === 'FIREBASE_ADMIN_UNAVAILABLE' ? 503 : 400;
    res.status(statusCode).json({ success: false, error: message });
  }
});

app.post('/crm/campanhas', exigirAdminCrm, async (req, res) => {
  try {
    const resultado = await criarCampanhaWhatsapp(req.body ?? {}, obterIdentidadeAdminCrm(res));
    res.status(201).json({ success: true, ...resultado });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const statusCode = message === 'FIREBASE_ADMIN_UNAVAILABLE' ? 503 : 400;
    res.status(statusCode).json({ success: false, error: message });
  }
});

app.post('/crm/campanhas/teste-interno', exigirAdminCrm, async (req, res) => {
  try {
    const resultado = await enviarTesteInternoCampanhaWhatsapp(req.body ?? {}, obterIdentidadeAdminCrm(res));
    res.json({ success: resultado.enviado, ...resultado });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const statusCode = message === 'FIREBASE_ADMIN_UNAVAILABLE' ? 503 : 400;
    res.status(statusCode).json({ success: false, error: message });
  }
});

app.post('/crm/campanhas/:campanhaId/:acao', exigirAdminCrm, async (req, res) => {
  try {
    const { campanhaId, acao } = req.params;
    if (acao === 'iniciar') await iniciarCampanhaWhatsapp(campanhaId);
    else if (acao === 'pausar') await pausarCampanhaWhatsapp(campanhaId);
    else if (acao === 'retomar') await retomarCampanhaWhatsapp(campanhaId);
    else if (acao === 'cancelar') await cancelarCampanhaWhatsapp(campanhaId);
    else if (acao === 'reenfileirar-erros') {
      const reenfileirados = await reenfileirarErrosCampanhaWhatsapp(campanhaId);
      res.json({ success: true, reenfileirados });
      return;
    } else {
      res.status(404).json({ success: false, error: 'CAMPAIGN_ACTION_NOT_FOUND' });
      return;
    }
    void processarFilaCampanhasWhatsapp();
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const statusCode = message === 'CAMPAIGN_NOT_FOUND' ? 404 : message === 'CAMPAIGN_SENDING_DISABLED' || message === 'FIREBASE_ADMIN_UNAVAILABLE' ? 503 : 409;
    res.status(statusCode).json({ success: false, error: message });
  }
});

app.post('/whatsapp/avisos-reserva/:reservaId/reenviar', exigirAdminCrm, async (req, res) => {
  try {
    await reenfileirarAvisoNovaReservaEquipe(req.params.reservaId);
    void processarAvisosNovaReservaEquipe();
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(message === 'RESERVATION_ALERT_NOT_FOUND' ? 404 : 500).json({ success: false, error: message });
  }
});

app.post('/whatsapp/start', exigirAdminCrm, (_req, res) => {
  iniciarWhatsApp();
  res.json(obterStatusWhatsApp());
});

app.post('/whatsapp/logout', exigirAdminCrm, async (_req, res) => {
  try {
    await desconectarWhatsApp();
    res.json(obterStatusWhatsApp());
  } catch (error: any) {
    console.error('Erro ao desconectar WhatsApp:', error);
    res.status(500).json({ error: error?.message || 'Erro ao desconectar WhatsApp' });
  }
});

app.post('/whatsapp/boas-vindas/:reservaId', exigirAdminCrm, async (req, res) => {
  try {
    const { reservaId } = req.params;
    if (!reservaId) {
      return res.status(400).json({ enviado: false, motivo: 'reserva_id_ausente' });
    }

    const { doc, getDoc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('../services/firebase');

    const reservaRef = doc(db, 'reservas', reservaId);
    const reservaSnap = await getDoc(reservaRef);
    if (!reservaSnap.exists()) {
      return res.status(404).json({ enviado: false, motivo: 'reserva_nao_encontrada' });
    }

    const reserva = reservaSnap.data() as Record<string, any>;

    if (reserva.whatsappBoasVindasEnviado === true) {
      return res.json({ enviado: false, motivo: 'ja_enviado' });
    }

    const prepared = await prepararBoasVindasWhatsapp(reservaId, reserva);
    const resultado = prepared.enviado && prepared.telefone && prepared.mensagem
      ? await enviarMensagemTransacionalPeloAgente(
        prepared.telefone,
        prepared.mensagem,
        `boas-vindas:${reservaId}:${prepared.telefone}`,
      )
      : prepared;

    if (resultado.enviado) {
      await updateDoc(reservaRef, {
        whatsappBoasVindasEnviado: true,
        dataWhatsappBoasVindas: new Date(),
        whatsappBoasVindasMensagem: resultado.mensagem ?? '',
      });
    }

    res.json(resultado);
  } catch (error: any) {
    console.error('Erro ao enviar boas-vindas WhatsApp:', error);
    res.status(500).json({ enviado: false, motivo: error?.message || 'erro' });
  }
});

// Reenvio manual de confirmacao WhatsApp (caso o webhook tenha falhado, por ex)
app.post('/whatsapp/confirmacao/:reservaId', exigirAdminCrm, async (req, res) => {
  try {
    const { reservaId } = req.params;
    if (!reservaId) {
      return res.status(400).json({ enviado: false, motivo: 'reserva_id_ausente' });
    }

    const resultado = await processarConfirmacaoReservaWhatsapp(reservaId, true);
    res.json(resultado);
  } catch (error: any) {
    console.error('Erro ao enviar confirmacao WhatsApp:', error);
    res.status(500).json({ enviado: false, motivo: error?.message || 'erro' });
  }
});

app.post('/send-email', async (req, res) => {
  try {
    const to = typeof req.body?.to === 'string' ? req.body.to.trim() : '';
    const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

    if (!to || !subject || !message) {
      res.status(400).json({
        success: false,
        error: 'Informe destinatario, assunto e mensagem.',
      });
      return;
    }

    const resultado = await enviarEmailManual({ to, subject, message });
    if (!resultado.enviado) {
      res.status(400).json({
        success: false,
        error:
          resultado.motivo === 'MISSING_CONFIG'
            ? 'SMTP nao configurado.'
            : 'Envio de email desabilitado.',
      });
      return;
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao enviar email manual:', error);
    res.status(500).json({ success: false, error: error?.message || 'Erro ao enviar email' });
  }
});

// Endpoint para testar webhook
app.post('/test-webhook', (req, res) => {
  const mockWebhookData = {
    event: 'PAYMENT_CONFIRMED',
    payment: {
      id: 'test-payment-id',
      status: 'CONFIRMED',
      billingType: 'CREDIT_CARD',
      externalReference: req.body.reservaId || 'test-reserva-id'
    }
  };
  
  // Simular chamada do webhook
  fetch(`${req.protocol}://${req.get('host')}/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mockWebhookData)
  }).then(() => {
    res.json({ success: true, message: 'Webhook de teste enviado' });
  }).catch(error => {
    res.status(500).json({ error: error.message });
  });
});

const jsonBodyErrorHandler: ErrorRequestHandler = (error: any, _req, res, next) => {
  if (error?.type === "entity.too.large") {
    res.status(413).json({
      error: "O corpo da requisicao excede o tamanho maximo permitido.",
      code: "PAYLOAD_TOO_LARGE",
    });
    return;
  }
  if (error instanceof SyntaxError && (error as any).type === "entity.parse.failed") {
    res.status(400).json({
      error: "O corpo JSON da requisicao e invalido.",
      code: "INVALID_JSON",
    });
    return;
  }
  next(error);
};

app.use(jsonBodyErrorHandler);

const port = process.env.PORT || 3001;
const WHATSAPP_AUTO_START = (process.env.WHATSAPP_AUTO_START ?? "false").toLowerCase() === "true";

app.listen(port, async () => {
  console.log(`Servidor rodando na porta ${port}`);
  iniciarLimpezaAutomaticaReservas();
  try {
    const migrada = await garantirConfiguracaoAutomacoesWhatsapp();
    if (migrada) console.log("[whatsapp] Automacoes transacionais habilitadas e configuradas.");
  } catch (error) {
    console.error("[whatsapp] Falha ao garantir configuracao das automacoes:", error);
  }
  iniciarProcessadorAvisosNovaReserva();
  iniciarProcessadorConfirmacoesReservaWhatsapp();
  iniciarProcessadorLembretesWhatsappDoDia();
  iniciarProcessadorCampanhasWhatsapp();
  iniciarFinalizadorLeadsAgente();
  iniciarProcessadorConfirmacoesReservaAgente();
  logarConfigWhatsapp();

  // Monitor de memoria — encerra WhatsApp se RSS passar do limite (default 700MB)
  const limiteMemoriaMB = Number(process.env.MEMORY_GUARD_MB ?? 700);
  setInterval(() => {
    const rssMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
    if (rssMB > limiteMemoriaMB) {
      console.warn(`[memory-guard] RSS=${rssMB}MB > ${limiteMemoriaMB}MB — encerrando WhatsApp`);
      void encerrarWhatsAppSeMemoriaAlta(rssMB);
    }
  }, 60000);

  if (WHATSAPP_AUTO_START) {
    console.log("[whatsapp] Inicializacao automatica habilitada.");
    iniciarWhatsApp();
  } else {
    console.log("[whatsapp] Inicializacao automatica desabilitada por WHATSAPP_AUTO_START=false.");
  }

  const asaasKey = (process.env.ASAAS_API_KEY ?? "").trim();
  const splitWalletId = (process.env.ASAAS_SPLIT_WALLET_ID ?? "").trim();
  const splitPercentual = (process.env.ASAAS_SPLIT_PERCENTUAL ?? "").trim();

  console.log("Asaas config:", {
    apiKey: asaasKey ? "SIM" : "NÃO",
    splitWalletId: splitWalletId
      ? `${splitWalletId.slice(0, 8)}...${splitWalletId.slice(-4)}`
      : "NÃO",
    splitPercentual: splitPercentual || "N/A",
  });

});
