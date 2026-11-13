// Firebase bağlantısı. Başka dosyalar Firebase'i doğrudan değil, buradan alır.
import { FIREBASE_CONFIG } from './config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential,
  multiFactor, TotpMultiFactorGenerator, getMultiFactorResolver
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore, doc, getDoc, getDocs, collection, query, where, writeBatch, serverTimestamp, arrayUnion, increment
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

export const app = initializeApp(FIREBASE_CONFIG);
export const auth = getAuth(app);
export const db = getFirestore(app);

// İkinci bağlantı: yönetici yeni kişi eklerken kendi oturumu kapanmasın diye
// yeni hesap bu ikinci bağlantıda açılır.
const app2 = initializeApp(FIREBASE_CONFIG, 'ek');
export const auth2 = getAuth(app2);

export {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential,
  multiFactor, TotpMultiFactorGenerator, getMultiFactorResolver,
  doc, getDoc, getDocs, collection, query, where, writeBatch, serverTimestamp, arrayUnion, increment
};
