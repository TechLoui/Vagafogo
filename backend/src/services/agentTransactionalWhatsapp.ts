import { requestAgentService } from "./agentGateway";
import type { ResultadoEnvio } from "./whatsapp";
import { normalizarDataDisparo } from "./whatsappDispatchDate";

const normalizePhone = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
};

type OpcoesMensagemTransacional = {
  dataLimite?: unknown;
  tipoDisparo?: unknown;
};

export const enviarMensagemTransacionalPeloAgente = async (
  telefoneInformado: unknown,
  mensagemInformada: unknown,
  requestId: string,
  nomeContato?: unknown,
  opcoes?: OpcoesMensagemTransacional,
): Promise<ResultadoEnvio> => {
  const telefone = normalizePhone(telefoneInformado);
  const mensagem = String(mensagemInformada ?? "").trim().slice(0, 4096);
  if (!telefone) return { enviado: false, motivo: "telefone_invalido" };
  if (!mensagem) return { enviado: false, motivo: "mensagem_vazia", telefone };
  const dataLimite = opcoes?.dataLimite === undefined
    ? ""
    : normalizarDataDisparo(opcoes.dataLimite);
  if (opcoes?.dataLimite !== undefined && !dataLimite) {
    return { enviado: false, motivo: "data_disparo_invalida", telefone };
  }

  const response = await requestAgentService("gateway", "/api/whatsapp/transactional-send", {
    method: "POST",
    body: {
      phone: telefone,
      text: mensagem,
      requestId: String(requestId ?? "").trim().slice(0, 160),
      contactName: String(nomeContato ?? "").trim().slice(0, 120),
      ...(dataLimite ? { notAfterDate: dataLimite } : {}),
      ...(opcoes?.tipoDisparo ? { dispatchKind: String(opcoes.tipoDisparo).trim().slice(0, 80) } : {}),
    },
    timeoutMs: 30_000,
  });
  const body = response.body && typeof response.body === "object"
    ? response.body as Record<string, unknown>
    : {};
  if (response.status >= 300 || body.ok !== true) {
    return {
      enviado: false,
      motivo: String(body.error ?? `AGENT_GATEWAY_HTTP_${response.status}`),
      retryAfterMs: body.error === "DISPATCH_PACED" ? Number(body.retryAfterMs ?? 60_000) : undefined,
      telefone,
    };
  }
  return {
    enviado: true,
    mensagem,
    telefone,
    messageId: body.messageId ? String(body.messageId) : undefined,
    jid: body.jid ? String(body.jid) : undefined,
  };
};

