import type { Request, Response } from "express";
import { criarReserva, type GrupoParticipacaoPayload } from "./reservas";
import { reservaContaParaOcupacao } from "./reservaStatus";
import { obterCamposRetencaoReservaNaAtualizacao } from "./reservaRetention";
import { enviarEmailConfirmacaoReserva } from "./emailReservas";
import { getDocs, collection, query, where, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { PerguntaPersonalizadaResposta } from "../types/perguntasPersonalizadas";
import {
  PaymentAttemptContext,
  PaymentIdempotencyKeyError,
  aguardarTentativaPagamento,
  concluirTentativaPagamento,
  iniciarTentativaPagamento,
  liberarTentativaPagamento,
  normalizarChaveIdempotenciaPagamento,
  renovarTentativaPagamento,
} from "./paymentIdempotency";

const PREFIXO_VAGAS_EXTRAS_GERAIS = "geral::";

const normalizarNumero = (valor: unknown) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.max(numero, 0) : 0;
};

const somarMapa = (mapa?: Record<string, number>) => {
  if (!mapa) return 0;
  return Object.values(mapa).reduce((total, valor) => total + normalizarNumero(valor), 0);
};

const normalizarMapa = (mapa?: Record<string, number>) => {
  if (!mapa) return undefined;
  return Object.fromEntries(
    Object.entries(mapa).map(([chave, valor]) => [chave, normalizarNumero(valor)])
  );
};

const normalizarIdadesPorTipo = (mapa?: Record<string, number[]>) => {
  if (!mapa || typeof mapa !== "object") return undefined;
  const normalizado: Record<string, number[]> = {};
  Object.entries(mapa).forEach(([chave, valores]) => {
    if (!Array.isArray(valores)) return;
    const idades = valores
      .map((valor) => Number(valor))
      .filter((valor) => Number.isFinite(valor) && valor >= 0 && valor <= 120);
    if (idades.length > 0) {
      normalizado[chave] = idades;
    }
  });
  return Object.keys(normalizado).length > 0 ? normalizado : undefined;
};

const normalizarGruposParticipacao = (grupos?: GrupoParticipacaoPayload[]) => {
  if (!Array.isArray(grupos)) return [];
  return grupos
    .map((grupo) => {
      const refId = grupo.refId?.toString().trim();
      const participantesPorTipo = normalizarMapa(grupo.participantesPorTipo) ?? {};
      const participantes = Math.max(
        somarMapa(participantesPorTipo),
        normalizarNumero(grupo.participantes)
      );
      const pacoteIds = Array.isArray(grupo.pacoteIds)
        ? grupo.pacoteIds
            .map((id) => id?.toString().trim())
            .filter((id): id is string => Boolean(id))
        : [];
      const idadesPorTipo = normalizarIdadesPorTipo(grupo.idadesPorTipo);
      return {
        tipo: grupo.tipo === "combo" ? "combo" : "pacote",
        refId,
        nome: grupo.nome?.toString().trim() || (grupo.tipo === "combo" ? "Combo" : "Pacote"),
        pacoteIds,
        participantesPorTipo,
        participantes,
        ...(idadesPorTipo ? { idadesPorTipo } : {}),
      };
    })
    .filter(
      (grupo): grupo is GrupoParticipacaoPayload =>
        Boolean(grupo.refId) && grupo.pacoteIds.length > 0 && grupo.participantes > 0
    );
};

const normalizarHorariosPorPacote = (horarios?: Record<string, string>) => {
  if (!horarios || typeof horarios !== "object") return {};
  return Object.fromEntries(
    Object.entries(horarios)
      .map(([pacoteId, horario]) => [pacoteId.toString().trim(), (horario ?? "").toString().trim()])
      .filter(([pacoteId, horario]) => Boolean(pacoteId) && Boolean(horario))
  );
};

const stripWrappingQuotes = (value: string) => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

