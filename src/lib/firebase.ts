import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfigFallback from '../../firebase-applet-config.json';

// Support Vercel production environments by checking environment overrides first, falling back to JSON schema.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigFallback.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigFallback.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigFallback.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigFallback.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigFallback.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigFallback.appId,
};

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfigFallback.firestoreDatabaseId;

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// @ts-ignore
export const db = getFirestore(app, databaseId);

/**
 * Validation de la connexion au démarrage
 */
async function testConnection() {
  try {
    // Tentative de lecture d'un document inexistant pour tester la connectivité
    await getDocFromServer(doc(db, '_internal', 'connection-test'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error("Firebase semble hors-ligne. Vérifiez votre configuration.");
    }
  }
}

testConnection();
