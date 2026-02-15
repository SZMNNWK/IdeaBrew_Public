import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import BottomTabNavigator from './BottomTabNavigator'; // Zmienione
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, signInAnonymously } from '../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth'; 

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const [authState, setAuthState] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const userType = await AsyncStorage.getItem('userType');
      
      if (user && !user.isAnonymous) {
        setAuthState('google');
      } 
      else if (user?.isAnonymous) {
        setAuthState('guest');
      }
      else {
        setAuthState(false);
      }
    });

    // Obsługa stanu początkowego dla gości
    const checkInitialState = async () => {
      const userType = await AsyncStorage.getItem('userType');
      if (userType === 'guest' && !auth.currentUser) {
        await signInAnonymously(auth);
      }
    };

    checkInitialState();
    
    return unsubscribe;
  }, []);

  if (authState === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {authState ? ( 
          <Stack.Screen name="Main" component={BottomTabNavigator} /> // Użyj BottomTabNavigator
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
export default AppNavigator;