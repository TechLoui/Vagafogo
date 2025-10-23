import { Router } from 'express';
import { db } from '../services/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { enviarEmailConfirmacao } from '../services/emailService';

const router = Router();

router.post('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const data = req.body;
    console.log("📩 Webhook recebido:", data?.event, data?.payment?.status);
    
    const evento = data?.event;
    const pagamento = data?.payment;
    const status = pagamento?.status;
    const externalId = pagamento?.externalReference;
    
    // Verificar se é evento de pagamento
    const isPagamento = (evento === 'PAYMENT_CONFIRMED' && status === 'CONFIRMED') || 
                       (evento === 'PAYMENT_RECEIVED' && status === 'RECEIVED');
    
    if (!isPagamento || !externalId) {
      console.log("⏭️ Evento ignorado ou sem externalId");
      return res.status(200).send('OK');
    }
    
    // Timeout de segurança - 8 segundos
    const timeout = setTimeout(() => {
      console.warn("⚠️ Timeout de 8s atingido, respondendo mesmo assim");
      if (!res.headersSent) {
        res.status(200).send('OK');
      }
    }, 8000);
    
    // Processar pagamento
    const reservaRef = doc(db, 'reservas', externalId);
    await updateDoc(reservaRef, {
      status: 'pago',
      dataPagamento: new Date()
    });
    
    console.log(`✅ Status atualizado: ${externalId}`);
    
    // Limpar timeout
    clearTimeout(timeout);
    
    // Responder se ainda não respondeu
    if (!res.headersSent) {
      const elapsed = Date.now() - startTime;
      console.log(`⏱️ Processado em ${elapsed}ms`);
      res.status(200).send('OK');
    }
    
    // Email em background (não bloqueia resposta)
    setImmediate(async () => {
      try {
        const reservaSnap = await getDoc(reservaRef);
        if (reservaSnap.exists()) {
          const reserva = reservaSnap.data();
          await enviarEmailConfirmacao({
            nome: reserva.nome,
            email: reserva.email,
            atividade: reserva.atividade,
            data: reserva.data,
            horario: reserva.horario,
            participantes: reserva.participantes,
          });
          console.log(`✉️ Email enviado: ${reserva.email}`);
        }
      } catch (emailError) {
        console.error('❌ Erro no email:', emailError);
      }
    });
    
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    if (!res.headersSent) {
      res.status(200).send('OK'); // Sempre responder 200 mesmo com erro
    }
  }
});


export default router;
