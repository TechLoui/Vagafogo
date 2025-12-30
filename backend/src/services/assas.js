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

const somenteNumeros = (valor) => (valor ? valor.replace(/\D/g, "") : "");
const limparTexto = (valor) => (typeof valor === "string" ? valor.trim() : "");
const normalizarAnoValidade = (valor) => {
  const numeros = somenteNumeros(valor);
  if (!numeros) return "";
  if (numeros.length === 2) return `20${numeros}`;
  return numeros.slice(0, 4);
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
    creditCard,
    creditCardHolderInfo,
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

  const cpfLimpo = somenteNumeros(cpf);
  const telefoneLimpo = somenteNumeros(telefone);

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
    const camposCartaoFaltando = [];
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
      `https://api.asaas.com/v3/customers?cpfCnpj=${cpfLimpo}`,
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
          cpfCnpj: cpfLimpo,
          phone: telefoneLimpo,
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
    const paymentPayload = {
      billingType,
      customer: customerId,
      value: valor,
      dueDate: dataHoje,
      description: `${atividade} - ${data} ${horarioFormatado} - ${participantesConsiderados}p - Pet:${temPet}`,
      externalReference: reservaId,
    };

    if (billingType === "CREDIT_CARD" && creditCardNormalizado && creditCardHolderNormalizado) {
      paymentPayload.creditCard = creditCardNormalizado;
      paymentPayload.creditCardHolderInfo = creditCardHolderNormalizado;
    }

    const paymentResponse = await fetch("https://api.asaas.com/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        access_token: process.env.ASAAS_API_KEY,
      },
      body: JSON.stringify(paymentPayload),
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
