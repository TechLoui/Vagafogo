"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.criarCobrancaHandler = criarCobrancaHandler;
const reservas_1 = require("./reservas");
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("./firebase");
async function criarCobrancaHandler(req, res) {
    const { nome, email, valor, cpf, telefone, atividade, data, horario, participantes, adultos, bariatrica, criancas, naoPagante, billingType, temPet, } = req.body;
    console.log("📥 Dados recebidos:", req.body);
    const horarioFormatado = horario?.toString().trim();
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
    if (!participantes)
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
    try {
        // 🔍 Verificar disponibilidade no Firebase
        const reservasQuery = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, "reservas"), (0, firestore_1.where)("Data", "==", data), (0, firestore_1.where)("Horario", "==", horarioFormatado));
        const snapshot = await (0, firestore_1.getDocs)(reservasQuery);
        let totalReservados = 0;
        snapshot.forEach((doc) => {
            const dados = doc.data();
            totalReservados += dados.Participantes || 0;
        });
        if (totalReservados + participantes > 30) {
            res.status(400).json({
                status: "erro",
                error: "Limite de 30 pessoas por horário atingido. Escolha outro horário.",
            });
            return;
        }
        // ✅ Criar reserva no Firebase
        const reservaId = await (0, reservas_1.criarReserva)({
            nome,
            cpf,
            email,
            telefone,
            atividade,
            valor,
            data,
            participantes,
            adultos,
            bariatrica,
            criancas,
            naoPagante,
            observacao: "",
            horario: horarioFormatado,
            status: "aguardando",
            temPet,
        });
        const dataHoje = new Date().toISOString().split("T")[0];
        // 🔍 Verificar se o cliente já existe no Asaas (pelo CPF)
        const customerSearch = await fetch(`https://api.asaas.com/v3/customers?cpfCnpj=${cpf}`, {
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
                console.error("❌ Erro ao criar cliente no Asaas:", customerData);
                res.status(400).json({ status: "erro", erro: customerData });
                return;
            }
            customerId = customerData.id;
            console.log("🆕 Cliente criado:", customerId);
        }
        if (!customerId) {
            console.error("❌ customerId não definido após criar/buscar cliente no Asaas.");
            res.status(500).json({
                status: "erro",
                error: "Falha ao obter o customerId no Asaas.",
            });
            return;
        }
        const splitWalletId = process.env.ASAAS_SPLIT_WALLET_ID?.trim();
        const splitPercentualValueEnv = process.env.ASAAS_SPLIT_PERCENTUAL_VALUE?.trim();
        const splitPercentualValue = splitPercentualValueEnv ? Number(splitPercentualValueEnv) : 1;
        const paymentPayload = {
            billingType,
            customer: customerId,
            value: valor,
            dueDate: dataHoje,
            description: `Cobrança de ${nome}`,
            externalReference: reservaId,
        };
        if (splitWalletId) {
            if (Number.isFinite(splitPercentualValue) &&
                splitPercentualValue > 0 &&
                splitPercentualValue <= 100) {
                paymentPayload.split = [{ walletId: splitWalletId, percentualValue: splitPercentualValue }];
            }
            else {
                console.warn("⚠️ ASAAS_SPLIT_PERCENTUAL_VALUE inválido; split ignorado:", splitPercentualValueEnv);
            }
        }
        // 💰 Criar pagamento com o customer correto
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
            console.error("❌ Erro ao criar cobrança:", cobrancaData);
            res.status(400).json({ status: "erro", erro: cobrancaData });
            return;
        }
        // ✅ Resposta de sucesso
        res.status(200).json({
            status: "ok",
            cobranca: {
                id: cobrancaData.id,
                status: cobrancaData.status,
                invoiceUrl: cobrancaData.invoiceUrl,
            },
        });
    }
    catch (error) {
        console.error("🔥 Erro inesperado ao criar cobrança:", error);
        res.status(500).json({
            status: "erro",
            error: "Erro interno ao processar a cobrança.",
        });
    }
}