const maskId = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`;
};

const parsePercentual = (raw: string | undefined, fallback: number) => {
  const cleaned = stripWrappingQuotes(raw ?? "")
    .trim()
    .replace("%", "")
    .trim()
    .replace(",", ".");
  if (!cleaned) return fallback;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 100);
};

type SplitConfig = {
  walletId: string;
  percentualValue: number;
};

const getSplitConfig = (): SplitConfig | null => {
  const walletId = stripWrappingQuotes(process.env.ASAAS_SPLIT_WALLET_ID ?? "");
  if (!walletId) return null;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(walletId)) {
    console.warn("[asaas] ASAAS_SPLIT_WALLET_ID inválido (esperado UUID).", {
      walletId: maskId(walletId),
    });
    return null;
  }

  const percentualValue = parsePercentual(
    process.env.ASAAS_SPLIT_PERCENTUAL,
    1
  );

  return { walletId, percentualValue };
};

const somenteNumeros = (valor?: string) => (valor ? valor.replace(/\D/g, "") : "");
const limparTexto = (valor?: string) => (typeof valor === "string" ? valor.trim() : "");
const normalizarAnoValidade = (valor?: string) => {
  const numeros = somenteNumeros(valor);
  if (!numeros) return "";
  if (numeros.length === 2) return `20${numeros}`;
  return numeros.slice(0, 4);
};

const normalizarTexto = (valor: string) =>
  valor
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const parseHorarioParaMinutos = (valor?: string | null) => {
  if (!valor) return null;
  const match = /(\d{1,2})(?:[:hH](\d{2}))?/.exec(valor.toString().trim());
  if (!match) return null;
  const horas = Number(match[1]);
  const minutos = match[2] ? Number(match[2]) : 0;
  if (!Number.isFinite(horas) || !Number.isFinite(minutos)) return null;
  if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) return null;
  return horas * 60 + minutos;
};

const buscarCobrancaAsaasPorReferencia = async (externalReference: string) => {
  const params = new URLSearchParams({
    externalReference,
    limit: "10",
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(
      `https://api.asaas.com/v3/payments?${params.toString()}`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          access_token: process.env.ASAAS_API_KEY!,
        },
        signal: controller.signal,
      }
    );
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        `Falha ao consultar cobranca existente no Asaas (HTTP ${response.status}).`
      );
    }

    const payments = Array.isArray(body?.data) ? body.data : [];
    if (payments.length > 1) {
      console.error("[asaas] Mais de uma cobranca para a mesma referencia externa.", {
        externalReference,
        paymentIds: payments.map((payment: any) => payment?.id).filter(Boolean),
      });
    }
    return payments[0] ?? null;
  } finally {
    clearTimeout(timeout);
  }
};

const normalizarVagasExtrasDisponibilidade = (mapa?: Record<string, unknown> | null) =>
  Object.entries(mapa ?? {}).reduce<Record<string, number>>((acc, [chave, valor]) => {
    const quantidade = normalizarNumero(valor);
    if (quantidade > 0) {
      acc[chave] = quantidade;
    }
    return acc;
  }, {});

const obterVagasExtrasDisponibilidade = ({
  dataStr,
  pacoteId,
  horario,
  vagasExtras,
}: {
  dataStr: string;
  pacoteId: string;
  horario?: string | null;
  vagasExtras?: Record<string, number> | null;
}) => {
  const extrasDiaGeral = normalizarNumero(
    vagasExtras?.[`${PREFIXO_VAGAS_EXTRAS_GERAIS}${dataStr}`]
  );
  const extrasHorarioGeral =
    horario && horario.trim()
      ? normalizarNumero(
          vagasExtras?.[
            `${PREFIXO_VAGAS_EXTRAS_GERAIS}${dataStr}::${horario.trim()}`
          ]
        )
      : 0;
  const extrasDia = normalizarNumero(vagasExtras?.[`${dataStr}-${pacoteId}`]);
  const extrasHorario =
    horario && horario.trim()
      ? normalizarNumero(vagasExtras?.[`${dataStr}-${pacoteId}-${horario.trim()}`])
      : 0;
  return extrasDiaGeral + extrasHorarioGeral + extrasDia + extrasHorario;
};

const calcularParticipantesReserva = (reserva: Record<string, any>) => {
  const participantesDeclarados = normalizarNumero(reserva.participantes);
  const participantesGrupos = normalizarGruposParticipacao(reserva.gruposParticipacao).reduce(
    (total, grupo) => total + grupo.participantes,
    0
  );
  const participantesMapa =
    reserva.participantesPorTipo && Object.keys(reserva.participantesPorTipo).length > 0
      ? somarMapa(reserva.participantesPorTipo)
      : 0;
  const base =
    participantesGrupos > 0
      ? participantesGrupos
      : participantesMapa > 0
      ? participantesMapa
      : normalizarNumero(reserva.adultos) +
        normalizarNumero(reserva.criancas) +
        normalizarNumero(reserva.bariatrica);
  const total = base + normalizarNumero(reserva.naoPagante);
  return Math.max(total, participantesDeclarados);
};

const obterPacoteIdsReserva = (
  reserva: Record<string, any>,
  pacotesPorNome: Map<string, string>
) => {
  if (Array.isArray(reserva.pacoteIds) && reserva.pacoteIds.length > 0) {
    return reserva.pacoteIds
      .map((id: unknown) => id?.toString())
      .filter((id: string | undefined): id is string => Boolean(id));
  }
  if (!reserva.atividade) return [];
  const atividadeNormalizada = normalizarTexto(reserva.atividade);
  const encontrados: string[] = [];
  pacotesPorNome.forEach((id, nomeNormalizado) => {
    if (atividadeNormalizada.includes(nomeNormalizado)) {
      encontrados.push(id);
    }
  });
  return encontrados;
};

const calcularParticipantesPorPacoteReserva = (
  reserva: Record<string, any>,
  pacotesPorNome: Map<string, string>
) => {
  const porPacote: Record<string, number> = {};
  const grupos = normalizarGruposParticipacao(reserva.gruposParticipacao);

  grupos.forEach((grupo) => {
    grupo.pacoteIds.forEach((pacoteId) => {
      porPacote[pacoteId] = (porPacote[pacoteId] ?? 0) + grupo.participantes;
    });
  });

  if (Object.keys(porPacote).length > 0) {
    return porPacote;
  }

  const participantes = calcularParticipantesReserva(reserva);
  if (participantes <= 0) return porPacote;
  obterPacoteIdsReserva(reserva, pacotesPorNome).forEach((pacoteId) => {
    porPacote[pacoteId] = (porPacote[pacoteId] ?? 0) + participantes;
  });
  return porPacote;
};

