// Importar Firebase App e Firestore
import { initializeApp } from "firebase/app";
import { getFirestore, enableNetwork } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Config do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBBm3tDxQvD8SmB5AIerpe-QL-IXk1N1O4",
  authDomain: "banco-vagafogo.firebaseapp.com",
  projectId: "banco-vagafogo",
  storageBucket: "banco-vagafogo.firebasestorage.app",
  messagingSenderId: "1037581590966",
  appId: "1:1037581590966:web:35195eccc16e8f3c742117"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Instância do Firestore
const db = getFirestore(app);
const auth = getAuth(app);

// Log da configuração
console.log('🔧 Firebase inicializado:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  timestamp: new Date().toISOString()
});

// Função para testar conectividade
export const testFirebaseConnection = async () => {
  try {
    await enableNetwork(db);
    return { success: true, message: 'Conexão estabelecida' };
  } catch (error: any) {
    console.error('❌ Erro de conexão:', error);
    return { success: false, error: error.message };
  }
};

export { db, auth, app };