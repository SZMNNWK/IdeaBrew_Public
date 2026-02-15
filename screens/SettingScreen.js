import React, { useEffect, useState, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from "expo-auth-session/providers/google";
import { SafeAreaView } from "react-native-safe-area-context";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import {
  GoogleAuthProvider,
  EmailAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Text,
  TextInput,
  View,
  StyleSheet,
  Pressable,
} from "react-native";
import { EventRegister } from 'react-native-event-listeners';

const LiquidCard = ({ title, onPress, color }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ width: "100%", marginBottom: 12 }}
    >
      <Animated.View
        style={[styles.card, { backgroundColor: color || "#e0e5ec", transform: [{ scale: scaleAnim }] }]}
      >
        <Text style={styles.cardText}>{title}</Text>
      </Animated.View>
    </Pressable>
  );
};

const SettingsScreen = () => {
  const [showUsername, setShowUsername] = useState(false);
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: "489706869257-k1fr795h5nncrnkmjsmctcsjnfrn7hd6.apps.googleusercontent.com",
    androidClientId: "489706869257-k1fr795h5nncrnkmjsmctcsjn7hd6.apps.googleusercontent.com",
    expoClientId: "489706869257-k1fr795h5nncrnkmjsmctcsjnfrn7hd6.apps.googleusercontent.com",
    useProxy: true,
    scopes: ["openid", "profile", "email"],
  });

  // Ładowanie nazwy użytkownika z AsyncStorage
  useEffect(() => {
  const loadUsername = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Pobierz z Firestore
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (snap.exists() && snap.data().username) {
          setUsername(snap.data().username);
          await AsyncStorage.setItem("username", snap.data().username);
          return;
        }
      }

      // fallback: AsyncStorage
      const storedName = await AsyncStorage.getItem("username");
      if (storedName) setUsername(storedName);
    } catch (err) {
      console.error("Błąd pobierania nazwy:", err);
    }
  };
  loadUsername();
}, []);


