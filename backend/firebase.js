"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.admin = exports.db = void 0;
// Usar Admin SDK no backend
const firebase_admin_1 = __importDefault(require("firebase-admin"));
exports.admin = firebase_admin_1.default;
// Inicializar Admin SDK se ainda não foi inicializado
if (!firebase_admin_1.default.apps.length) {
    const serviceAccount = require('../banco-vaga-fogo-firebase-adminsdk-fbsvc-8bef52c2d8.json');
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert(serviceAccount),
        projectId: 'banco-vaga-fogo'
    });
}
// Instância do Firestore Admin
exports.db = firebase_admin_1.default.firestore();
