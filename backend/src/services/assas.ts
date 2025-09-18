import type { Request, Response } from "express";
import { getDocs, collection, query, where, getDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

export type CriarCobrancaPayload = {
  nome: string;
  email: string;
  valor: number;
  cpf: string;
  telefone: string;
  atividade: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:mm
  participantes: number;
  adultos: number;
  bariatrica: number;
  criancas: number;
  naoPagante: number;
  billingType: "PIX" | "CREDIT_CARD";
  temPet?: boolean;
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
    billingType,
    temPet,
  } = req.body as CriarCobrancaPayload;

  console.log("[ASSAS] Dados recebidos:", req.body);

  const horarioFormatado = horario?.toString().trim();

  // Debug detalhado dos campos
  const camposFaltando: string[] = [];
  if (!nome) camposFaltando.push("nome");
  if (!email) camposFaltando.push("email");
  if (!valor) camposFaltando.push("valor");
  if (!cpf) camposFaltando.push("cpf");
  if (!telefone) camposFaltando.push("telefone");
  if (!atividade) camposFaltando.push("atividade");
  if (!data) camposFaltando.push("data");
  if (!horarioFormatado) camposFaltando.push("horario");
  if (!participantes) camposFaltando.push("participantes");
  if (!billingType) camposFaltando.push("billingType");

  if (camposFaltando.length > 0) {
    res.status(400).json({
      status: "erro",
      error: `Dados incompletos. Campos faltando: ${camposFaltando.join(", ")}`,
      camposFaltando,
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

  // 1) Validar se a data/horário já passou
  const agora = new Date();
  const [ano, mes, dia] = String(data || "").split("-").map(Number);
  if (!ano || !mes || !dia) {
    res.status(400).json({ status: "erro", error: "Data inválida." });
    return;
  }
  const baseHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const baseReserva = new Date(ano, mes - 1, dia);
  if (baseReserva < baseHoje) {
    res.status(400).json({ status: "erro", error: "Não é permitido reservar em datas passadas." });
    return;
  }
  if (horarioFormatado) {
    const [hh, mm] = horarioFormatado.split(":").map(Number);
    if (Number.isFinite(hh) && Number.isFinite(mm)) {
      const dataHora = new Date(ano, mes - 1, dia, hh, mm, 0, 0);
      if (dataHora < agora) {
        res.status(400).json({ status: "erro", error: "Horário selecionado já passou." });
        return;
      }
    }
  }

  // 2) Checar bloqueios (coleção 'bloqueios', doc id = YYYY-MM-DD)
  try {
    const bloqueioRef = doc(db, "bloqueios", data);
    const bloqueioSnap = await getDoc(bloqueioRef);
    if (bloqueioSnap.exists()) {
      const b = bloqueioSnap.data() as { fecharDia?: boolean; horariosFechados?: string[] };
      if (b.fecharDia) {
        res.status(400).json({ status: "erro", error: "Dia indisponível para reservas." });
        return;
      }
      if (Array.isArray(b.horariosFechados) && b.horariosFechados.includes(horarioFormatado)) {
        res.status(400).json({ status: "erro", error: "Horário indisponível para reservas." });
        return;
      }
    }
  } catch {}

  try {
    // 3) Verificar disponibilidade no Firebase
    const reservasQuery = query(
      collection(db, "reservas"),
      where("data", "==", data),
      where("horario", "==", horarioFormatado)
    );

    const snapshot = await getDocs(reservasQuery);

    let totalReservados = 0;
    snapshot.forEach((d) => {
      const dados = d.data() as any;
      totalReservados += dados.participantes || 0;
    });

    if (totalReservados + participantes > 30) {
      res.status(400).json({
        status: "erro",
        error: "Limite de 30 pessoas por horário atingido. Escolha outro horário.",
      });
      return;
    }

    const dataHoje = new Date().toISOString().split("T")[0];
    const reservaId = Date.now().toString();

    // 4) Verificar/CRIAR cliente no Asaas
    const customerSearch = await fetch(
      `https://api.asaas.com/v3/customers?cpfCnpj=${cpf}`,
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
      console.log("[ASSAS] Cliente encontrado:", customerId);
    } else {
      const customerCreate = await fetch("https://api.asaas.com/v3/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: process.env.ASAAS_API_KEY!,
        },
        body: JSON.stringify({
          name: nome,
          email,
          cpfCnpj: cpf,
          phone: telefone,
          notificationDisabledSet: true,
        }),
      });

      const customerData = await customerCreate.json();

      if (!customerCreate.ok) {
        console.error("[ASSAS] Erro ao criar cliente no Asaas:", customerData);
        res.status(400).json({ status: "erro", erro: customerData });
        return;
      }

      customerId = customerData.id;
      console.log("[ASSAS] Cliente criado:", customerId);
    }

    // 5) Criar pagamento
    const paymentResponse = await fetch("https://api.asaas.com/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        access_token: process.env.ASAAS_API_KEY!,
      },
      body: JSON.stringify({
        billingType,
        customer: customerId,
        value: valor,
        dueDate: dataHoje,
        description: `${atividade} - ${data} ${horarioFormatado} - ${participantes}p - Pet:${temPet}`,
        externalReference: reservaId,
      }),
    });

    const cobrancaData = await paymentResponse.json();

    if (!paymentResponse.ok) {
      console.error("[ASSAS] Erro ao criar cobrança:", cobrancaData);
      res.status(400).json({ status: "erro", erro: cobrancaData });
      return;
    }

    res.status(200).json({
      status: "ok",
      cobranca: {
        id: cobrancaData.id,
        status: cobrancaData.status,
        invoiceUrl: cobrancaData.invoiceUrl,
      },
    });
  } catch (error) {
    console.error("[ASSAS] Erro inesperado ao criar cobrança:", error);
    res.status(500).json({
      status: "erro",
      error: "Erro interno ao processar a cobrança.",
    });
  }
}