type CreditCardPayload = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

type CreditCardHolderInfo = {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  address: string;
  addressNumber: string;
  addressComplement?: string;
  province: string;
  city: string;
  state: string;
  phone: string;
};

export type CriarCobrancaPayload = {
  nome: string;
  email: string;
  valor: number;
  cpf: string;
  telefone: string;
  atividade: string;
  data: string;
  horario: string;
  participantes: number;
  adultos: number;
  bariatrica: number;
  criancas: number;
  naoPagante: number;
  participantesPorTipo?: Record<string, number>;
  gruposParticipacao?: GrupoParticipacaoPayload[];
  pacoteIds?: string[];
  comboId?: string | null;
  horariosPorPacote?: Record<string, string>;
  billingType: "PIX" | "CREDIT_CARD";
  creditCard?: CreditCardPayload;
  creditCardHolderInfo?: CreditCardHolderInfo;
  cartaoTitularNomeCompleto?: string;
  cartaoTitularNascimento?: string;
  temPet?: boolean;
  perguntasPersonalizadas?: PerguntaPersonalizadaResposta[];
};

export type CriarCobrancaResponse = {
  status: string;
  cobranca?: {
    id: string;
    status: string;
    invoiceUrl?: string;
  };
  error?: any;
};

export async function criarCobrancaHandler(req: Request, res: Response): Promise<void> {
  const {
    nome,
    email,
    valor,
    cpf,
    telefone,
    atividade,
    data,
    horario,
    participantes,
    adultos,
    bariatrica,
    criancas,
    naoPagante,
    participantesPorTipo,
    gruposParticipacao,
    pacoteIds,
    comboId,
    horariosPorPacote,
    billingType,
    creditCard,
    creditCardHolderInfo,
    cartaoTitularNomeCompleto,
    cartaoTitularNascimento,
    temPet,
    perguntasPersonalizadas,
} = req.body as CriarCobrancaPayload;

  const horarioFormatado = horario?.toString().trim();
  const participantesPorTipoNormalizado = normalizarMapa(participantesPorTipo);
  const gruposParticipacaoNormalizados = normalizarGruposParticipacao(gruposParticipacao);
  const participantesGrupos = gruposParticipacaoNormalizados.reduce(
    (total, grupo) => total + grupo.participantes,
    0
  );
  const horariosPorPacoteNormalizado = normalizarHorariosPorPacote(horariosPorPacote);
  const mapaAtivo =
    participantesPorTipoNormalizado &&
    Object.keys(participantesPorTipoNormalizado).length > 0;
  const participantesCalculadosBase = mapaAtivo
    ? somarMapa(participantesPorTipoNormalizado)
    : (adultos ?? 0) + (criancas ?? 0) + (bariatrica ?? 0);
  const participantesCalculados = participantesCalculadosBase + (naoPagante ?? 0);
  const participantesConsiderados = Math.max(
    participantesGrupos + (naoPagante ?? 0),
    participantesCalculados,
    Number.isFinite(participantes) ? participantes : 0
  );
  const pacoteIdsNormalizados = Array.isArray(pacoteIds)
    ? pacoteIds
        .map((id) => id?.toString())
        .filter((id): id is string => Boolean(id))
    : [];
  const comboIdNormalizado = comboId ? comboId.toString() : null;
  const pacoteIdsDosGrupos = Array.from(
    new Set(gruposParticipacaoNormalizados.flatMap((grupo) => grupo.pacoteIds))
  );
  const participantesPorPacoteSolicitados = gruposParticipacaoNormalizados.reduce<Record<string, number>>(
    (mapa, grupo) => {
      grupo.pacoteIds.forEach((pacoteId) => {
        mapa[pacoteId] = (mapa[pacoteId] ?? 0) + grupo.participantes;
      });
      return mapa;
    },
    {}
  );

  if (Object.keys(participantesPorPacoteSolicitados).length === 0) {
    pacoteIdsNormalizados.forEach((pacoteId) => {
      participantesPorPacoteSolicitados[pacoteId] = participantesConsiderados;
    });
  }

  console.log("INFO Dados recebidos:", {
    nome: limparTexto(nome),
    email: limparTexto(email),
    atividade: limparTexto(atividade),
    data,
    horario: horarioFormatado,
    participantes: participantesConsiderados,
    billingType,
  });

  // Debug detalhado dos campos
  const camposFaltando = [];
  if (!nome) camposFaltando.push('nome');
  if (!email) camposFaltando.push('email');
  if (!valor) camposFaltando.push('valor');
  if (!cpf) camposFaltando.push('cpf');
  if (!telefone) camposFaltando.push('telefone');
  if (!atividade) camposFaltando.push('atividade');
  if (!data) camposFaltando.push('data');
  if (!horarioFormatado) camposFaltando.push('horario');
  if (participantesConsiderados <= 0) camposFaltando.push('participantes');
  if (!billingType) camposFaltando.push('billingType');

  if (camposFaltando.length > 0) {
    console.log("❌ Campos faltando:", camposFaltando);
    res.status(400).json({
      status: "erro",
      error: `Dados incompletos. Campos faltando: ${camposFaltando.join(', ')}`,
      camposFaltando
    });
    return;
  }

  if (!["PIX", "CREDIT_CARD"].includes(billingType)) {
    res.status(400).json({
      status: "erro",
      error: "Forma de pagamento inválida. Use 'PIX' ou 'CREDIT_CARD'.",
    });
    return;
  }

  // Validar CPF
  const cpfLimpo = somenteNumeros(cpf);
  if (cpfLimpo.length !== 11) {
    res.status(400).json({
      status: "erro",
      error: "CPF deve ter 11 dígitos.",
    });
    return;
  }

  // Validar telefone
  const telefoneLimpo = somenteNumeros(telefone);
  if (telefoneLimpo.length < 10) {
    res.status(400).json({
      status: "erro",
      error: "Telefone deve ter pelo menos 10 dígitos.",
    });
    return;
  }

  const creditCardNormalizado = creditCard
    ? {
        holderName: limparTexto(creditCard.holderName),
        number: somenteNumeros(creditCard.number),
        expiryMonth: somenteNumeros(creditCard.expiryMonth).padStart(2, "0"),
        expiryYear: normalizarAnoValidade(creditCard.expiryYear),
        ccv: somenteNumeros(creditCard.ccv),
      }
    : undefined;

  // O Asaas aceita 'state' e 'addressState' como alias — enviamos ambos por seguranca.
  const ufNormalizada = limparTexto(creditCardHolderInfo?.state).toUpperCase();
  const creditCardHolderNormalizado = creditCardHolderInfo
    ? {
        name: limparTexto(creditCardHolderInfo.name) || limparTexto(nome),
        email: limparTexto(creditCardHolderInfo.email) || limparTexto(email),
        cpfCnpj: somenteNumeros(creditCardHolderInfo.cpfCnpj || cpfLimpo),
        postalCode: somenteNumeros(creditCardHolderInfo.postalCode),
        address: limparTexto(creditCardHolderInfo.address),
        addressNumber: limparTexto(creditCardHolderInfo.addressNumber),
        addressComplement: limparTexto(creditCardHolderInfo.addressComplement) || undefined,
        province: limparTexto(creditCardHolderInfo.province),
        city: limparTexto(creditCardHolderInfo.city),
        state: ufNormalizada,
        addressState: ufNormalizada,
        phone: somenteNumeros(creditCardHolderInfo.phone || telefoneLimpo),
        mobilePhone: somenteNumeros(creditCardHolderInfo.phone || telefoneLimpo),
      }
    : undefined;

  if (billingType === "CREDIT_CARD") {
    const camposCartaoFaltando: string[] = [];
    if (!creditCardNormalizado) {
      camposCartaoFaltando.push("creditCard");
    } else {
      if (!creditCardNormalizado.holderName) camposCartaoFaltando.push("creditCard.holderName");
      if (!creditCardNormalizado.number) camposCartaoFaltando.push("creditCard.number");
      if (!creditCardNormalizado.expiryMonth) camposCartaoFaltando.push("creditCard.expiryMonth");
      if (!creditCardNormalizado.expiryYear) camposCartaoFaltando.push("creditCard.expiryYear");
      if (!creditCardNormalizado.ccv) camposCartaoFaltando.push("creditCard.ccv");
      const mes = Number(creditCardNormalizado.expiryMonth);
      if (!Number.isFinite(mes) || mes < 1 || mes > 12) {
        camposCartaoFaltando.push("creditCard.expiryMonth");
      }
      if (creditCardNormalizado.number.length < 13) {
        camposCartaoFaltando.push("creditCard.number");
      }
      if (creditCardNormalizado.ccv.length < 3) {
        camposCartaoFaltando.push("creditCard.ccv");
      }
    }

    if (!creditCardHolderNormalizado) {
      camposCartaoFaltando.push("creditCardHolderInfo");
    } else {
      if (!creditCardHolderNormalizado.name) camposCartaoFaltando.push("creditCardHolderInfo.name");
      if (!creditCardHolderNormalizado.email) camposCartaoFaltando.push("creditCardHolderInfo.email");
      if (!creditCardHolderNormalizado.cpfCnpj) camposCartaoFaltando.push("creditCardHolderInfo.cpfCnpj");
      if (!creditCardHolderNormalizado.postalCode) {
        camposCartaoFaltando.push("creditCardHolderInfo.postalCode");
      }
      if (!creditCardHolderNormalizado.address) camposCartaoFaltando.push("creditCardHolderInfo.address");
      if (!creditCardHolderNormalizado.addressNumber) {
        camposCartaoFaltando.push("creditCardHolderInfo.addressNumber");
      }
      if (!creditCardHolderNormalizado.province) {
        camposCartaoFaltando.push("creditCardHolderInfo.province");
      }
      if (!creditCardHolderNormalizado.city) camposCartaoFaltando.push("creditCardHolderInfo.city");
      if (!creditCardHolderNormalizado.state || creditCardHolderNormalizado.state.length !== 2) {
        camposCartaoFaltando.push("creditCardHolderInfo.state");
      }
      if (!creditCardHolderNormalizado.phone) camposCartaoFaltando.push("creditCardHolderInfo.phone");
    }

    if (camposCartaoFaltando.length > 0) {
      res.status(400).json({
        status: "erro",
        error: "Dados do cartao incompletos.",
        camposFaltando: camposCartaoFaltando,
      });
      return;
    }
  }

  // Impedir reservas em horários que já passaram no dia atual (horário de São Paulo)
  let idempotencyKey: string;
  try {
    idempotencyKey = normalizarChaveIdempotenciaPagamento(
      req.get("Idempotency-Key")
    );
  } catch (error) {
    const message =
      error instanceof PaymentIdempotencyKeyError
        ? error.message
        : "Idempotency-Key invalida.";
    res.status(400).json({
      status: "erro",
      code: "INVALID_IDEMPOTENCY_KEY",
      error: message,
    });
    return;
  }

  const minutosSelecionados = parseHorarioParaMinutos(horarioFormatado);
  if (minutosSelecionados !== null) {
    const hojeSp = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
    }).format(new Date());
    if (data === hojeSp) {
      const horarioAtualSp = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      const [horaAtualStr, minutoAtualStr] = horarioAtualSp.split(":");
      const minutosAtual =
        Number(horaAtualStr) * 60 + Number(minutoAtualStr);

      if (
        Number.isFinite(minutosAtual) &&
        minutosSelecionados < minutosAtual
      ) {
        res.status(400).json({
          status: "erro",
          error:
            "O horário selecionado já passou para hoje. Escolha outro horário.",
        });
        return;
      }
    }
  }

  let paymentAttempt: PaymentAttemptContext | null = null;
  let paymentCreationStarted = false;

  try {
    const disponibilidadeRef = doc(db, "disponibilidade", data);
    const disponibilidadeSnap = await getDoc(disponibilidadeRef);
    const disponibilidadeDados = disponibilidadeSnap.exists() ? disponibilidadeSnap.data() : null;
    if (disponibilidadeDados?.fechado) {
      res.status(400).json({
        status: "erro",
        error: "Este dia não está aceitando reservas no momento. Escolha outra data.",
      });
      return;
    }

    const disponibilidadeHorarios =
      disponibilidadeDados && typeof disponibilidadeDados.horarios === "object"
        ? (disponibilidadeDados.horarios as Record<string, boolean>)
        : null;
    const disponibilidadeVagasExtras = normalizarVagasExtrasDisponibilidade(
      disponibilidadeDados && typeof disponibilidadeDados.vagasExtras === "object"
        ? (disponibilidadeDados.vagasExtras as Record<string, unknown>)
        : null
    );

    // Validar limite por pacote (por horário ou por dia)
    const pacotesSnapshot = await getDocs(collection(db, "pacotes"));
    const pacotesPorId = new Map<
      string,
      { nome: string; limite: number; modoHorario?: string; horarios: string[] }
    >();
    const pacotesPorNome = new Map<string, string>();

    pacotesSnapshot.forEach((docSnap) => {
      const dataPacote = docSnap.data() as Record<string, any>;
      const limite = Number(dataPacote.limite ?? 0);
      const nome = dataPacote.nome?.toString() ?? "";
      const modoHorario = dataPacote.modoHorario?.toString();
      const horarios = Array.isArray(dataPacote.horarios)
        ? dataPacote.horarios.map((h: unknown) => (h ?? "").toString()).filter(Boolean)
        : [];
      pacotesPorId.set(docSnap.id, {
        nome,
        limite: Number.isFinite(limite) ? limite : 0,
        modoHorario,
        horarios,
      });
      if (nome) {
        pacotesPorNome.set(normalizarTexto(nome), docSnap.id);
      }
    });

    const pacoteIdsSelecionados = Array.from(
      new Set(
        pacoteIdsNormalizados.length > 0 || pacoteIdsDosGrupos.length > 0
          ? [...pacoteIdsNormalizados, ...pacoteIdsDosGrupos]
          : obterPacoteIdsReserva({ atividade }, pacotesPorNome)
      )
    );

    if (pacoteIdsSelecionados.length > 0) {
      const reservasQuery = query(
        collection(db, "reservas"),
        where("data", "==", data)
      );
      const snapshot = await getDocs(reservasQuery);
      const reservasPorPacoteHorario: Record<string, number> = {};
      const reservasPorPacoteDia: Record<string, number> = {};

      snapshot.forEach((docSnap) => {
        const dados = docSnap.data() as Record<string, any>;
        if (!reservaContaParaOcupacao(dados)) return;
        const horarioReserva = (dados.horario ?? dados.Horario ?? "")
          .toString()
          .trim();
        const horariosReserva = normalizarHorariosPorPacote(dados.horariosPorPacote);
        const participantesPorPacoteReserva = calcularParticipantesPorPacoteReserva(
          dados,
          pacotesPorNome
        );
        Object.entries(participantesPorPacoteReserva).forEach(([pacoteId, participantesReserva]) => {
          if (participantesReserva <= 0) return;
          const horarioPacoteReserva = (horariosReserva[pacoteId] ?? horarioReserva)
            .toString()
            .trim();
          reservasPorPacoteDia[pacoteId] =
            (reservasPorPacoteDia[pacoteId] ?? 0) + participantesReserva;
          if (horarioPacoteReserva) {
            const chaveHorario = `${pacoteId}__${horarioPacoteReserva}`;
            reservasPorPacoteHorario[chaveHorario] =
              (reservasPorPacoteHorario[chaveHorario] ?? 0) + participantesReserva;
          }
        });
      });

      for (const pacoteId of pacoteIdsSelecionados) {
        const pacoteInfo = pacotesPorId.get(pacoteId);
        const limite = Number(pacoteInfo?.limite ?? 0);
        const horarioPacote = horariosPorPacoteNormalizado[pacoteId] ?? horarioFormatado;
        const participantesSolicitados =
          participantesPorPacoteSolicitados[pacoteId] ?? 0;

        if (participantesSolicitados <= 0) {
          res.status(400).json({
            status: "erro",
            error: `Informe participantes para o pacote ${pacoteInfo?.nome ?? "selecionado"} ou remova este pacote da reserva.`,
          });
          return;
        }

        if (!Number.isFinite(limite) || limite <= 0) continue;
        const ehFaixa =
          pacoteInfo?.modoHorario === "intervalo" ||
          (pacoteInfo?.horarios?.length ?? 0) === 0;

        if (!ehFaixa && (pacoteInfo?.horarios?.length ?? 0) > 0) {
          if (!pacoteInfo!.horarios.includes(horarioPacote ?? "")) {
            res.status(400).json({
              status: "erro",
              error: `O pacote ${pacoteInfo?.nome ?? "selecionado"} não possui o horário ${horarioPacote}.`,
            });
            return;
          }
          const chave = `${data}-${pacoteId}-${horarioPacote}`;
          if (disponibilidadeHorarios && disponibilidadeHorarios[chave] === false) {
            res.status(400).json({
              status: "erro",
              error: `O horário ${horarioPacote} está indisponível para o pacote ${pacoteInfo?.nome ?? "selecionado"} nesta data.`,
            });
            return;
          }
        }

        const reservados = ehFaixa
          ? reservasPorPacoteDia[pacoteId] ?? 0
          : reservasPorPacoteHorario[`${pacoteId}__${horarioPacote}`] ?? 0;
        const vagasExtras = obterVagasExtrasDisponibilidade({
          dataStr: data,
          pacoteId,
          horario: ehFaixa ? undefined : horarioPacote,
          vagasExtras: disponibilidadeVagasExtras,
        });
        const restante = limite + vagasExtras - reservados;
        if (participantesSolicitados > restante) {
          res.status(400).json({
            status: "erro",
            error: `Limite do pacote ${pacoteInfo?.nome ?? "selecionado"} atingido para ${ehFaixa ? "esta data" : "o horário escolhido"}. Restam apenas ${Math.max(
              restante,
              0
            )} vaga(s).`,
          });
          return;
        }
      }
    } else {
      console.warn(
        "[limite] Pacotes nao informados para validar limite por horario."
      );
    }

    // ✅ Criar reserva no Firebase
    console.log("💾 Criando reserva no Firebase...");
    let claim;
    try {
      claim = await iniciarTentativaPagamento(idempotencyKey, req.body);
    } catch (error) {
      console.error("[pagamento] Protecao de idempotencia indisponivel:", error);
      res.status(503).json({
        status: "erro",
        code: "PAYMENT_IDEMPOTENCY_UNAVAILABLE",
        error:
          "Nao foi possivel iniciar o pagamento com seguranca. Tente novamente em instantes.",
      });
      return;
    }

    if (claim.type === "conflict") {
      res.status(409).json({
        status: "erro",
        code: "IDEMPOTENCY_KEY_REUSED",
        error:
          "Os dados desta tentativa foram alterados enquanto um pagamento anterior ainda pode estar em andamento. Por seguranca, nenhuma nova cobranca foi enviada.",
      });
      return;
    }

    if (claim.type === "replay") {
      res.set("Idempotent-Replayed", "true");
      res.status(claim.response.httpStatus).json(claim.response.body);
      return;
    }

    if (claim.type === "in_progress") {
      const completed = await aguardarTentativaPagamento(
        claim.documentId,
        claim.requestHash
      );
      if (completed) {
        res.set("Idempotent-Replayed", "true");
        res.status(completed.httpStatus).json(completed.body);
        return;
      }

      res.set("Retry-After", "5");
      res.status(409).json({
        status: "processando",
        code: "PAYMENT_IN_PROGRESS",
        error:
          "Este pagamento ja esta sendo processado. Aguarde alguns segundos antes de consultar novamente.",
      });
      return;
    }

    paymentAttempt = claim.context;
    const reservaId = await criarReserva({
      reservaId: paymentAttempt.reservaId,
      nome,
      cpf,
      email,
      telefone,
      atividade,
      valor,
      data,
      participantes: participantesConsiderados,
      adultos,
      bariatrica,
      criancas,
      naoPagante,
      participantesPorTipo: participantesPorTipoNormalizado,
      gruposParticipacao: gruposParticipacaoNormalizados,
      pacoteIds: pacoteIdsNormalizados,
      comboId: comboIdNormalizado,
      observacao: "",
      horario: horarioFormatado,
      horariosPorPacote: horariosPorPacoteNormalizado,
      status: "aguardando",
      temPet,
      perguntasPersonalizadas,
    });
    console.log("✅ Reserva criada com ID:", reservaId);

    const dataHoje = new Date().toISOString().split("T")[0];
    const splitConfig = getSplitConfig();
    let cobrancaData: any = await buscarCobrancaAsaasPorReferencia(reservaId);

    if (cobrancaData) {
      console.warn("[asaas] Reutilizando cobranca ja existente.", {
        paymentId: cobrancaData.id,
        externalReference: reservaId,
      });
    } else {
      // Verificar se o cliente ja existe no Asaas (pelo CPF).
      const customerSearch = await fetch(
        `https://api.asaas.com/v3/customers?cpfCnpj=${cpfLimpo}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            access_token: process.env.ASAAS_API_KEY!,
          },
        }
      );
      const customerSearchData = await customerSearch.json().catch(() => ({}));
      if (!customerSearch.ok) {
        throw new Error(
          `Falha ao consultar cliente no Asaas (HTTP ${customerSearch.status}).`
        );
      }

      let customerId: string | null = null;
      if (customerSearchData?.data?.length > 0) {
        customerId = customerSearchData.data[0].id;
        console.log("Cliente encontrado:", customerId);
      } else {
        const customerPayload = {
          name: nome,
          email,
          cpfCnpj: cpfLimpo,
          phone: telefoneLimpo,
          notificationDisabled: true,
        };
        const customerCreate = await fetch("https://api.asaas.com/v3/customers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            access_token: process.env.ASAAS_API_KEY!,
          },
          body: JSON.stringify(customerPayload),
        });
        const customerData = await customerCreate.json().catch(() => ({}));

        if (!customerCreate.ok) {
          const errorResponse = {
            status: "erro",
            error:
              customerData.errors?.[0]?.description || "Erro ao criar cliente",
            details: customerData,
          };
          await concluirTentativaPagamento(paymentAttempt, {
            httpStatus: 400,
            body: errorResponse,
          });
          res.status(400).json(errorResponse);
          return;
        }

        customerId = customerData.id;
        console.log("Cliente criado:", customerId);
      }

      const paymentPayload: Record<string, unknown> = {
        billingType,
        customer: customerId,
        value: valor,
        dueDate: dataHoje,
        description: `Cobranca de ${nome}`,
        externalReference: reservaId,
      };

      if (splitConfig) {
        paymentPayload.split = [splitConfig];
      }

      if (
        billingType === "CREDIT_CARD" &&
        creditCardNormalizado &&
        creditCardHolderNormalizado
      ) {
        paymentPayload.creditCard = creditCardNormalizado;
        paymentPayload.creditCardHolderInfo = creditCardHolderNormalizado;
      }

      console.log("INFO Criando pagamento no Asaas:", {
        billingType,
        customer: customerId,
        value: valor,
        dueDate: dataHoje,
        externalReference: reservaId,
        hasCreditCard: billingType === "CREDIT_CARD",
        split: splitConfig
          ? {
              walletId: maskId(splitConfig.walletId),
              percentualValue: splitConfig.percentualValue,
            }
          : null,
      });

      // Uma instancia que perdeu o lease nao pode chegar ao POST financeiro.
      await renovarTentativaPagamento(paymentAttempt);
      paymentCreationStarted = true;
      const paymentController = new AbortController();
      const paymentTimeout = setTimeout(() => paymentController.abort(), 30_000);
      let paymentResponse: Awaited<ReturnType<typeof fetch>>;
      try {
        paymentResponse = await fetch("https://api.asaas.com/v3/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            access_token: process.env.ASAAS_API_KEY!,
          },
          body: JSON.stringify(paymentPayload),
          signal: paymentController.signal,
        });
        cobrancaData = await paymentResponse.json().catch(() => ({}));
      } finally {
        clearTimeout(paymentTimeout);
      }

      if (!paymentResponse.ok) {
        const errorResponse = {
          status: "erro",
          error:
            cobrancaData.errors?.[0]?.description ||
            cobrancaData.message ||
            "Erro ao criar cobranca",
          details: cobrancaData,
        };
        await concluirTentativaPagamento(paymentAttempt, {
          httpStatus: 400,
          body: errorResponse,
        });
        res.status(400).json(errorResponse);
        return;
      }
    }

    const splitRetornado =
      Array.isArray(cobrancaData?.split) && cobrancaData.split.length > 0;
    console.log("INFO Resposta do Asaas:", {
      id: cobrancaData.id,
      status: cobrancaData.status,
      billingType: cobrancaData.billingType ?? billingType,
      invoiceUrl: cobrancaData.invoiceUrl,
      value: cobrancaData.value,
      splitRetornado,
    });

    if (splitConfig && !splitRetornado) {
      console.warn("[asaas] Cobrança criada sem split retornado pela API.", {
        paymentId: cobrancaData?.id,
        externalReference: reservaId,
        split: {
          walletId: maskId(splitConfig.walletId),
          percentualValue: splitConfig.percentualValue,
        },
      });
    }

    if (billingType === "CREDIT_CARD" && !cobrancaData.invoiceUrl) {
      console.warn("⚠️ Invoice URL não retornada para cartão de crédito");
    }

    if (!cobrancaData?.id) {
      throw new Error("O Asaas nao retornou o identificador da cobranca.");
    }

    await updateDoc(doc(db, "reservas", reservaId), {
      asaasPaymentId: cobrancaData.id,
      formaPagamento: billingType,
    });

    const statusPagamento = String(cobrancaData.status ?? "").toUpperCase();
    const pagamentoConfirmado = ["CONFIRMED", "RECEIVED", "PAID"].includes(statusPagamento);

    if (pagamentoConfirmado) {
      try {
        const reservaRef = doc(db, "reservas", reservaId);
        const reservaSnap = await getDoc(reservaRef);
        const reservaExistente = reservaSnap.exists()
          ? (reservaSnap.data() as Record<string, any>)
          : {};
        await updateDoc(reservaRef, {
          status: "pago",
          confirmada: true,
          dataPagamento: new Date(),
          ...obterCamposRetencaoReservaNaAtualizacao({
            status: "pago",
            confirmada: true,
            criadoEm: reservaExistente.criadoEm,
          }),
        });

        const resultadoEmail = await enviarEmailConfirmacaoReserva(reservaId, {
          nome,
          email,
          telefone,
          atividade,
          data,
          horario: horarioFormatado,
          participantes: participantesConsiderados,
          valor,
          status: "pago",
        }, reservaRef);

        if (!resultadoEmail.enviado) {
          console.warn(
            `Email imediato nao enviado para ${reservaId}: ${resultadoEmail.motivo}`,
          );
        }
      } catch (error) {
        console.error("Erro ao enviar email imediato:", error);
      }
    }

    // ✅ Resposta de sucesso
    const resposta: any = {
      status: "ok",
      cobranca: {
        id: cobrancaData.id,
        status: cobrancaData.status,
        invoiceUrl: cobrancaData.invoiceUrl || null,
      },
    };

    console.log("💳 Dados da cobrança criada:", {
      id: cobrancaData.id,
      status: cobrancaData.status,
      billingType: cobrancaData.billingType,
      invoiceUrl: cobrancaData.invoiceUrl,
      value: cobrancaData.value
    });

    // Adicionar dados do PIX: buscar QR code via endpoint dedicado
    if (billingType === "PIX" && cobrancaData.id) {
      try {
        const pixQrCodeResponse = await fetch(
          `https://api.asaas.com/v3/payments/${cobrancaData.id}/pixQrCode`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              access_token: process.env.ASAAS_API_KEY!,
            },
          }
        );
        if (pixQrCodeResponse.ok) {
          const pixData = await pixQrCodeResponse.json();
          console.log("INFO PIX QR Code obtido:", {
            hasPayload: Boolean(pixData?.payload),
            hasImage: Boolean(pixData?.encodedImage),
            expirationDate: pixData?.expirationDate,
          });
          resposta.cobranca.pixKey = pixData.payload || null;
          resposta.cobranca.qrCodeImage = pixData.encodedImage
            ? `data:image/png;base64,${pixData.encodedImage}`
            : null;
          resposta.cobranca.expirationDate = pixData.expirationDate || null;
        } else {
          console.warn("⚠️ Não foi possível obter o QR Code PIX:", pixQrCodeResponse.status);
        }
      } catch (pixError) {
        console.error("⚠️ Erro ao buscar QR Code PIX:", pixError);
      }
    }

    await concluirTentativaPagamento(
      paymentAttempt,
      { httpStatus: 200, body: resposta },
      cobrancaData.id
    );
    console.log("✅ Resposta enviada:", resposta);
    res.status(200).json(resposta);
  } catch (error) {
    console.error("🔥 Erro inesperado ao criar cobrança:", error);
    if (paymentAttempt) {
      try {
        // Depois que o POST ao adquirente comecou, uma falha de rede e ambigua:
        // aguardamos antes de liberar a chave para dar tempo de a consulta por
        // externalReference encontrar uma cobranca que possa ter sido criada.
        await liberarTentativaPagamento(
          paymentAttempt,
          paymentCreationStarted ? 5 * 60_000 : 0
        );
      } catch (releaseError) {
        console.error("[pagamento] Falha ao liberar tentativa:", releaseError);
      }
    }
    res.status(500).json({
      status: "erro",
      code: "PAYMENT_PROCESSING_ERROR",
      error: "Erro interno ao processar a cobrança.",
    });
  }
}
