import { getStorage } from 'firebase/storage';
import { app } from './firebaseClient';

// Inicializa o Storage usando a mesma instância de app criada no firebaseClient.ts
// Isso previne o erro "Firebase App named '[DEFAULT]' already exists" ou erros de instância nula.
export const storage = getStorage(app);
