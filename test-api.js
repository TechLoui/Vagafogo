const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

// Inicializar Firebase Admin
let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log('Usando variável de ambiente FIREBASE_SERVICE_ACCOUNT');
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('Credenciais carregadas:', {
      project_id: serviceAccount.project_id,
      client_email: serviceAccount.client_email
    });
  } else {
    console.log('Variável FIREBASE_SERVICE_ACCOUNT não encontrada');
    throw new Error('FIREBASE_SERVICE_ACCOUNT não configurada');
  }
} catch (error) {
  console.error('Erro ao carregar credenciais:', error.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'banco-vagafogo'
});

// Usar Firestore padrão
const db = admin.firestore();
console.log('Firestore inicializado');

// GET /api/test-firebase - Testar conexão Firebase
app.get('/api/test-firebase', async (req, res) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  try {
    console.log('Testando conexão Firebase...');
    console.log('Project ID:', admin.app().options.projectId);
    console.log('Service Account Email:', admin.app().options.credential.clientEmail);
    
    // Tentar listar coleções
    const collections = await db.listCollections();
    const collectionNames = collections.map(col => col.id);
    console.log('Coleções encontradas:', collectionNames);
    
    res.json({ 
      success: true, 
      projectId: admin.app().options.projectId,
      collections: collectionNames 
    });
  } catch (error) {
    console.error('Erro no teste Firebase:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reservas - apenas reservas pagas
app.get('/api/reservas', async (req, res) => {
  // Headers para evitar cache
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  try {
    const snapshot = await db.collection('reservas').where('status', '==', 'pago').get();
    console.log('Total reservas pagas no banco:', snapshot.size);
    
    if (snapshot.empty) {
      return res.json([]);
    }
    
    const reservas = snapshot.docs.map(doc => {
      return { id: doc.id, ...doc.data() };
    });
    res.json(reservas);
  } catch (error) {
    console.error('Erro detalhado ao buscar reservas:');
    console.error('- Mensagem:', error.message);
    console.error('- Código:', error.code);
    console.error('- Stack:', error.stack);
    
    // Fallback para dados de exemplo
    res.json([
      {
        id: 'exemplo1',
        nome: 'João Silva (Erro Firebase)',
        cpf: '123.456.789-00',
        telefone: '(62) 91234-5678',
        adultos: 2,
        criancas: 1,
        naoPagante: 0,
        bariatrica: 0,
        data: '2025-08-27',
        horario: '09:00',
        atividade: 'Brunch Gastronômico',
        valor: 150,
        status: 'pago',
        participantes: 4,
        email: 'joao@email.com',
        observacao: 'Erro de conexão'
      }
    ]);
  }
});

// GET /api/pacotes
app.get('/api/pacotes', async (req, res) => {
  try {
    const snapshot = await db.collection('pacotes').get();
    
    if (snapshot.empty) {
      return res.json([]);
    }
    
    const pacotes = snapshot.docs.map(doc => {
      return { id: doc.id, ...doc.data() };
    });
    
    res.json(pacotes);
  } catch (error) {
    console.error('Erro ao buscar pacotes:', error);
    // Fallback para dados de exemplo
    res.json([
      {
        id: 'exemplo1',
        nome: 'Trilha Ecológica (Exemplo)',
        tipo: 'Aventura',
        precoAdulto: 50,
        precoCrianca: 25,
        precoBariatrica: 60,
        horarios: ['08:00', '09:00', '14:00'],
        dias: [0, 1, 2, 3, 4, 5, 6],
        limite: 20
      }
    ]);
  }
});

// POST /api/reservas - apenas para admin com status pago
app.post('/api/reservas', async (req, res) => {
  try {
    const reservaData = { ...req.body, status: 'pago' };
    const docRef = await db.collection('reservas').add(reservaData);
    res.json({ id: docRef.id, ...reservaData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pacotes
app.post('/api/pacotes', async (req, res) => {
  try {
    const docRef = await db.collection('pacotes').add(req.body);
    res.json({ id: docRef.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/reservas/:id
app.put('/api/reservas/:id', async (req, res) => {
  try {
    await db.collection('reservas').doc(req.params.id).update(req.body);
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/pacotes/:id
app.put('/api/pacotes/:id', async (req, res) => {
  try {
    await db.collection('pacotes').doc(req.params.id).update(req.body);
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/reservas/:id
app.delete('/api/reservas/:id', async (req, res) => {
  try {
    await db.collection('reservas').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/pacotes/:id
app.delete('/api/pacotes/:id', async (req, res) => {
  try {
    await db.collection('pacotes').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/atividades
app.get('/api/atividades', async (req, res) => {
  try {
    const snapshot = await db.collection('Atividades').get();
    const atividades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(atividades);
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    res.json([]);
  }
});

// GET /api/dias-fechados
app.get('/api/dias-fechados', async (req, res) => {
  try {
    const snapshot = await db.collection('Dias_fechados').get();
    const dias = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(dias);
  } catch (error) {
    console.error('Erro ao buscar dias fechados:', error);
    res.json([]);
  }
});

// GET /api/usuarios
app.get('/api/usuarios', async (req, res) => {
  try {
    const snapshot = await db.collection('Usuario').get();
    const usuarios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(usuarios);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.json([]);
  }
});

// GET /api/clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const snapshot = await db.collection('clientes').get();
    const clientes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(clientes);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.json([]);
  }
});

// GET /api/test - Criar dados de teste
app.get('/api/test', async (req, res) => {
  try {
    // Criar reserva de teste
    await db.collection('reservas').add({
      nome: 'João Silva',
      cpf: '123.456.789-00',
      telefone: '(11) 99999-9999',
      adultos: 2,
      criancas: 1,
      naoPagante: 0,
      bariatrica: 0,
      data: '2025-08-27',
      horario: '09:00',
      atividade: 'Trilha Ecológica',
      valor: 150,
      status: 'pago',
      temPet: false
    });
    
    // Criar pacote de teste
    await db.collection('pacotes').add({
      nome: 'Trilha Ecológica',
      tipo: 'Aventura',
      precoAdulto: 50,
      precoCrianca: 25,
      precoBariatrica: 60,
      horarios: ['08:00', '09:00', '14:00'],
      dias: [0, 1, 2, 3, 4, 5, 6],
      limite: 20
    });
    
    res.json({ success: true, message: 'Dados de teste criados!' });
  } catch (error) {
    console.error('Erro ao criar dados de teste:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/status - Status da API
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    project: process.env.FIREBASE_SERVICE_ACCOUNT ? 'Connected' : 'No credentials'
  });
});

// GET /api/test-webhook - Simular webhook de pagamento
app.get('/api/test-webhook', async (req, res) => {
  try {
    const testData = {
      event: 'PAYMENT_CONFIRMED',
      payment: {
        id: 'test_payment_123',
        status: 'CONFIRMED',
        billingType: 'CREDIT_CARD',
        externalReference: 'test_' + Date.now(),
        value: 100,
        description: 'Trilha Ecológica - 2025-01-15 09:00 - 2p - Pet:false',
        customer: {
          name: 'João Teste',
          email: 'teste@email.com',
          cpfCnpj: '123.456.789-00',
          phone: '(11) 99999-9999'
        }
      }
    };
    
    // Simular o webhook
    const webhookResponse = await fetch(`http://localhost:${PORT}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    res.json({ 
      success: true, 
      message: 'Webhook de teste enviado',
      status: webhookResponse.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook simples em JavaScript
app.post('/webhook', async (req, res) => {
  const data = req.body;
  console.log("📩 WEBHOOK RECEBIDO - TIMESTAMP:", new Date().toISOString());
  console.log("📩 Webhook dados:", JSON.stringify(data, null, 2));

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
    console.log(`🔄 Criando reserva com ID: ${externalId}`);
    
    // Buscar dados do pagamento no Asaas
    const paymentResponse = await fetch(`https://api.asaas.com/v3/payments/${pagamento.id}`, {
      headers: {
        'access_token': process.env.ASAAS_API_KEY,
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
    
    const dataReserva = dataHorario.split(' ')[0] || new Date().toISOString().slice(0, 10);
    const horario = dataHorario.split(' ')[1] || 'Sem horário';
    const participantes = parseInt(participantesInfo.replace('p', '')) || 1;
    const temPet = petInfo.includes('true');
    
    // Criar reserva no Firebase
    const reservaData = {
      nome: customer.name,
      email: customer.email,
      cpf: customer.cpfCnpj,
      telefone: customer.phone,
      valor: paymentData.value,
      atividade,
      data: dataReserva,
      horario,
      participantes,
      temPet,
      status: 'pago',
      dataPagamento: new Date(),
      criadoEm: new Date(),
    };
    
    await db.collection('reservas').doc(externalId).set(reservaData);
    console.log(`✅ RESERVA CRIADA NO FIREBASE: ${externalId}`);
    console.log(`📊 Dados salvos:`, JSON.stringify(reservaData, null, 2));
    
    res.sendStatus(200);

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    res.status(500).send('Erro ao processar o webhook');
  }
});

// Importar e adicionar a rota de cobrança
const { criarCobrancaHandler } = require('./backend/src/services/assas.js');
require('dotenv/config');

app.post('/criar-cobranca', criarCobrancaHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
  console.log('Token Asaas carregado:', process.env.ASAAS_API_KEY ? 'SIM' : 'NÃO');
});

module.exports = app;