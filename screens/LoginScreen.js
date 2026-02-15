import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from "react-native";
import * as Google from "expo-auth-session/providers/google";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { auth } from "../firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

const LoginScreen = () => {
  const [mode, setMode] = useState("start"); // start | login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Google auth - lokalnie nie da się poprawnie skonfigurować, po wydaniu i skonfigurowaniu powinno działać
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: "IOS_CLIENT_ID",
    androidClientId: "ANDROID_CLIENT_ID",
    expoClientId: "WEB_CLIENT_ID",
    useProxy: true,
    scopes: ["openid", "profile", "email"],
  });

  useEffect(() => {
    const signInWithGoogle = async () => {
      if (response?.type === "success") {
        try {
          const { id_token, access_token } = response.params;
          const credential = GoogleAuthProvider.credential(id_token, access_token);
          const userCredential = await signInWithCredential(auth, credential);

          await AsyncStorage.setItem("userType", "google");
          await AsyncStorage.setItem("userEmail", userCredential.user.email || "");
          await AsyncStorage.setItem("userUID", userCredential.user.uid || "");
        } catch (err) {
          Alert.alert("Błąd", "Nie udało się zalogować przez Google.");
        }
      }
    };
    signInWithGoogle();
  }, [response]);

  // Email login / register
  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await AsyncStorage.setItem("userType", "email");
      await AsyncStorage.setItem("userEmail", userCredential.user.email || "");
      await AsyncStorage.setItem("userUID", userCredential.user.uid || "");
    } catch (err) {
      Alert.alert("Błąd logowania", err.message);
    }
  };

  const handleRegister = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await AsyncStorage.setItem("userType", "email");
      await AsyncStorage.setItem("userEmail", userCredential.user.email || "");
      await AsyncStorage.setItem("userUID", userCredential.user.uid || "");
    } catch (err) {
      Alert.alert("Błąd rejestracji", err.message);
    }
  };

  const handleGuest = async () => {
    try {
      const userCredential = await signInAnonymously(auth);
      await AsyncStorage.setItem("userType", "guest");
      await AsyncStorage.setItem("userUID", userCredential.user.uid || "");
    } catch (err) {
      Alert.alert("Błąd", "Nie udało się zalogować jako gość.");
    }
  };

  // Animacja tła
  const animatedValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 9000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 9000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const bgColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["#cfeeff", "#6aa6ff"],
  });

  // Animacja panelu
  const panelTranslate = useRef(new Animated.Value(24)).current;
  const panelOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(panelTranslate, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(panelOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Animacja logo
  const logoTranslate = useRef(new Animated.Value(-30)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoTranslate, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const AuthButton = ({ onPress, text, icon, iconColor = "#fff" }) => (
    <TouchableOpacity style={styles.authBtn} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={18} color={iconColor} style={{ marginRight: 10 }} />
      <Text style={styles.authBtnText}>{text}</Text>
    </TouchableOpacity>
  );

  const renderStart = () => (
    <>
      <AuthButton text="Zaloguj się" icon="log-in-outline" onPress={() => setMode("login")} />
      <AuthButton text="Zarejestruj się" icon="person-add-outline" onPress={() => setMode("register")} />

      <Text style={styles.separator}>──────  lub  ──────</Text>

      <TouchableOpacity onPress={() => promptAsync({ useProxy: true })}>
        <View style={[styles.authBtn, styles.googleBtn]}>
          <Ionicons name="logo-google" size={18} color="#DB4437" style={{ marginRight: 10 }} />
          <Text style={styles.authBtnText}>Kontynuuj przez Google</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleGuest} style={{ marginTop: 26 }}>
        <Text style={styles.guestText}>Wypróbuj bez konta</Text>
      </TouchableOpacity>
    </>
  );

  const renderForm = (type) => (
    <View style={styles.form}>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#6b6b6b8d"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Hasło"
        placeholderTextColor="#6b6b6b8d"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <AuthButton
        text={type === "login" ? "Zaloguj się" : "Zarejestruj się"}
        icon={type === "login" ? "log-in-outline" : "person-add-outline"}
        onPress={type === "login" ? handleLogin : handleRegister}
      />
      <TouchableOpacity onPress={() => setMode("start")} style={{ marginTop: 12 }}>
        <Text style={{ color: "#fff", textAlign: "center" }}>Powrót</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
      <Animated.View style={[styles.bg, { backgroundColor: bgColor }]} />

      <View style={styles.container}>
        {/* Duże animowane logo – ikona nad napisem */}
        <Animated.View style={[styles.logoContainer, { opacity: logoOpacity, transform: [{ translateY: logoTranslate }] }]}>
          <Ionicons name="cafe-outline" size={140} color="#fff" style={styles.logoIcon} />
          <Text style={styles.logoText}>IdeaBrew</Text>
        </Animated.View>

        <Animated.View style={[styles.panelWrapper, { transform: [{ translateY: panelTranslate }], opacity: panelOpacity }]}>
          <View style={styles.panelInner}>
            <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.panelContent}>
              <Text style={styles.title}>Witaj!</Text>
              {mode === "start" && renderStart()}
              {mode === "login" && renderForm("login")}
              {mode === "register" && renderForm("register")}
            </View>
          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
};
const styles = StyleSheet.create({
  root: { flex: 1 },
  bg: { ...StyleSheet.absoluteFillObject }, // animowane tło
  container: {
    flex: 1,
    justifyContent: "flex-end", 
    padding: 18,
  },

  // Duże logo – ikona nad napisem
  logoContainer: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    bottom: 0, // rozciąga na cały ekran, aby wyśrodkować zawartość
    alignItems: "center",
    zIndex: 0, 
  },
  logoIcon: {
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  logoText: {
    fontSize: 30,
    fontWeight: "700",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },

  // Panel logowania
  panelWrapper: { marginBottom: 12 },
  panelInner: {
    borderRadius: 20,
    overflow: "hidden", 
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    // delikatny cień (iOS)
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6, // cień android 
  },
  panelContent: { padding: 22 },
  title: {
    fontSize: 26,
    fontWeight: "600",
    textAlign: "center",
    color: "#fff",
    marginBottom: 18,
  },

  // Przyciski i formularz
  authBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#6b6b6b",
  },
  googleBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  authBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  separator: {
    textAlign: "center",
    marginVertical: 14,
    color: "rgba(255,255,255,0.8)",
  },
  guestText: {
    textAlign: "center",
    color: "#fff",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  form: { marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    color: "#fff",
  },
});

export default LoginScreen;