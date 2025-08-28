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
    // Tentar fazer parse dos dados da reserva
    let dadosReserva;
    try {
      dadosReserva = JSON.parse(externalId);
      console.log(`💾 Criando reserva após pagamento confirmado:`, dadosReserva.nome);
    } catch (parseError) {
      // Se não conseguir fazer parse, é um ID de reserva existente
      console.log(`🔄 Atualizando reserva existente com ID: ${externalId}`);
      
      const reservaRef = db.collection('reservas').doc(externalId);
      await reservaRef.update({
        status: 'pago',
        dataPagamento: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✅ Reserva ${externalId} atualizada para 'pago'`);
      return res.sendStatus(200);
    }

    // Criar nova reserva com status 'pago'
    const novaReserva = {
      ...dadosReserva,
      status: 'pago',
      dataPagamento: admin.firestore.FieldValue.serverTimestamp(),
      criadoEm: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('reservas').add(novaReserva);
    console.log(`✅ Reserva criada com ID: ${docRef.id} - Status: pago`);
    console.log(`📧 Confirmação para: ${dadosReserva.email}`);
    
    res.sendStatus(200);

  } catch (error) {
    console.error('❌ Erro ao atualizar reserva:', error);
    res.status(500).send('Erro ao processar o webhook');
  }
});

module.exports = router;