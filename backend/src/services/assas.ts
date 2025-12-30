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

const somenteNumeros = (valor?: string) => (valor ? valor.replace(/\D/g, "") : "");
const limparTexto = (valor?: string) => (typeof valor === "string" ? valor.trim() : "");
const normalizarAnoValidade = (valor?: string) => {
  const numeros = somenteNumeros(valor);
  if (!numeros) return "";
  if (numeros.length === 2) return `20${numeros}`;
  return numeros.slice(0, 4);
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
  billingType: "PIX" | "CREDIT_CARD";
  creditCard?: CreditCardPayload;
  creditCardHolderInfo?: CreditCardHolderInfo;
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
    creditCard,
    creditCardHolderInfo,
    temPet,
    perguntasPersonalizadas,
} = req.body as CriarCobrancaPayload;

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
        state: limparTexto(creditCardHolderInfo.state).toUpperCase(),
        phone: somenteNumeros(creditCardHolderInfo.phone || telefoneLimpo),
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
    const paymentPayload: Record<string, unknown> = {
      billingType,
      customer: customerId,
      value: valor,
      dueDate: dataHoje,
      description: `Cobranca de ${nome}`,
      externalReference: reservaId,
    };

    if (billingType === "CREDIT_CARD" && creditCardNormalizado && creditCardHolderNormalizado) {
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
    });
    
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
    console.log("INFO Resposta do Asaas:", {
      id: cobrancaData.id,
      status: cobrancaData.status,
      billingType: cobrancaData.billingType ?? billingType,
      invoiceUrl: cobrancaData.invoiceUrl,
      value: cobrancaData.value,
    });

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
