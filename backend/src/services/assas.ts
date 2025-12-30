import type { Request, Response } from "express";
import { criarReserva } from "./reservas";
import { getDocs, collection, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { PerguntaPersonalizadaResposta } from "../types/perguntasPersonalizadas";

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
  billingType: "PIX" | "CREDIT_CARD";
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
    billingType,
    temPet,
    perguntasPersonalizadas,
} = req.body as CriarCobrancaPayload;

  console.log("📥 Dados recebidos:", req.body);

  const horarioFormatado = horario?.toString().trim();
  const participantesPorTipoNormalizado = normalizarMapa(participantesPorTipo);
  const mapaAtivo =
    participantesPorTipoNormalizado &&
    Object.keys(participantesPorTipoNormalizado).length > 0;
  const participantesCalculadosBase = mapaAtivo
    ? somarMapa(participantesPorTipoNormalizado)
    : (adultos ?? 0) + (criancas ?? 0) + (bariatrica ?? 0);
  const participantesCalculados = participantesCalculadosBase + (naoPagante ?? 0);
  const participantesConsiderados = Math.max(
    participantesCalculados,
    Number.isFinite(participantes) ? participantes : 0
  );

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
  const cpfLimpo = cpf.replace(/\D/g, '');
  if (cpfLimpo.length !== 11) {
    res.status(400).json({
      status: "erro",
      error: "CPF deve ter 11 dígitos.",
    });
    return;
  }

  // Validar telefone
  const telefoneLimpo = telefone.replace(/\D/g, '');
  if (telefoneLimpo.length < 10) {
    res.status(400).json({
      status: "erro",
      error: "Telefone deve ter pelo menos 10 dígitos.",
    });
    return;
  }

  // Impedir reservas em horários que já passaram no dia atual (horário de São Paulo)
  const horarioMatch = /^(\d{1,2}):(\d{2})$/.exec(horarioFormatado ?? "");
  if (horarioMatch) {
    const [_, horaStr, minutoStr] = horarioMatch;
    const minutosSelecionados = Number(horaStr) * 60 + Number(minutoStr);
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
        Number.isFinite(minutosSelecionados) &&
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

  try {
    const disponibilidadeRef = doc(db, "disponibilidade", data);
    const disponibilidadeSnap = await getDoc(disponibilidadeRef);
    if (disponibilidadeSnap.exists()) {
      const disponibilidadeDados = disponibilidadeSnap.data();
      if (disponibilidadeDados?.fechado) {
        res.status(400).json({
          status: "erro",
          error: "Este dia não está aceitando reservas no momento. Escolha outra data.",
        });
        return;
      }
    }
    // 🔍 Verificar disponibilidade no Firebase
    const reservasQuery = query(
      collection(db, "reservas"),
      where("Data", "==", data),
      where("Horario", "==", horarioFormatado)
    );

    const snapshot = await getDocs(reservasQuery);

    let totalReservados = 0;
    snapshot.forEach((doc) => {
      const dados = doc.data();
      const participantesReserva = Number(
        dados.participantes ?? dados.Participantes ?? 0
      );
      totalReservados += Number.isFinite(participantesReserva)
        ? participantesReserva
        : 0;
    });

    if (totalReservados + participantesConsiderados > 30) {
      res.status(400).json({
        status: "erro",
        error: "Limite de 30 pessoas por horário atingido. Escolha outro horário.",
      });
      return;
    }

    // ✅ Criar reserva no Firebase
    console.log("💾 Criando reserva no Firebase...");
    const reservaId = await criarReserva({
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
      observacao: "",
      horario: horarioFormatado,
      status: "aguardando",
      temPet,
      perguntasPersonalizadas,
    });
    console.log("✅ Reserva criada com ID:", reservaId);

    const dataHoje = new Date().toISOString().split("T")[0];

    // 🔍 Verificar se o cliente já existe no Asaas (pelo CPF)
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

    const customerSearchData = await customerSearch.json();
    let customerId: string | null = null;

    if (customerSearchData?.data?.length > 0) {
      customerId = customerSearchData.data[0].id;
      console.log("🔁 Cliente encontrado:", customerId);
    } else {
      // 👤 Criar novo cliente
      const customerPayload = {
        name: nome,
        email,
        cpfCnpj: cpfLimpo,
        phone: telefoneLimpo,
        notificationDisabled: true,
      };
      
      console.log("👤 Criando cliente:", customerPayload);
      
      const customerCreate = await fetch("https://api.asaas.com/v3/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: process.env.ASAAS_API_KEY!,
        },
        body: JSON.stringify(customerPayload),
      });

      const customerData = await customerCreate.json();
      console.log("👤 Resposta criação cliente:", customerData);

      if (!customerCreate.ok) {
        console.error("❌ Erro ao criar cliente no Asaas:", {
          status: customerCreate.status,
          data: customerData
        });
        res.status(400).json({ 
          status: "erro", 
          error: customerData.errors?.[0]?.description || "Erro ao criar cliente",
          details: customerData 
        });
        return;
      }

      customerId = customerData.id;
      console.log("🆕 Cliente criado:", customerId);
    }

    // 💰 Criar pagamento com o customer correto
    const paymentPayload = {
      billingType,
      customer: customerId,
      value: valor,
      dueDate: dataHoje,
      description: `Cobrança de ${nome}`,
      externalReference: reservaId,
    };
    
    console.log("💰 Criando pagamento no Asaas:", paymentPayload);
    
    const paymentResponse = await fetch("https://api.asaas.com/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        access_token: process.env.ASAAS_API_KEY!,
      },
      body: JSON.stringify(paymentPayload),
    });

    const cobrancaData = await paymentResponse.json();
    console.log("💵 Resposta do Asaas:", JSON.stringify(cobrancaData, null, 2));
    console.log("💳 Tipo de pagamento:", billingType);
    console.log("🔗 Invoice URL:", cobrancaData.invoiceUrl);

    if (!paymentResponse.ok) {
      console.error("❌ Erro ao criar cobrança:", {
        status: paymentResponse.status,
        statusText: paymentResponse.statusText,
        data: cobrancaData
      });
      res.status(400).json({ 
        status: "erro", 
        error: cobrancaData.errors?.[0]?.description || cobrancaData.message || "Erro ao criar cobrança",
        details: cobrancaData 
      });
      return;
    }

    if (billingType === "CREDIT_CARD" && !cobrancaData.invoiceUrl) {
      console.warn("⚠️ Invoice URL não retornada para cartão de crédito");
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

    // Adicionar dados do PIX se for pagamento PIX
    if (billingType === "PIX" && cobrancaData.pixTransaction) {
      resposta.cobranca.pixKey = cobrancaData.pixTransaction.payload;
      resposta.cobranca.qrCodeImage = cobrancaData.pixTransaction.qrCode?.encodedImage;
      resposta.cobranca.expirationDate = cobrancaData.pixTransaction.expirationDate;
    }

    console.log("✅ Resposta enviada:", resposta);
    res.status(200).json(resposta);
  } catch (error) {
    console.error("🔥 Erro inesperado ao criar cobrança:", error);
    res.status(500).json({
      status: "erro",
      error: "Erro interno ao processar a cobrança.",
    });
  }
}
