import React from 'react';
import { Button, StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from '@react-navigation/native';

const ProjectScreen = () => {
  const navigation = useNavigation();

  const projects = [
    { title: 'Planer czasu wolnego', screen: 'Planner', emoji: '🗓️' },
    { title: 'Przepisy kuchenne', screen: 'Kitchen', emoji: '👨‍🍳' },
    { title: 'Planer treningów', screen: 'Training', emoji: '🏋️' },
    { title: 'Historia planów', screen: 'History', emoji: '📜' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Projekty</Text>
        {projects.map((p, index) => (
          <TouchableOpacity
            key={index}
            style={styles.card}
            onPress={() => navigation.navigate(p.screen)}
          >
            <Text style={styles.cardText}>
              {p.emoji} {p.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    flexGrow: 1,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  card: {
    width: '100%',
    backgroundColor: '#e0e5ec',
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});

export default ProjectScreen;
