"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.criarCobrancaHandler = criarCobrancaHandler;
const reservas_1 = require("./reservas");
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("./firebase");
async function criarCobrancaHandler(req, res) {
    const { nome, email, valor, cpf, telefone, atividade, data, horario, participantes, adultos, bariatrica, criancas, naoPagante, billingType, temPet, } = req.body;
    console.log("[ASSAS] Dados recebidos:", req.body);
    const horarioFormatado = horario?.toString().trim();
    // Validação de campos
    const camposFaltando = [];
    if (!nome)
        camposFaltando.push("nome");
    if (!email)
        camposFaltando.push("email");
    if (!valor)
        camposFaltando.push("valor");
    if (!cpf)
        camposFaltando.push("cpf");
    if (!telefone)
        camposFaltando.push("telefone");
    if (!atividade)
        camposFaltando.push("atividade");
    if (!data)
        camposFaltando.push("data");
    if (!horarioFormatado)
        camposFaltando.push("horario");
    if (!participantes)
        camposFaltando.push("participantes");
    if (!billingType)
        camposFaltando.push("billingType");
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
    try {
        // 1) Validar se a data/horário já passou
        const agora = new Date();
        const [ano, mes, dia] = data.split("-").map(Number);
        if (!ano || !mes || !dia) {
            res.status(400).json({ status: "erro", error: "Data inválida." });
            return;
        }
        const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        const diaReserva = new Date(ano, mes - 1, dia);
        const soDiaReserva = new Date(diaReserva.getFullYear(), diaReserva.getMonth(), diaReserva.getDate());
        if (soDiaReserva < hoje) {
            res.status(400).json({ status: "erro", error: "Não é permitido reservar em datas passadas." });
            return;
        }
        const [hh, mm] = horarioFormatado.split(":").map(Number);
        if (Number.isFinite(hh) && Number.isFinite(mm)) {
            const dataHoraReserva = new Date(ano, mes - 1, dia, hh, mm, 0, 0);
            if (dataHoraReserva < agora) {
                res.status(400).json({ status: "erro", error: "Horário selecionado já passou." });
                return;
            }
        }
        // 2) Checar bloqueios (fechamentos) do dia/horário
        // Coleção "bloqueios" com doc id = YYYY-MM-DD: { fecharDia: boolean, horariosFechados: string[] }
        const bloqueioRef = (0, firestore_1.doc)(firebase_1.db, "bloqueios", data);
        const bloqueioSnap = await (0, firestore_1.getDoc)(bloqueioRef);
        if (bloqueioSnap.exists()) {
            const b = bloqueioSnap.data();
            if (b.fecharDia) {
                res.status(400).json({ status: "erro", error: "Dia indisponível para reservas." });
                return;
            }
            if (Array.isArray(b.horariosFechados) && b.horariosFechados.includes(horarioFormatado)) {
                res.status(400).json({ status: "erro", error: "Horário indisponível para reservas." });
                return;
            }
        }
        // 3) Verificar disponibilidade existente (usar campos corretos minúsculos)
        const reservasQuery = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, "reservas"), (0, firestore_1.where)("data", "==", data), (0, firestore_1.where)("horario", "==", horarioFormatado));
        const snapshot = await (0, firestore_1.getDocs)(reservasQuery);
        let totalReservados = 0;
        snapshot.forEach((d) => {
            const dados = d.data();
            totalReservados += dados.participantes || 0;
        });
        // Limite padrão de 30 por horário (se não houver lógica por pacote no backend)
        if (totalReservados + participantes > 30) {
            res.status(400).json({
                status: "erro",
                error: "Limite de 30 pessoas por horário atingido. Escolha outro horário.",
            });
            return;
        }
        // 4) Criar reserva no Firebase
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
        // 5) Integração com Asaas
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
            console.log("[ASSAS] Cliente encontrado:", customerId);
        }
        else {
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
                console.error("[ASSAS] Erro ao criar cliente no Asaas:", customerData);
                res.status(400).json({ status: "erro", erro: customerData });
                return;
            }
            customerId = customerData.id;
            console.log("[ASSAS] Cliente criado:", customerId);
        }
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
                description: `Cobrança de ${nome}`,
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
    }
    catch (error) {
        console.error("[ASSAS] Erro inesperado ao criar cobrança:", error);
        res.status(500).json({
            status: "erro",
            error: "Erro interno ao processar a cobrança.",
        });
    }
}
