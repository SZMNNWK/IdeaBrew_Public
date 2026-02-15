import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth, signInAnonymously } from '../firebase';
import LoginScreen from '../screens/LoginScreen';
import PlannerScreen from '../screens/PlannerScreen';
import KitchenScreen from '../screens/KitchenScreen';
import TrainingScreen from '../screens/TrainingScreen';
import HistoryScreen from '../screens/HistoryScreen';
import BottomTabNavigator from './BottomTabNavigator';


const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const [authState, setAuthState] = useState(null);
useEffect(() => {
  console.log('Firebase user:', auth.currentUser);
  AsyncStorage.getItem('userType').then(console.log);
}, []);

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
      <Stack.Navigator>
        {authState ? (
          <>
            <Stack.Screen name="Main" component={BottomTabNavigator} options={{ headerShown: false }} />
            <Stack.Screen name="Planner" component={PlannerScreen} />
            <Stack.Screen name="Kitchen" component={KitchenScreen} />
            <Stack.Screen name="Training" component={TrainingScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
export default AppNavigator;