const saveUsername = async () => {
  if (!username) {
    Alert.alert('Błąd', 'Nazwa nie może być pusta');
    return;
  }

  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Błąd", "Musisz być zalogowany, aby zapisać nazwę.");
      return;
    }

    // Zapisz w Firestore
    await setDoc(doc(db, "users", currentUser.uid), {
      username
    }, { merge: true });

    // Zapisz lokalnie jako cache
    await AsyncStorage.setItem("username", username);

    EventRegister.emit('usernameChanged', username); 
    Alert.alert('Zapisano', 'Twoja nazwa została zaktualizowana');
  } catch (err) {
    console.error("Błąd zapisu nazwy:", err);
    Alert.alert("Błąd", "Nie udało się zapisać nazwy w chmurze.");
  }
};


  // Subskrypcja stanu logowania
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUserInfo(user);
      if (user) {
        await AsyncStorage.setItem("userType", user.isAnonymous ? "guest" : "google");
        if (!user.isAnonymous) {
          await AsyncStorage.setItem("userEmail", user.email || "");
        }
        await AsyncStorage.setItem("userUID", user.uid);
      }
    });
    return () => unsub();
  }, []);

  // Obsługa logowania Google dla anonimowego użytkownika
  useEffect(() => {
    const linkGoogleAccount = async () => {
      if (response?.type === "success") {
        setIsLoading(true);
        try {
          const { id_token, access_token } = response.params;
          const credential = GoogleAuthProvider.credential(id_token, access_token);
          const currentUser = auth.currentUser;

          if (currentUser && currentUser.isAnonymous) {
            try {
              const userCredential = await linkWithCredential(currentUser, credential);
              const { email, uid } = userCredential.user;

              await AsyncStorage.setItem("userType", "google");
              await AsyncStorage.setItem("userEmail", email);
              await AsyncStorage.setItem("userUID", uid);

              Alert.alert("Sukces", "Twoje konto zostało połączone z Google.");
            } catch (linkError) {
              if (linkError.code === "auth/credential-already-in-use") {
                Alert.alert("Konto już istnieje", "To konto Google jest już powiązane z innym użytkownikiem.");
              } else {
                Alert.alert("Błąd", "Nie udało się połączyć konta z Google.");
              }
            }
          } else {
            Alert.alert("Błąd", "Musisz być zalogowany jako gość, aby połączyć konto.");
          }
        } finally {
          setIsLoading(false);
        }
      }
    };
    linkGoogleAccount();
  }, [response]);

  // Obsługa logowania emailem dla anonimowego użytkownika
  const handleLinkEmail = async () => {
    if (!email || !password) {
      Alert.alert("Błąd", "Podaj email i hasło.");
      return;
    }
    setIsLoading(true);
    try {
      const credential = EmailAuthProvider.credential(email, password);
      const currentUser = auth.currentUser;

      if (currentUser && currentUser.isAnonymous) {
        try {
          const userCredential = await linkWithCredential(currentUser, credential);
          const { uid } = userCredential.user;

          await AsyncStorage.setItem("userType", "email");
          await AsyncStorage.setItem("userEmail", email);
          await AsyncStorage.setItem("userUID", uid);

          Alert.alert("Sukces", "Twoje konto zostało połączone z emailem.");
          setShowEmailForm(false);
        } catch (linkError) {
          if (linkError.code === "auth/email-already-in-use") {
            Alert.alert("Konto już istnieje", "Ten email jest już używany przez inne konto.");
          } else {
            Alert.alert("Błąd", "Nie udało się połączyć konta z emailem.");
          }
        }
      } else {
        Alert.alert("Błąd", "Musisz być zalogowany jako gość, aby połączyć konto.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Wylogowanie
  const handleLogout = async () => {
    await signOut(auth);
    await AsyncStorage.clear();
    setUserInfo(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>Ustawienia</Text>

        {/* Pole do ustawienia nazwy */}

          {!showUsername ? (
            <LiquidCard title="Zmień nazwę" onPress={() => setShowUsername(true)} color="#D5FFD5" />
            ) : (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, marginBottom: 6 }}>Twoja nazwa:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Wpisz nazwę"
                  value={username}
                  onChangeText={setUsername}
                />
                <LiquidCard title="Zapisz nazwę" onPress={saveUsername} color="#CCE5FF" />
                <LiquidCard title="Anuluj" onPress={() => setShowUsername(false)} color="#FFCCCC" />
              </View>
            )
          }

        {/* Informacje o koncie */}
        {userInfo && (
          <Text style={styles.userInfo}>
            Konto: {userInfo.isAnonymous ? "Gość" : userInfo.email}
          </Text>
        )}

        {isLoading ? (
          <ActivityIndicator size="large" color="#0000ff" style={{ marginVertical: 20 }} />
        ) : (
          <>
            {userInfo?.isAnonymous && (
              <>
                <LiquidCard title="Połącz z Google" onPress={() => promptAsync()} color="#CCE5FF" />
                {!showEmailForm ? (
                  <LiquidCard title="Połącz z Mailem" onPress={() => setShowEmailForm(true)} color="#D5FFD5" />
                ) : (
                  <View style={styles.form}>
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      value={email}
                      onChangeText={setEmail}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Hasło"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                    <LiquidCard title="Potwierdź" onPress={handleLinkEmail} color="#D5FFD5" />
                    <LiquidCard title="Anuluj" onPress={() => setShowEmailForm(false)} color="#FFCCCC" />
                  </View>
                )}
              </>
            )}

            <LiquidCard title="Wyloguj" onPress={handleLogout} color="#FFD5D5" />
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  userInfo: { fontSize: 16, marginBottom: 20 },
  form: { marginTop: 20, gap: 10 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 10 },
  card: { padding: 15, borderRadius: 16, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardText: { fontSize: 16, fontWeight: "600" },
});

export default SettingsScreen;
