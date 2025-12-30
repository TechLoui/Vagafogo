const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Usar a mesma instância do Firestore do test-api.js
const db = admin.firestore();

const normalizarNumero = (valor) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.max(numero, 0) : 0;
};

const somarMapa = (mapa) => {
  if (!mapa) return 0;
  return Object.values(mapa).reduce((total, valor) => total + normalizarNumero(valor), 0);
};

const normalizarMapa = (mapa) => {
  if (!mapa) return undefined;
  return Object.fromEntries(
    Object.entries(mapa).map(([chave, valor]) => [chave, normalizarNumero(valor)])
  );
};

async function criarCobrancaHandler(req, res) {
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
  } = req.body;

  console.log("📥 Nova reserva:", nome, "-", atividade);

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
    console.log("❌ Campos faltando:", camposFaltando.join(', '));
    res.status(400).json({
      status: "erro",
      error: `Dados incompletos. Campos faltando: ${camposFaltando.join(', ')}`,
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

  try {
    // 🔍 Verificar disponibilidade no Firebase
    const reservasQuery = db.collection("reservas")
      .where("data", "==", data)
      .where("horario", "==", horarioFormatado);

    const snapshot = await reservasQuery.get();

    let totalReservados = 0;
    snapshot.forEach((doc) => {
      const dados = doc.data();
      totalReservados += dados.participantes || 0;
    });

    if (totalReservados + participantesConsiderados > 30) {
      res.status(400).json({
        status: "erro",
        error: "Limite de 30 pessoas por horário atingido. Escolha outro horário.",
      });
      return;
    }

    const dataHoje = new Date().toISOString().split("T")[0];

    // 🔍 Verificar se o cliente já existe no Asaas (pelo CPF)
    const customerSearch = await fetch(
      `https://api.asaas.com/v3/customers?cpfCnpj=${cpf}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          access_token: process.env.ASAAS_API_KEY,
        },
      }
    );

    const customerSearchData = await customerSearch.json();
    let customerId = null;

    if (customerSearchData?.data?.length > 0) {
      customerId = customerSearchData.data[0].id;
    } else {
      const customerCreate = await fetch("https://api.asaas.com/v3/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: process.env.ASAAS_API_KEY,
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
        console.error("❌ Erro cliente Asaas:", customerData.errors?.[0]?.description || 'Erro desconhecido');
        res.status(400).json({ status: "erro", erro: customerData });
        return;
      }

      customerId = customerData.id;
    }

    // ✅ Criar reserva no Firebase com status aguardando
    const dadosReserva = {
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
      ...(mapaAtivo ? { participantesPorTipo: participantesPorTipoNormalizado } : {}),
      observacao: "",
      horario: horarioFormatado,
      temPet,
      status: 'aguardando',
      criadoEm: admin.firestore.FieldValue.serverTimestamp()
    };
    
    console.log('📝 Criando reserva no Firebase...');
    const docRef = await db.collection('reservas').add(dadosReserva);
    const reservaId = docRef.id;
    console.log('✅ Reserva criada no Firebase com ID:', reservaId);

    // 💰 Criar pagamento com o customer correto
    const paymentResponse = await fetch("https://api.asaas.com/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        access_token: process.env.ASAAS_API_KEY,
      },
      body: JSON.stringify({
        billingType,
        customer: customerId,
        value: valor,
        dueDate: dataHoje,
        description: `${atividade} - ${data} ${horarioFormatado} - ${participantesConsiderados}p - Pet:${temPet}`,
        externalReference: reservaId,
      }),
    });

    const cobrancaData = await paymentResponse.json();

    if (!paymentResponse.ok) {
      console.error("❌ Erro cobrança:", cobrancaData.errors?.[0]?.description || 'Erro desconhecido');
      res.status(400).json({ status: "erro", erro: cobrancaData });
      return;
    }

    console.log("✅ Cobrança criada:", cobrancaData.id);
    console.log("💾 Reserva será criada após pagamento com ID:", reservaId);
    res.status(200).json({
      status: "ok",
      cobranca: {
        id: cobrancaData.id,
        status: cobrancaData.status,
        invoiceUrl: cobrancaData.invoiceUrl,
      },
    });
  } catch (error) {
    console.error("🔥 Erro inesperado ao criar cobrança:", error);
    res.status(500).json({
      status: "erro",
      error: "Erro interno ao processar a cobrança.",
    });
  }
}

module.exports = { criarCobrancaHandler };
