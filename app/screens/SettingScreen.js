import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../firebase';

const SettingScreen = () => {
  const logout = async () => {
    try {
      await auth.signOut();
      await AsyncStorage.removeItem('userType');
    } catch (error) {
      console.error("Błąd podczas wylogowywania:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ustawienia</Text>
      <Button title="Wyloguj się" onPress={logout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    marginBottom: 20
  }
});

export default SettingScreen;