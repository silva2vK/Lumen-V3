import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBngjjfMrWg7O9TABuQNI0rlq-ktce9U30",
  authDomain: "historiaacessivel-ii.firebaseapp.com",
  projectId: "historiaacessivel-ii",
  storageBucket: "historiaacessivel-ii.firebasestorage.app",
  messagingSenderId: "652479717072",
  appId: "1:652479717072:web:49b1824c113c67faed08d5"
};

// Inicializa a aplicação Firebase (Singleton)
export const app = initializeApp(firebaseConfig);

// Inicializa o serviço de Autenticação
export const auth = getAuth(app);

// Inicializa o Firestore com persistência offline robusta
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
