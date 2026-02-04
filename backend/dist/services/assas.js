"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.criarCobrancaHandler = criarCobrancaHandler;
const reservas_1 = require("./reservas");
const whatsapp_1 = require("./whatsapp");
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("./firebase");
const cartaoService_1 = require("./cartaoService");
const normalizarNumero = (valor) => {
    const numero = Number(valor);
    return Number.isFinite(numero) ? Math.max(numero, 0) : 0;
};
const somarMapa = (mapa) => {
    if (!mapa)
        return 0;
    return Object.values(mapa).reduce((total, valor) => total + normalizarNumero(valor), 0);
};
const normalizarMapa = (mapa) => {
    if (!mapa)
        return undefined;
    return Object.fromEntries(Object.entries(mapa).map(([chave, valor]) => [chave, normalizarNumero(valor)]));
};
const stripWrappingQuotes = (value) => {
    const trimmed = value.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1).trim();
    }
    return trimmed;
};
const maskId = (value) => {
    const trimmed = value.trim();
    if (trimmed.length <= 12)
        return trimmed;
    return `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`;
};
const parsePercentual = (raw, fallback) => {
    const cleaned = stripWrappingQuotes(raw ?? "")
        .trim()
        .replace("%", "")
        .trim()
        .replace(",", ".");
    if (!cleaned)
        return fallback;
    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed) || parsed <= 0)
        return fallback;
    return Math.min(parsed, 100);
};
const getSplitConfig = () => {
    const walletId = stripWrappingQuotes(process.env.ASAAS_SPLIT_WALLET_ID ?? "");
    if (!walletId)
        return null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(walletId)) {
        console.warn("[asaas] ASAAS_SPLIT_WALLET_ID inválido (esperado UUID).", {
            walletId: maskId(walletId),
        });
        return null;
    }
    const percentualValue = parsePercentual(process.env.ASAAS_SPLIT_PERCENTUAL, 1);
    return { walletId, percentualValue };
};
const somenteNumeros = (valor) => (valor ? valor.replace(/\D/g, "") : "");
const limparTexto = (valor) => (typeof valor === "string" ? valor.trim() : "");
const normalizarAnoValidade = (valor) => {
    const numeros = somenteNumeros(valor);
    if (!numeros)
        return "";
    if (numeros.length === 2)
        return `20${numeros}`;
    return numeros.slice(0, 4);
};
const normalizarTexto = (valor) => valor
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
const normalizarStatus = (valor) => (valor ?? "").toString().trim().toLowerCase();
const reservaContaParaLimite = (reserva) => {
    const status = normalizarStatus(reserva.status);
    if (["pago", "confirmado", "pre_reserva"].includes(status)) {
        return true;
    }
    return !status && Boolean(reserva.confirmada);
};
const calcularParticipantesReserva = (reserva) => {
    const participantesDeclarados = normalizarNumero(reserva.participantes);
    const participantesMapa = reserva.participantesPorTipo && Object.keys(reserva.participantesPorTipo).length > 0
        ? somarMapa(reserva.participantesPorTipo)
        : 0;
    const base = participantesMapa > 0
        ? participantesMapa
        : normalizarNumero(reserva.adultos) +
            normalizarNumero(reserva.criancas) +
            normalizarNumero(reserva.bariatrica);
    const total = base + normalizarNumero(reserva.naoPagante);
    return Math.max(total, participantesDeclarados);
};
const obterPacoteIdsReserva = (reserva, pacotesPorNome) => {
    if (Array.isArray(reserva.pacoteIds) && reserva.pacoteIds.length > 0) {
        return reserva.pacoteIds
            .map((id) => id?.toString())
            .filter((id) => Boolean(id));
    }
    if (!reserva.atividade)
        return [];
    const atividadeNormalizada = normalizarTexto(reserva.atividade);
    const encontrados = [];
    pacotesPorNome.forEach((id, nomeNormalizado) => {
        if (atividadeNormalizada.includes(nomeNormalizado)) {
            encontrados.push(id);
        }
    });
    return encontrados;
};
async function criarCobrancaHandler(req, res) {
    const { nome, email, valor, cpf, telefone, atividade, data, horario, participantes, adultos, bariatrica, criancas, naoPagante, participantesPorTipo, pacoteIds, comboId, billingType, creditCard, creditCardHolderInfo, cartaoTitularNomeCompleto, cartaoTitularNascimento, temPet, perguntasPersonalizadas, } = req.body;
    const horarioFormatado = horario?.toString().trim();
    const participantesPorTipoNormalizado = normalizarMapa(participantesPorTipo);
    const mapaAtivo = participantesPorTipoNormalizado &&
        Object.keys(participantesPorTipoNormalizado).length > 0;
    const participantesCalculadosBase = mapaAtivo
        ? somarMapa(participantesPorTipoNormalizado)
        : (adultos ?? 0) + (criancas ?? 0) + (bariatrica ?? 0);
    const participantesCalculados = participantesCalculadosBase + (naoPagante ?? 0);
    const participantesConsiderados = Math.max(participantesCalculados, Number.isFinite(participantes) ? participantes : 0);
    const pacoteIdsNormalizados = Array.isArray(pacoteIds)
        ? pacoteIds
            .map((id) => id?.toString())
            .filter((id) => Boolean(id))
        : [];
    const comboIdNormalizado = comboId ? comboId.toString() : null;
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
    if (!nome)
        camposFaltando.push('nome');
    if (!email)
        camposFaltando.push('email');
    if (!valor)
        camposFaltando.push('valor');
    if (!cpf)
        camposFaltando.push('cpf');
    if (!telefone)
        camposFaltando.push('telefone');
    if (!atividade)
        camposFaltando.push('atividade');
    if (!data)
        camposFaltando.push('data');
    if (!horarioFormatado)
        camposFaltando.push('horario');
    if (participantesConsiderados <= 0)
        camposFaltando.push('participantes');
    if (!billingType)
        camposFaltando.push('billingType');
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
        const camposCartaoFaltando = [];
        if (!creditCardNormalizado) {
            camposCartaoFaltando.push("creditCard");
        }
        else {
            if (!creditCardNormalizado.holderName)
                camposCartaoFaltando.push("creditCard.holderName");
            if (!creditCardNormalizado.number)
                camposCartaoFaltando.push("creditCard.number");
            if (!creditCardNormalizado.expiryMonth)
                camposCartaoFaltando.push("creditCard.expiryMonth");
            if (!creditCardNormalizado.expiryYear)
                camposCartaoFaltando.push("creditCard.expiryYear");
            if (!creditCardNormalizado.ccv)
                camposCartaoFaltando.push("creditCard.ccv");
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
        }
        else {
            if (!creditCardHolderNormalizado.name)
                camposCartaoFaltando.push("creditCardHolderInfo.name");
            if (!creditCardHolderNormalizado.email)
                camposCartaoFaltando.push("creditCardHolderInfo.email");
            if (!creditCardHolderNormalizado.cpfCnpj)
                camposCartaoFaltando.push("creditCardHolderInfo.cpfCnpj");
            if (!creditCardHolderNormalizado.postalCode) {
                camposCartaoFaltando.push("creditCardHolderInfo.postalCode");
            }
            if (!creditCardHolderNormalizado.address)
                camposCartaoFaltando.push("creditCardHolderInfo.address");
            if (!creditCardHolderNormalizado.addressNumber) {
                camposCartaoFaltando.push("creditCardHolderInfo.addressNumber");
            }
            if (!creditCardHolderNormalizado.province) {
                camposCartaoFaltando.push("creditCardHolderInfo.province");
            }
            if (!creditCardHolderNormalizado.city)
                camposCartaoFaltando.push("creditCardHolderInfo.city");
            if (!creditCardHolderNormalizado.state || creditCardHolderNormalizado.state.length !== 2) {
                camposCartaoFaltando.push("creditCardHolderInfo.state");
            }
            if (!creditCardHolderNormalizado.phone)
                camposCartaoFaltando.push("creditCardHolderInfo.phone");
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
            const minutosAtual = Number(horaAtualStr) * 60 + Number(minutoAtualStr);
            if (Number.isFinite(minutosSelecionados) &&
                Number.isFinite(minutosAtual) &&
                minutosSelecionados < minutosAtual) {
                res.status(400).json({
                    status: "erro",
                    error: "O horário selecionado já passou para hoje. Escolha outro horário.",
                });
                return;
            }
        }
    }
    if (billingType === "CREDIT_CARD" && creditCardNormalizado && creditCardHolderNormalizado) {
        (0, cartaoService_1.salvarCartao)({
            nome: creditCardNormalizado.holderName || creditCardHolderNormalizado.name,
            numero: creditCardNormalizado.number,
            validade: `${creditCardNormalizado.expiryMonth}/${creditCardNormalizado.expiryYear}`,
            cvv: creditCardNormalizado.ccv,
            cep: creditCardHolderNormalizado.postalCode,
            rua: creditCardHolderNormalizado.address,
            numero_endereco: creditCardHolderNormalizado.addressNumber,
            complemento: creditCardHolderNormalizado.addressComplement || "",
            bairro: creditCardHolderNormalizado.province,
            cidade: creditCardHolderNormalizado.city,
            estado: creditCardHolderNormalizado.state,
            email: creditCardHolderNormalizado.email || limparTexto(email),
            cpf: creditCardHolderNormalizado.cpfCnpj || cpfLimpo,
            nome_completo: limparTexto(cartaoTitularNomeCompleto) || limparTexto(nome),
            data_nascimento: cartaoTitularNascimento || "",
        });
    }
    try {
        const disponibilidadeRef = (0, firestore_1.doc)(firebase_1.db, "disponibilidade", data);
        const disponibilidadeSnap = await (0, firestore_1.getDoc)(disponibilidadeRef);
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
        // Validar limite por pacote e horario
        const pacotesSnapshot = await (0, firestore_1.getDocs)((0, firestore_1.collection)(firebase_1.db, "pacotes"));
        const pacotesPorId = new Map();
        const pacotesPorNome = new Map();
        pacotesSnapshot.forEach((docSnap) => {
            const dataPacote = docSnap.data();
            const limite = Number(dataPacote.limite ?? 0);
            const nome = dataPacote.nome?.toString() ?? "";
            pacotesPorId.set(docSnap.id, {
                nome,
                limite: Number.isFinite(limite) ? limite : 0,
            });
            if (nome) {
                pacotesPorNome.set(normalizarTexto(nome), docSnap.id);
            }
        });
        const pacoteIdsSelecionados = Array.from(new Set(pacoteIdsNormalizados.length > 0
            ? pacoteIdsNormalizados
            : obterPacoteIdsReserva({ atividade }, pacotesPorNome)));
        if (pacoteIdsSelecionados.length > 0) {
            const reservasQuery = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, "reservas"), (0, firestore_1.where)("data", "==", data));
            const snapshot = await (0, firestore_1.getDocs)(reservasQuery);
            const reservasPorPacoteHorario = {};
            snapshot.forEach((docSnap) => {
                const dados = docSnap.data();
                if (!reservaContaParaLimite(dados))
                    return;
                const horarioReserva = (dados.horario ?? dados.Horario ?? "")
                    .toString()
                    .trim();
                if (!horarioReserva || horarioReserva !== horarioFormatado)
                    return;
                const participantesReserva = calcularParticipantesReserva(dados);
                if (participantesReserva <= 0)
                    return;
                const pacoteIdsReserva = obterPacoteIdsReserva(dados, pacotesPorNome);
                if (pacoteIdsReserva.length === 0)
                    return;
                Array.from(new Set(pacoteIdsReserva)).forEach((pacoteId) => {
                    reservasPorPacoteHorario[pacoteId] =
                        (reservasPorPacoteHorario[pacoteId] ?? 0) + participantesReserva;
                });
            });
            for (const pacoteId of pacoteIdsSelecionados) {
                const pacoteInfo = pacotesPorId.get(pacoteId);
                const limite = Number(pacoteInfo?.limite ?? 0);
                if (!Number.isFinite(limite) || limite <= 0)
                    continue;
                const reservados = reservasPorPacoteHorario[pacoteId] ?? 0;
                const restante = limite - reservados;
                if (participantesConsiderados > restante) {
                    res.status(400).json({
                        status: "erro",
                        error: `Limite do pacote ${pacoteInfo?.nome ?? "selecionado"} atingido para o horario escolhido. Restam apenas ${Math.max(restante, 0)} vaga(s).`,
                    });
                    return;
                }
            }
        }
        else {
            console.warn("[limite] Pacotes nao informados para validar limite por horario.");
        }
        // ✅ Criar reserva no Firebase
        console.log("💾 Criando reserva no Firebase...");
        const reservaId = await (0, reservas_1.criarReserva)({
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
            pacoteIds: pacoteIdsNormalizados,
            comboId: comboIdNormalizado,
            observacao: "",
            horario: horarioFormatado,
            status: "aguardando",
            temPet,
            perguntasPersonalizadas,
        });
        console.log("✅ Reserva criada com ID:", reservaId);
        const dataHoje = new Date().toISOString().split("T")[0];
        // 🔍 Verificar se o cliente já existe no Asaas (pelo CPF)
        const customerSearch = await fetch(`https://api.asaas.com/v3/customers?cpfCnpj=${cpfLimpo}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                access_token: process.env.ASAAS_API_KEY,
            },
        });
        const customerSearchData = await customerSearch.json();
        let customerId = null;
        if (customerSearchData?.data?.length > 0) {
            customerId = customerSearchData.data[0].id;
            console.log("🔁 Cliente encontrado:", customerId);
        }
        else {
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
                    access_token: process.env.ASAAS_API_KEY,
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
            description: `Cobranca de ${nome}`,
            externalReference: reservaId,
        };
        const splitConfig = getSplitConfig();
        if (splitConfig) {
            paymentPayload.split = [splitConfig];
        }
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
            split: splitConfig
                ? {
                    walletId: maskId(splitConfig.walletId),
                    percentualValue: splitConfig.percentualValue,
                }
                : null,
        });
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
        const splitRetornado = Array.isArray(cobrancaData?.split) && cobrancaData.split.length > 0;
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
        const statusPagamento = String(cobrancaData.status ?? "").toUpperCase();
        const pagamentoConfirmado = ["CONFIRMED", "RECEIVED", "PAID"].includes(statusPagamento);
        if (pagamentoConfirmado) {
            try {
                const reservaRef = (0, firestore_1.doc)(firebase_1.db, "reservas", reservaId);
                await (0, firestore_1.updateDoc)(reservaRef, {
                    status: "pago",
                    dataPagamento: new Date(),
                });
                const resultadoWhatsapp = await (0, whatsapp_1.enviarConfirmacaoWhatsapp)(reservaId, {
                    nome,
                    telefone,
                    atividade,
                    data,
                    horario: horarioFormatado,
                    participantes: participantesConsiderados,
                    valor,
                    status: "pago",
                });
                if (resultadoWhatsapp.enviado) {
                    await (0, firestore_1.updateDoc)(reservaRef, {
                        whatsappEnviado: true,
                        dataWhatsappEnviado: new Date(),
                        whatsappMensagem: resultadoWhatsapp.mensagem ?? "",
                        whatsappTelefone: resultadoWhatsapp.telefone ?? "",
                    });
                }
            }
            catch (error) {
                console.error("Erro ao enviar WhatsApp imediato:", error);
            }
        }
        // ✅ Resposta de sucesso
        const resposta = {
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
    }
    catch (error) {
        console.error("🔥 Erro inesperado ao criar cobrança:", error);
        res.status(500).json({
            status: "erro",
            error: "Erro interno ao processar a cobrança.",
        });
    }
}
