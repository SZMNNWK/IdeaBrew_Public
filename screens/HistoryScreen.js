import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Button, FlatList, StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { auth } from '../firebase';
import { subscribeToPlans, deletePlan } from '../services/firestoreService';

const HistoryScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all'); // all | plan | recipe | training
  const [expanded, setExpanded] = useState({}); // do rozwijania podglądu

  useEffect(() => {
    let unsub = null;
    (async () => {
      const userUID = auth.currentUser?.uid || await AsyncStorage.getItem('userUID');
      if (!userUID) return;
      unsub = subscribeToPlans(userUID, setItems);
    })();
    return () => unsub?.();
  }, []);

  const handleDelete = async (id) => {
    const uid = auth.currentUser?.uid || await AsyncStorage.getItem('userUID');
    if (!uid) return;
    await deletePlan(uid, id);
  };

  const handleOpen = (item) => {
    if (item.type === 'plan') navigation.navigate('Planner', { planData: item });
    else if (item.type === 'recipe') navigation.navigate('Kitchen', { planData: item });
    else if (item.type === 'training') navigation.navigate('Training', { planData: item });
  };

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredItems = items.filter((item) => {
    if (item.type === 'daily') return false; // pomiń kafle dnia
    if (filter === 'all') return true;
    return item.type === filter;
  });

  const FilterButton = ({ label, value }) => (
    <TouchableOpacity
      style={[styles.filterBtn, filter === value && styles.filterBtnActive]}
      onPress={() => setFilter(value)}
      activeOpacity={0.7}
    >
      <Text style={filter === value ? styles.filterTextActive : styles.filterText}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.date}>
        {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString()} •{' '}
        {item.type === 'plan' ? 'Plan' : item.type === 'recipe' ? 'Przepis' : item.type === 'training' ? 'Trening' : 'Inne'}
      </Text>

      <Text
        style={styles.text}
        numberOfLines={expanded[item.id] ? undefined : 3}
        onPress={() => toggleExpand(item.id)}
      >
        {item.response}
      </Text>

      <View style={styles.btnRow}>
        <Button title="Otwórz" onPress={() => handleOpen(item)} />
        <Button title="Usuń" color="red" onPress={() => handleDelete(item.id)} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Historia czatów</Text>

      <View style={{ marginBottom: 15 }}>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 5 }}>
          <View style={styles.filterRow}>
            <FilterButton label="Wszystko" value="all" />
            <FilterButton label="Aktywności" value="plan" />
            <FilterButton label="Przepisy" value="recipe" />
            <FilterButton label="Plany treningowe" value="training" />
          </View>
        </ScrollView>
      </View>


      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        initialNumToRender={5}
        showsVerticalScrollIndicator={false} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#fff' },
  heading: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  filterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    marginHorizontal: 5,
  },
  filterBtnActive: { backgroundColor: 'tomato', borderColor: 'tomato' },
  filterText: { color: '#555' },
  filterTextActive: { color: '#fff', fontWeight: 'bold' },
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
  },
  date: { fontSize: 12, color: '#666', marginBottom: 5 },
  text: { fontSize: 14, marginBottom: 10 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between' },
});

export default HistoryScreen;
