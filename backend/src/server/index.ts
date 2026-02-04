import express from "express";
import cors from "cors";
import { criarCobrancaHandler } from "../services/assas";
import "dotenv/config";
import webhookRouter from "./webhook";
import {
  desconectarWhatsApp,
  iniciarWhatsApp,
  obterStatusWhatsApp,
  processarPendentesWhatsapp,
} from "../services/whatsapp";
import apiRouter from "./api";

const app = express();

// Permitir requisições do localhost:5173 (seu front-end)
app.use(cors());

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook test - resposta instantânea
app.post('/webhook-test', (req, res) => {
  res.status(200).send('OK');
});

app.post("/criar-cobranca", criarCobrancaHandler);
app.use('/webhook', webhookRouter);
app.use('/api', apiRouter);

app.get("/whatsapp/status", (_req, res) => {
  iniciarWhatsApp();
  res.json(obterStatusWhatsApp());
});

app.post("/whatsapp/start", (_req, res) => {
  iniciarWhatsApp();
  res.json(obterStatusWhatsApp());
});

app.post("/whatsapp/logout", async (_req, res) => {
  await desconectarWhatsApp();
  res.json(obterStatusWhatsApp());
});

app.post("/whatsapp/process-pending", async (_req, res) => {
  try {
    const resultado = await processarPendentesWhatsapp();
    res.json(resultado);
  } catch (error) {
    console.error("Erro ao processar pendencias do WhatsApp:", error);
    res.status(500).json({ error: "Erro ao processar pendencias do WhatsApp" });
  }
});

// Endpoint para testar atualização de status (apenas para debug)
app.post('/test-update-status/:reservaId', async (req, res) => {
  try {
    const { reservaId } = req.params;
    const { status } = req.body;
    
    const { doc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('../services/firebase');
    
    const reservaRef = doc(db, 'reservas', reservaId);
    await updateDoc(reservaRef, {
      status: status || 'pago',
      dataPagamento: new Date()
    });
    
    res.json({ success: true, message: `Status atualizado para: ${status || 'pago'}` });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// Endpoint para processar emails de confirmação
app.post('/process-emails', async (req, res) => {
  try {
    const { collection, query, where, getDocs, getDoc, doc } = await import('firebase/firestore');
    const { db } = await import('../services/firebase');
    const { enviarEmailConfirmacao } = await import('../services/emailService');
    
    // Buscar reservas pagas sem email enviado
    const q = query(
      collection(db, 'reservas'),
      where('status', '==', 'pago')
    );
    
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
          const { updateDoc } = await import('firebase/firestore');
          await updateDoc(doc(db, 'reservas', docSnap.id), {
            emailEnviado: true,
            dataEmailEnviado: new Date()
          });
          
          emailsEnviados++;
          console.log(`✉️ Email enviado: ${reserva.email}`);
        } catch (emailError: any) {
          console.error(`❌ Erro email ${reserva.email}:`, emailError?.message || emailError);
        }
      }
    }
    
    res.json({ success: true, emailsEnviados });
  } catch (error: any) {
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

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);

  const asaasKey = (process.env.ASAAS_API_KEY ?? "").trim();
  const splitWalletId = (process.env.ASAAS_SPLIT_WALLET_ID ?? "").trim();
  const splitPercentual = (process.env.ASAAS_SPLIT_PERCENTUAL ?? "").trim();

  console.log("Asaas config:", {
    apiKey: asaasKey ? "SIM" : "NÃO",
    splitWalletId: splitWalletId
      ? `${splitWalletId.slice(0, 8)}...${splitWalletId.slice(-4)}`
      : "NÃO",
    splitPercentual: splitPercentual || "N/A",
  });

});
