// firebaseConfig.js
import { initializeApp } from 'firebase/app';
//import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCytrw08ivmpNDrfnw6xvaRkmyUgECqAIk",
  authDomain: "ideabrew.firebaseapp.com",
  projectId: "ideabrew",
  storageBucket: "ideabrew.firebasestorage.app",
  messagingSenderId: "489706869257",
  appId: "1:489706869257:web:8120553328e400e0185ed8"
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
// było: const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
