// Importar Firebase App e Firestore
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Config do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAL-cotN2Pn58ZH4NjxWDVNdlkIjZEBfUE",
  authDomain: "banco-vaga-fogo.firebaseapp.com",
  projectId: "banco-vaga-fogo",
  storageBucket: "banco-vaga-fogo.firebasestorage.app",
  messagingSenderId: "274156176093",
  appId: "1:274156176093:web:bcc2f4f1e881b10ead9134"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Instância do Firestore para usar no projeto
export const db = getFirestore(app);

// Se precisar usar o app em outros lugares:
export { app };
