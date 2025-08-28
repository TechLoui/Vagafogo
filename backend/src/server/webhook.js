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
    // Verificar se é ID temporário ou reserva existente
    if (externalId.startsWith('temp_')) {
      console.log(`💾 Buscando dados temporários: ${externalId}`);
      
      // Buscar dados da coleção temporária
      const tempRef = db.collection('reservas_temp').doc(externalId);
      const tempSnap = await tempRef.get();
      
      if (!tempSnap.exists) {
        console.warn(`⚠️ Dados temporários não encontrados: ${externalId}`);
        return res.sendStatus(404);
      }
      
      const dadosReserva = tempSnap.data();
      console.log(`💾 Criando reserva após pagamento confirmado:`, dadosReserva.nome);
      
      // Criar reserva definitiva
      const novaReserva = {
        ...dadosReserva,
        status: 'pago',
        dataPagamento: admin.firestore.FieldValue.serverTimestamp(),
        criadoEm: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await db.collection('reservas').add(novaReserva);
      
      // Deletar dados temporários
      await tempRef.delete();
      
      console.log(`✅ Reserva criada com ID: ${docRef.id} - Status: pago`);
      console.log(`📧 Confirmação para: ${dadosReserva.email}`);
      
    } else {
      // Reserva existente (sistema antigo)
      console.log(`🔄 Atualizando reserva existente com ID: ${externalId}`);
      
      const reservaRef = db.collection('reservas').doc(externalId);
      await reservaRef.update({
        status: 'pago',
        dataPagamento: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✅ Reserva ${externalId} atualizada para 'pago'`);
    }
    
    res.sendStatus(200);

  } catch (error) {
    console.error('❌ Erro ao atualizar reserva:', error);
    res.status(500).send('Erro ao processar o webhook');
  }
});

module.exports = router;