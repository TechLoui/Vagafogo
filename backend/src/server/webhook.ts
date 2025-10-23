import { Router } from 'express';
import { db } from '../services/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { enviarEmailConfirmacao } from '../services/emailService';

const router = Router();

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
  const isPagamentoRecebido = evento === 'PAYMENT_RECEIVED' && status === 'RECEIVED';

  if (!isCartaoPago && !isPixPago && !isPagamentoRecebido) {
    console.log("⏭️ Evento ignorado:", evento, "| Status:", status, "| Método:", metodo);
    return res.sendStatus(204);
  }

  if (!externalId) {
    console.warn("⚠️ externalReference ausente no webhook.");
    return res.status(400).send('externalReference ausente');
  }

  // ⚡ RESPONDER IMEDIATAMENTE para evitar timeout
  res.sendStatus(200);
  
  // 🔄 Processar de forma assíncrona
  processarPagamentoAsync(externalId, { evento, status, metodo });
});

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout após ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

async function processarPagamentoAsync(externalId: string, info: any) {
  try {
    console.log(`🔄 Processando pagamento: ${externalId}`, info);
    
    const reservaRef = doc(db, 'reservas', externalId);
    
    // ⚡ Atualizar com timeout de 5s
    await withTimeout(
      updateDoc(reservaRef, {
        status: 'pago',
        dataPagamento: new Date()
      }),
      5000
    );

    // ⚡ Buscar dados com timeout de 3s
    const reservaSnap = await withTimeout(getDoc(reservaRef), 3000);
    
    if (!reservaSnap.exists()) {
      console.warn(`⚠️ Reserva ${externalId} não encontrada`);
      return;
    }

    const reserva = reservaSnap.data();

    // ⚡ Enviar email com timeout de 10s
    await withTimeout(
      enviarEmailConfirmacao({
        nome: reserva.nome,
        email: reserva.email,
        atividade: reserva.atividade,
        data: reserva.data,
        horario: reserva.horario,
        participantes: reserva.participantes,
      }),
      10000
    );

    console.log(`✅ Processamento completo para: ${reserva.email}`);

  } catch (error) {
    console.error('❌ Erro no processamento assíncrono:', error);
  }
}

export default router;
