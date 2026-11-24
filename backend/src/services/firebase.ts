// Importar Firebase App e Firestore
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, inMemoryPersistence, setPersistence, signInWithCustomToken } from "firebase/auth";
import { obterAuthAdmin } from "./firebaseAdmin";
import { criarInicializadorFirebaseBackend } from "./backendFirebaseAuth";

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

// Instância do Firestore para usar no projeto
export const db = getFirestore(app);

// Called by server startup before accepting requests or starting background work.
// This session is never exposed through an HTTP response or browser configuration.
export const initializeBackendFirebaseAuth = criarInicializadorFirebaseBackend({
  getAdminAuth: obterAuthAdmin,
  signIn: async (token) => {
    const auth = getAuth(app);
    await setPersistence(auth, inMemoryPersistence);
    return signInWithCustomToken(auth, token);
  },
});

// Se precisar usar o app em outros lugares:
export { app };
