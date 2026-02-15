import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../firebase';
import { signInWithCredential, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';

const LoginScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: 'com.googleusercontent.apps.489706869257-j3sq4aki2f8s4rj76kv0hj6aen64fkfv',
    expoClientId: '489706869257-k1fr795h5nncrnkmjsmctcsjnfrn7hd6.apps.googleusercontent.com',
  });

  useEffect(() => {
    let isMounted = true;
    
    const authenticate = async () => {
      if (response?.type === 'success') {
        try {
          setIsLoading(true);
          const { id_token } = response.params;
          const credential = GoogleAuthProvider.credential(id_token);
          await signInWithCredential(auth, credential);
          
          if (isMounted) {
            await AsyncStorage.setItem('userType', 'google');
          }
        } catch (error) {
          console.error("Błąd logowania:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    authenticate();
    
    return () => {
      isMounted = false;
    };
  }, [response]);

const continueAsGuest = async () => {
  setIsLoading(true);
  try {
    // 1. Najpierw logujemy jako gość w Firebase
    await signInAnonymously(auth);
    
    // 2. Potem zapisujemy typ użytkownika
    await AsyncStorage.setItem('userType', 'guest');
  } catch (error) {
    console.error("Błąd logowania gościa:", error);
  } finally {
    setIsLoading(false);
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Witaj w IdeaBrew!</Text>
      
      <Button 
        title="Zaloguj się przez Google" 
        onPress={() => promptAsync()} 
        disabled={isLoading}
      />
      
      <View style={{ height: 20 }} />
      
      <Button 
        title="Kontynuuj bez konta" 
        onPress={continueAsGuest} 
        disabled={isLoading}
      />
      
      {isLoading && <ActivityIndicator style={{ marginTop: 20 }} />}
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center'
  },
  title: {
    fontSize: 24, marginBottom: 20
  }
});