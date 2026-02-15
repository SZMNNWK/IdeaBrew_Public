import React, { useEffect, useState, useRef, useCallback } from 'react';
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";

import { savePlan, subscribeToDaily, subscribeToPlans } from '../services/firestoreService';
import { Calendar } from 'react-native-calendars';
import { EventRegister } from 'react-native-event-listeners';
import { generateTile } from "../services/TileService";


const tiles = [
  { id: 'FunFact', title: '🍳 Ciekawostka dnia', color: '#FFEBCC' },
  { id: 'quote', title: '💬 Cytat dnia', color: '#CCE5FF' },
  { id: 'inspiration', title: '🌟 Inspiracja dnia', color: '#D5FFD5' },
  { id: 'joke', title: '😂 Żart dnia', color: '#FFD5D5' },
];

const isoDate = (ts) => new Date(ts).toISOString().split('T')[0];

const HomeScreen = () => {
  const [userName, setUserName] = useState('Gościu');
  const [cache, setCache] = useState({});
  const [loadingTile, setLoadingTile] = useState(null);
  const [dailyItems, setDailyItems] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const fadeAnim = useRef({}).current;
  const [totalChats, setTotalChats] = useState(0);

  // inicjalizacja fadeAnim dla kafli
  useEffect(() => {
    tiles.forEach(t => {
      if (!fadeAnim[t.id]) fadeAnim[t.id] = new Animated.Value(0);
    });
  }, []);

  // pobranie nazwy użytkownika z AsyncStorage i Firebase
useEffect(() => {
  const initUserName = async () => {
    try {
      const currentUser = auth.currentUser;

      if (currentUser) {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (snap.exists() && snap.data().username) {
          setUserName(snap.data().username);
          await AsyncStorage.setItem("username", snap.data().username);
          return;
        }
      }

      const storedName = await AsyncStorage.getItem("username");
      if (storedName) {
        setUserName(storedName);
      } else if (currentUser?.displayName) {
        setUserName(currentUser.displayName);
      } else if (currentUser && !currentUser.isAnonymous) {
        setUserName("Użytkownik");
      } else {
        setUserName("Gościu");
      }
    } catch (err) {
      console.error("Błąd pobierania nazwy:", err);
      setUserName("Gościu");
    }
  };

  initUserName();
}, []);


  useEffect(() => {
  const listener = EventRegister.addEventListener('usernameChanged', (newName) => {
    setUserName(newName); 
  });

  return () => {
    EventRegister.removeEventListener(listener);
  };
}, []);
  // subskrypcja daily
  useEffect(() => {
    let unsub;
    const init = async () => {
      const uid = auth.currentUser?.uid || (await AsyncStorage.getItem('userUID'));
      if (!uid) return;
      try {
        unsub = subscribeToDaily(uid, setDailyItems);
      } catch (error) {
        console.error('Subscription error:', error);
      }
    };
    init();
    return () => unsub && unsub();
  }, []);

  // aktualizacja cache i markerów w kalendarzu
  useEffect(() => {
    const today = isoDate(new Date());
    const newCache = {};
    for (let t of tiles) {
      const found = dailyItems.find(it => it.subtype === t.id && isoDate(it.timestamp) === today);
      if (found) newCache[t.id] = found.response;
    }
    setCache(newCache);

    const marks = {};
    dailyItems.forEach(item => {
      marks[isoDate(item.timestamp)] = { marked: true, dotColor: '#2196F3' };
    });
    setMarkedDates(marks);
  }, [dailyItems]);

  // subskrypcja plans (czatów)
  useEffect(() => {
    let unsub;
    const init = async () => {
      const uid = auth.currentUser?.uid || await AsyncStorage.getItem('userUID');
      if (!uid) return;
      unsub = subscribeToPlans(uid, (plans) => {
        const chats = plans.filter(p => p.type !== 'daily');
        setTotalChats(chats.length);
      });
    };
    init();
    return () => unsub && unsub();
  }, []);


const handleTilePress = useCallback(async (id) => {
  const today = isoDate(new Date());
  if (cache[id]) return;

  setLoadingTile(id);

  try {
    // Wywołanie generateTile – bez przekazywania historii, TileService robi to sam
    const aiText = await generateTile(id);

    // Zapis do Firestore
    const uid = auth.currentUser?.uid;
    if (uid) {
      await savePlan(uid, { type: 'daily', subtype: id, response: aiText, timestamp: Date.now() });
    }

    // Aktualizacja lokalnego cache
    setCache(prev => ({ ...prev, [id]: aiText }));

  } catch (err) {
    console.error('Error generating tile content', err);
  } finally {
    setLoadingTile(null);
  }
}, [cache]);


  const dayItems = selectedDay ? dailyItems.filter(it => isoDate(it.timestamp) === selectedDay) : [];

  useEffect(() => {
    Object.entries(cache).forEach(([id, content]) => {
      if (content) {
        Animated.timing(fadeAnim[id], { toValue: 1, duration: 500, useNativeDriver: true }).start();
      }
    });
  }, [cache]);

  const calcStreak = () => {
    const today = new Date();
    const dates = Array.from(new Set(dailyItems.map(it => isoDate(it.timestamp)))).sort().reverse();
    let streak = 0;
    for (let i = 0; i < dates.length; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (dates.includes(isoDate(d))) streak++;
      else break;
    }
    return streak;
  };
  const streak = calcStreak();
  const totalDaily = dailyItems.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} >
        <Text style={styles.welcome}>Witaj{userName ? `, ${userName}` : ''}! 👋</Text>

        <Text style={styles.sectionTitle}>Kafle dnia</Text>
        <View style={styles.grid}>
          {tiles.map(t => {
            const cached = cache[t.id];
            return (
              <View key={t.id} style={styles.tileWrap}>
                {cached ? (
                  <Animated.View style={[styles.tile, styles.tileCached, { opacity: fadeAnim[t.id] }]}>
                    <Text style={styles.tileTitle}>{t.title}</Text>
                    <Text style={styles.tileContent}>{cached}</Text>
                  </Animated.View>
                ) : (
                  <TouchableOpacity style={[styles.tile, { backgroundColor: t.color }]} onPress={() => handleTilePress(t.id)} disabled={loadingTile !== null}>
                    {loadingTile === t.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.tileText}>{t.title}</Text>}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.calendarContainer}>
          <Text style={styles.sectionTitle}>Kalendarz</Text>
          <Calendar
            markedDates={{
              ...markedDates,
              ...(selectedDay ? { [selectedDay]: { selected: true, marked: true, selectedColor: '#90CAF9' } } : {}),
            }}
            onDayPress={day => setSelectedDay(day.dateString)}
            theme={{ todayTextColor: '#2196F3', arrowColor: '#2196F3' }}
          />
        </View>

        {selectedDay && (
          <View style={styles.listContainer}>
            <Text style={styles.sectionTitle}>Kafle z dnia {selectedDay}</Text>
            {dayItems.length === 0 ? <Text>Brak danych dla tego dnia</Text> : dayItems.map(item => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.type}>{item.subtype === 'quote' ? '💬 Cytat' : item.subtype === 'joke' ? '😂 Żart' : item.subtype === 'FunFact' ? '🍳 Ciekawostka' : '🌟 Inspiracja'}</Text>
                <Text>{item.response}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>📊 Twoje statystyki</Text>
          <Text>🔥 Masz serię {streak} dni pod rząd z kaflami dnia</Text>
          <Text>📦 Wygenerowałeś łącznie {totalDaily} kafli dnia</Text>
          <Text>💬 Wygenerowałeś {totalChats} czatów</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f5f5f5', paddingBottom: 60 },
  welcome: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  tileWrap: { width: '48%', marginBottom: 10 },
  tile: { borderRadius: 12, padding: 15, justifyContent: 'center', alignItems: 'center', minHeight: 80 },
  tileText: { color: '#333', fontWeight: '600' },
  tileCached: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  tileTitle: { fontWeight: 'bold', marginBottom: 5 },
  tileContent: { fontSize: 14 },
  calendarContainer: { marginBottom: 20 },
  listContainer: { marginBottom: 20 },
  card: { padding: 12, borderRadius: 12, backgroundColor: '#FFF', marginBottom: 10 },
  type: { fontWeight: 'bold', marginBottom: 4 },
  statsContainer: { padding: 12, backgroundColor: '#E3F2FD', borderRadius: 12, marginBottom: 20 },
  statsTitle: { fontWeight: 'bold', marginBottom: 4 },
});

export default HomeScreen;
