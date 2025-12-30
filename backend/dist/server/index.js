"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const assas_1 = require("../services/assas");
require("dotenv/config");
const webhook_1 = __importDefault(require("./webhook"));
const whatsapp_1 = require("../services/whatsapp");
const app = (0, express_1.default)();
// Permitir requisições do localhost:5173 (seu front-end)
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Webhook test - resposta instantânea
app.post('/webhook-test', (req, res) => {
    res.status(200).send('OK');
});
app.post("/criar-cobranca", assas_1.criarCobrancaHandler);
app.use('/webhook', webhook_1.default);
app.get("/whatsapp/status", (_req, res) => {
    (0, whatsapp_1.iniciarWhatsApp)();
    res.json((0, whatsapp_1.obterStatusWhatsApp)());
});
app.post("/whatsapp/start", (_req, res) => {
    (0, whatsapp_1.iniciarWhatsApp)();
    res.json((0, whatsapp_1.obterStatusWhatsApp)());
});
app.post("/whatsapp/logout", async (_req, res) => {
    await (0, whatsapp_1.desconectarWhatsApp)();
    res.json((0, whatsapp_1.obterStatusWhatsApp)());
});
// Endpoint para testar atualização de status (apenas para debug)
app.post('/test-update-status/:reservaId', async (req, res) => {
    try {
        const { reservaId } = req.params;
        const { status } = req.body;
        const { doc, updateDoc } = await Promise.resolve().then(() => __importStar(require('firebase/firestore')));
        const { db } = await Promise.resolve().then(() => __importStar(require('../services/firebase')));
        const reservaRef = doc(db, 'reservas', reservaId);
        await updateDoc(reservaRef, {
            status: status || 'pago',
            dataPagamento: new Date()
        });
        res.json({ success: true, message: `Status atualizado para: ${status || 'pago'}` });
    }
    catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ error: 'Erro ao atualizar status' });
    }
});
// Endpoint para processar emails de confirmação
app.post('/process-emails', async (req, res) => {
    try {
        const { collection, query, where, getDocs, getDoc, doc } = await Promise.resolve().then(() => __importStar(require('firebase/firestore')));
        const { db } = await Promise.resolve().then(() => __importStar(require('../services/firebase')));
        const { enviarEmailConfirmacao } = await Promise.resolve().then(() => __importStar(require('../services/emailService')));
        // Buscar reservas pagas sem email enviado
        const q = query(collection(db, 'reservas'), where('status', '==', 'pago'));
        const snapshot = await getDocs(q);
        let emailsEnviados = 0;
        for (const docSnap of snapshot.docs) {
            const reserva = docSnap.data();
            // Verificar se já foi enviado email (evitar spam)
            if (!reserva.emailEnviado) {
                try {
                    await enviarEmailConfirmacao({
                        nome: reserva.nome,
                        email: reserva.email,
                        atividade: reserva.atividade,
                        data: reserva.data,
                        horario: reserva.horario,
                        participantes: reserva.participantes,
                    });
                    // Marcar como enviado
                    const { updateDoc } = await Promise.resolve().then(() => __importStar(require('firebase/firestore')));
                    await updateDoc(doc(db, 'reservas', docSnap.id), {
                        emailEnviado: true,
                        dataEmailEnviado: new Date()
                    });
                    emailsEnviados++;
                    console.log(`✉️ Email enviado: ${reserva.email}`);
                }
                catch (emailError) {
                    console.error(`❌ Erro email ${reserva.email}:`, emailError?.message || emailError);
                }
            }
        }
        res.json({ success: true, emailsEnviados });
    }
    catch (error) {
        console.error('Erro ao processar emails:', error);
        res.status(500).json({ error: error?.message || 'Erro desconhecido' });
    }
});
// Endpoint para testar webhook
app.post('/test-webhook', (req, res) => {
    const mockWebhookData = {
        event: 'PAYMENT_CONFIRMED',
        payment: {
            id: 'test-payment-id',
            status: 'CONFIRMED',
            billingType: 'CREDIT_CARD',
            externalReference: req.body.reservaId || 'test-reserva-id'
        }
    };
    // Simular chamada do webhook
    fetch(`${req.protocol}://${req.get('host')}/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockWebhookData)
    }).then(() => {
        res.json({ success: true, message: 'Webhook de teste enviado' });
    }).catch(error => {
        res.status(500).json({ error: error.message });
    });
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
    console.log("Token carregado:", process.env.ASAAS_API_KEY);
});
