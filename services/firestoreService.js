import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';


export const savePlan = async (uid, planObj) => {
  if (!uid) throw new Error('Brak UID użytkownika – plan nie może zostać zapisany.');
  const colRef = collection(db, 'users', uid, 'plans');

  const docRef = await addDoc(colRef, {
    ...planObj,
    type: planObj.type || 'plan',
    timestamp: planObj.timestamp || Date.now(),
    createdAt: serverTimestamp(), // dodatkowy Firestore timestamp do sortowania
  });

  return docRef.id;
};

export const updatePlan = async (uid, planId, patch) => {
  if (!uid || !planId) throw new Error('Brak UID lub ID planu.');
  const docRef = doc(db, 'users', uid, 'plans', planId);
  await setDoc(
    docRef,
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const deletePlan = async (uid, planId) => {
  if (!uid || !planId) throw new Error('Brak UID lub ID planu.');
  const docRef = doc(db, 'users', uid, 'plans', planId);
  await deleteDoc(docRef);
};

export const subscribeToPlans = (uid, onUpdate) => {
  if (!uid) {
    console.warn('Brak UID – subskrypcja nie została uruchomiona.');
    return () => {};
  }

  const q = query(
    collection(db, 'users', uid, 'plans'),
    orderBy('timestamp', 'desc')
  );

  const unsub = onSnapshot(
    q,
    (snapshot) => {
      const plans = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      onUpdate(plans);
    },
    (err) => {
      console.error('Plans subscription error', err);
      onUpdate([]);
    }
  );
  return unsub;
};

export const subscribeToDaily = (uid, onUpdate) => {
  if (!uid) {
    console.warn('subscribeToDaily: brak UID');
    return () => {};
  }

  const colRef = collection(db, 'users', uid, 'plans');

  const unsub = onSnapshot(
    colRef,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const daily = items
        .filter((it) => it.type === 'daily')
        .sort((a, b) => b.timestamp - a.timestamp);

      onUpdate(daily);
    },
    (err) => {
      console.error('subscribeToDaily error', err);
      onUpdate([]);
    }
  );

  return unsub;
};
