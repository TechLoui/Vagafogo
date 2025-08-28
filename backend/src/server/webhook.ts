import { Router } from 'express';
import { db } from '../services/firebase';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
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

  if (!isCartaoPago && !isPixPago) {
    console.log("⏭️ Evento ignorado:", evento, "| Status:", status, "| Método:", metodo);
    return res.sendStatus(204); // Ignora eventos não relacionados a pagamento confirmado
  }

  if (!externalId) {
    console.warn("⚠️ externalReference ausente no webhook.");
    return res.status(400).send('externalReference ausente');
  }

  try {
    console.log(`🔄 Criando reserva com ID: ${externalId}`);
    
    // Buscar dados do pagamento no Asaas para obter informações da reserva
    const paymentResponse = await fetch(`https://api.asaas.com/v3/payments/${pagamento.id}`, {
      headers: {
        'access_token': process.env.ASAAS_API_KEY!,
      },
    });
    
    if (!paymentResponse.ok) {
      console.error('Erro ao buscar dados do pagamento');
      return res.sendStatus(500);
    }
    
    const paymentData = await paymentResponse.json();
    const customer = paymentData.customer;
    
    // Extrair dados da reserva da descrição
    const description = paymentData.description || '';
    const parts = description.split(' - ');
    const atividade = parts[0] || 'Atividade';
    const dataHorario = parts[1] || '';
    const participantesInfo = parts[2] || '1p';
    const petInfo = parts[3] || 'Pet:false';
    
    const data = dataHorario.split(' ')[0] || new Date().toISOString().slice(0, 10);
    const horario = dataHorario.split(' ')[1] || 'Sem horário';
    const participantes = parseInt(participantesInfo.replace('p', '')) || 1;
    const temPet = petInfo.includes('true');
    
    // Criar reserva no Firebase apenas após pagamento confirmado
    const reservaRef = doc(db, 'reservas', externalId);
    const reservaData = {
      nome: customer.name,
      email: customer.email,
      cpf: customer.cpfCnpj,
      telefone: customer.phone,
      valor: paymentData.value,
      atividade,
      data,
      horario,
      participantes,
      temPet,
      status: 'pago',
      dataPagamento: new Date(),
      criadoEm: new Date(),
    };
    
    await setDoc(reservaRef, reservaData);
    
    const reserva = reservaData;

    await enviarEmailConfirmacao({
      nome: reserva.nome,
      email: reserva.email,
      atividade: reserva.atividade,
      data: reserva.data,
      horario: reserva.horario,
      participantes: reserva.participantes,
    });

    console.log(`✅ E-mail de confirmação enviado para: ${reserva.email}`);
    res.sendStatus(200);

  } catch (error) {
    console.error('❌ Erro ao atualizar reserva ou enviar e-mail:', error);
    res.status(500).send('Erro ao processar o webhook');
  }
});

export default router;
