// Script para diagnosticar e corrigir problemas do Firestore
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAL-cotN2Pn58ZH4NjxWDVNdlkIjZEBfUE",
  authDomain: "banco-vaga-fogo.firebaseapp.com",
  projectId: "banco-vaga-fogo",
  storageBucket: "banco-vaga-fogo.firebasestorage.app",
  messagingSenderId: "274156176093",
  appId: "1:274156176093:web:bcc2f4f1e881b10ead9134"
};

async function diagnosticarFirestore() {
  console.log('🔧 Iniciando diagnóstico do Firestore...');
  
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('✅ Firebase inicializado com sucesso');
    console.log('📋 Configuração:', {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain
    });
    
    // Testar leitura
    console.log('📖 Testando leitura...');
    const reservasSnapshot = await getDocs(collection(db, 'reservas'));
    console.log(`📊 Reservas encontradas: ${reservasSnapshot.size}`);
    
    const pacotesSnapshot = await getDocs(collection(db, 'pacotes'));
    console.log(`📦 Pacotes encontrados: ${pacotesSnapshot.size}`);
    
    // Se não há dados, criar dados de exemplo
    if (reservasSnapshot.empty && pacotesSnapshot.empty) {
      console.log('⚠️ Banco vazio, criando dados de exemplo...');
      
      // Criar reserva de exemplo
      await setDoc(doc(db, 'reservas', 'exemplo1'), {
        nome: "João Silva",
        cpf: "123.456.789-00",
        telefone: "(11) 99999-9999",
        adultos: 2,
        criancas: 1,
        naoPagante: 0,
        bariatrica: 0,
        data: "2024-12-01",
        horario: "09:00",
        atividade: "Trilha Ecológica",
        valor: 150,
        status: "pago",
        temPet: false,
        participantes: 3
      });
      
      // Criar pacote de exemplo
      await setDoc(doc(db, 'pacotes', 'exemplo1'), {
        nome: "Trilha Ecológica",
        tipo: "Aventura",
        precoAdulto: 50,
        precoCrianca: 25,
        precoBariatrica: 60,
        horarios: ["08:00", "09:00", "14:00"],
        dias: [0, 1, 2, 3, 4, 5, 6],
        limite: 20
      });
      
      console.log('✅ Dados de exemplo criados!');
    }
    
    console.log('🎉 Diagnóstico concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
    console.error('📋 Detalhes:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
  }
}

diagnosticarFirestore();