const express = require('express');
const admin = require('firebase-admin');

const router = express.Router();
const db = admin.firestore();

router.post('/', async (req, res) => {
  const data = req.body;
  console.log("📩 WEBHOOK CHAMADO - Evento:", data.event, "Status:", data.payment?.status, "ID:", data.payment?.externalReference);

  const evento = data.event;
  const pagamento = data.payment;
  const metodo = pagamento?.billingType;
  const status = pagamento?.status;
  const externalId = pagamento?.externalReference;

  const isCartaoPago = evento === 'PAYMENT_CONFIRMED' && status === 'CONFIRMED';
  const isPixPago = evento === 'PAYMENT_RECEIVED' && metodo === 'PIX' && status === 'RECEIVED';

  if (!isCartaoPago && !isPixPago) {
    return res.sendStatus(204);
  }

  if (!externalId) {
    console.warn("⚠️ externalReference ausente no webhook.");
    return res.status(400).send('externalReference ausente');
  }

  try {
    // Verificar se é ID temporário ou reserva existente
    // Atualizar status para aguardando (pago)
    const reservaRef = db.collection('reservas').doc(externalId);
    await reservaRef.update({
      status: 'aguardando',
      dataPagamento: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Reserva paga: ${externalId}`);
    
    res.sendStatus(200);

  } catch (error) {
    console.error('❌ Erro ao atualizar reserva:', error);
    res.status(500).send('Erro ao processar o webhook');
  }
});

module.exports = router;