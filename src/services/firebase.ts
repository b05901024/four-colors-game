import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  setDoc,
  serverTimestamp,
  orderBy,
  query,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { Level } from '../types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const BOOTSTRAP_EMAIL = import.meta.env.VITE_OWNER_EMAIL || '';

let app: ReturnType<typeof initializeApp> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

function initFirebase() {
  if (app) return { app, db, auth };

  if (!firebaseConfig.apiKey) {
    console.error('No Firebase config. Check .env file.');
    return { app: null, db: null, auth: null };
  }

  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    return { app, db, auth };
  } catch (error) {
    console.error('Firebase init failed:', error);
    return { app: null, db: null, auth: null };
  }
}

// Auth
export function onAuthChange(callback: (user: User | null) => void) {
  const { auth } = initFirebase();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle(): Promise<User | null> {
  const { auth } = initFirebase();
  if (!auth) return null;

  try {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    return result.user;
  } catch (error) {
    console.error('Sign in failed:', error);
    return null;
  }
}

export function signOut() {
  const { auth } = initFirebase();
  if (auth) auth.signOut();
}

export function getCurrentUser(): User | null {
  const { auth } = initFirebase();
  return auth?.currentUser || null;
}

// Owner management
export async function isOwner(user: User | null): Promise<boolean> {
  if (!user?.email) return false;
  const { db } = initFirebase();
  if (!db) return false;

  try {
    const docSnap = await getDoc(doc(db, 'owners', user.email));
    return docSnap.exists();
  } catch {
    return false;
  }
}

export async function bootstrapOwner(): Promise<void> {
  if (!BOOTSTRAP_EMAIL) return;
  const { db } = initFirebase();
  if (!db) return;

  try {
    const docSnap = await getDoc(doc(db, 'owners', BOOTSTRAP_EMAIL));
    if (!docSnap.exists()) {
      await setDoc(doc(db, 'owners', BOOTSTRAP_EMAIL), {
        email: BOOTSTRAP_EMAIL,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.warn('Bootstrap owner failed:', error);
  }
}

export async function addOwner(email: string): Promise<boolean> {
  const { db } = initFirebase();
  if (!db) return false;

  try {
    await setDoc(doc(db, 'owners', email), {
      email,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function removeOwner(email: string): Promise<boolean> {
  const { db } = initFirebase();
  if (!db) return false;

  try {
    await deleteDoc(doc(db, 'owners', email));
    return true;
  } catch {
    return false;
  }
}

export async function getOwners(): Promise<string[]> {
  const { db } = initFirebase();
  if (!db) return [];

  try {
    const snapshot = await getDocs(collection(db, 'owners'));
    return snapshot.docs.map(d => d.id);
  } catch {
    return [];
  }
}

// Levels
const LEVELS_COLLECTION = 'levels';

export async function getAllLevels(): Promise<Level[]> {
  const { db } = initFirebase();
  if (!db) return [];

  try {
    const q = query(collection(db, LEVELS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Level[];
  } catch (error) {
    console.error('Failed to fetch levels:', error);
    return [];
  }
}

export async function getLevel(levelId: string): Promise<Level | null> {
  const { db } = initFirebase();
  if (!db) return null;

  try {
    const docSnap = await getDoc(doc(db, LEVELS_COLLECTION, levelId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Level;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch level:', error);
    return null;
  }
}

export async function addLevel(level: Omit<Level, 'id'>): Promise<string> {
  const { db } = initFirebase();
  if (!db) throw new Error('Firebase not initialized');

  const docRef = await addDoc(collection(db, LEVELS_COLLECTION), {
    ...level,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateLevel(levelId: string, updates: Partial<Level>): Promise<boolean> {
  const { db } = initFirebase();
  if (!db) return false;

  try {
    await updateDoc(doc(db, LEVELS_COLLECTION, levelId), updates);
    return true;
  } catch (error) {
    console.error('Failed to update level:', error);
    return false;
  }
}

export async function deleteLevel(levelId: string): Promise<boolean> {
  const { db } = initFirebase();
  if (!db) return false;

  try {
    await deleteDoc(doc(db, LEVELS_COLLECTION, levelId));
    return true;
  } catch (error) {
    console.error('Failed to delete level:', error);
    return false;
  }
}

// Attempts
export async function saveAttempt(attempt: {
  levelId: string;
  completed: boolean;
  timeSpent: number;
  errorCount: number;
  playerName: string;
  playerPhone?: string;
  firstDrawTime?: number;
  avgPauseTime?: number;
  maxPauseTime?: number;
}): Promise<boolean> {
  const { db } = initFirebase();
  if (!db) return false;

  try {
    const data: Record<string, any> = {
      ...attempt,
      timestamp: serverTimestamp(),
    };
    // Remove undefined fields (Firestore doesn't support undefined)
    Object.keys(data).forEach(key => {
      if (data[key] === undefined) delete data[key];
    });
    await addDoc(collection(db, 'attempts'), data);
    return true;
  } catch (error) {
    console.error('Failed to save attempt:', error);
    return false;
  }
}

export async function getAttempts(): Promise<any[]> {
  const { db } = initFirebase();
  if (!db) return [];

  try {
    const q = query(collection(db, 'attempts'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Failed to fetch attempts:', error);
    return [];
  }
}

export async function deleteAttempt(attemptId: string): Promise<boolean> {
  const { db } = initFirebase();
  if (!db) return false;

  try {
    await deleteDoc(doc(db, 'attempts', attemptId));
    return true;
  } catch (error) {
    console.error('Failed to delete attempt:', error);
    return false;
  }
}
