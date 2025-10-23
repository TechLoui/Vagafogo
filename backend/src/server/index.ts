import express from "express";
import cors from "cors";
import { criarCobrancaHandler } from "../services/assas";
import "dotenv/config";
import webhookRouter from "./webhook";

const app = express();

// Permitir requisições do localhost:5173 (seu front-end)
app.use(cors());

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post("/criar-cobranca", criarCobrancaHandler);
app.use('/webhook', webhookRouter);

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

