const express = require('express');
const admin = require('firebase-admin');

const router = express.Router();
const db = admin.firestore();

router.post('/', async (req, res) => {
  const data = req.body;
  console.log("📩 Webhook recebido:", JSON.stringify(data, null, 2));

  const evento = data.event;
  const pagamento = data.payment;
  const metodo = pagamento?.billingType;
  const status = pagamento?.status;
  const externalId = pagamento?.externalReference;

  const isCartaoPago = evento === 'PAYMENT_CONFIRMED' && status === 'CONFIRMED';
  const isPixPago = evento === 'PAYMENT_RECEIVED' && metodo === 'PIX' && status === 'RECEIVED';

  if (!isCartaoPago && !isPixPago) {
    console.log("⏭️ Evento ignorado:", evento, "| Status:", status, "| Método:", metodo);
    return res.sendStatus(204);
  }

  if (!externalId) {
    console.warn("⚠️ externalReference ausente no webhook.");
    return res.status(400).send('externalReference ausente');
  }

  try {
    console.log(`🔄 Atualizando reserva com ID: ${externalId}`);
    
    const reservaRef = db.collection('reservas').doc(externalId);
    await reservaRef.update({
      status: 'pago',
      dataPagamento: admin.firestore.FieldValue.serverTimestamp()
    });

    const reservaSnap = await reservaRef.get();
    if (!reservaSnap.exists) {
      console.warn(`⚠️ Reserva ${externalId} não encontrada`);
      return res.sendStatus(404);
    }

    const reserva = reservaSnap.data();
    console.log(`✅ Reserva ${externalId} atualizada para 'pago'`);
    console.log(`📧 Confirmação para: ${reserva.email}`);
    
    res.sendStatus(200);

  } catch (error) {
    console.error('❌ Erro ao atualizar reserva:', error);
    res.status(500).send('Erro ao processar o webhook');
  }
});

module.exports = router;