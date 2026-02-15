import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import * as Location from 'expo-location';
import { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { auth } from '../firebase';
import { savePlan } from '../services/firestoreService';

const LiquidCard = ({ children, style }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();
  };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} style={{ width: "100%" }}>
      <Animated.View style={[styles.liquidCard, style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

const AccordionSection = ({ title, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <LiquidCard style={styles.accordionSection}>
      <TouchableOpacity onPress={() => setOpen(!open)}>
        <Text style={styles.accordionTitle}>
          {title} {open ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>
      {open && <View style={styles.accordionContent}>{children}</View>}
    </LiquidCard>
  );
};

const PlannerScreen = ({ route }) => {
  const planData = route?.params?.planData || null;
  const isHistoryMode = !!planData;
  const scrollRef = useRef(null);

  // form states
  const [selectedType, setSelectedType] = useState('');
  const [durationAmount, setDurationAmount] = useState('1');
  const [durationUnit, setDurationUnit] = useState('godzin');
  const [participants, setParticipants] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [useLocation, setUseLocation] = useState(false);
  const [locationCoords, setLocationCoords] = useState(null);
  const [radius, setRadius] = useState('');
  const [budget, setBudget] = useState('');
  const [transport, setTransport] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [plan, setPlan] = useState(planData?.response || '');
  const [withHours, setWithHours] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChildren, setHasChildren] = useState(false);
  const [childrenAges, setChildrenAges] = useState('');
  const [activityLevel, setActivityLevel] = useState('3');
  const [weather, setWeather] = useState('bez znaczenia');
  const [includeMeals, setIncludeMeals] = useState(false);
  const [needBreaks, setNeedBreaks] = useState(false);
  const [planFormat, setPlanFormat] = useState('lista'); // lista, opisowa, tabela
  const [includeChecklist, setIncludeChecklist] = useState(false);
  const [includeMap, setIncludeMap] = useState(false);
  const [includeAlternatives, setIncludeAlternatives] = useState(false);

  // Inicjalizacja z historii
  useEffect(() => {
    if (planData?.meta) {
      setSelectedType(planData.meta.type || '');
      if (planData.meta.duration) {
        const [num, unit] = planData.meta.duration.split(' ');
        setDurationAmount(num || '1');
        setDurationUnit(unit || 'godzin');
      }
      setParticipants(planData.meta.participants || '');
      setBudget(planData.meta.budget || '');
      setTransport(planData.meta.transport || '');
      setWithHours(planData.meta.withHours || false);
      setCustomNotes(planData.meta.customNotes || '');
      setLocationCoords(planData.meta.location || null);
      setRadius(planData.meta.radius || '');
      setHasChildren(planData.meta.hasChildren || false);
      setChildrenAges(planData.meta.childrenAges || '');
      setActivityLevel(planData.meta.activityLevel || '3');
      setWeather(planData.meta.weather || 'bez znaczenia');
      setIncludeMeals(planData.meta.includeMeals || false);
      setNeedBreaks(planData.meta.needBreaks || false);
      setPlanFormat(planData.meta.planFormat || 'lista');
      setIncludeChecklist(planData.meta.includeChecklist || false);
      setIncludeMap(planData.meta.includeMap || false);
      setIncludeAlternatives(planData.meta.includeAlternatives || false);
    }
  }, [planData]);
const buildPrompt = () => {
  const fullDuration = `${durationAmount} ${durationUnit}`;
  const formattedDate = date.toLocaleString();
  
  // Lokalizacja
  let locationText = '';
  if (useLocation && locationCoords) {
    locationText = `- Lokalizacja: współrzędne ${locationCoords.latitude}, ${locationCoords.longitude} (szukaj w promieniu ${radius || '10'} km)`;
  } else if (useLocation) {
    locationText = '- Lokalizacja: bieżąca lokalizacja użytkownika (ustal promień samodzielnie)';
  }

  // Dzieci
  const childrenText = hasChildren 
    ? `- W grupie są dzieci${childrenAges ? ` (wiek: ${childrenAges})` : ''} – dostosuj aktywności` 
    : '';

  // Posiłki i przerwy
  const mealsText = includeMeals 
    ? `- Uwzględnij posiłki w planie${needBreaks ? ' i zaplanuj regularne przerwy na odpoczynek' : ''}` 
    : '';

  // Format odpowiedzi
  const formatMap = {
    lista: 'lista punktowana',
    opisowa: 'opisowa (narracja)',
    tabela: 'tabela godzinowa'
  };

  return `Jesteś asystentem tworzącym spersonalizowane plany aktywności czasu wolnego.

DANE OD UŻYTKOWNIKA:
- Kategoria: ${selectedType || 'dowolna'}
- Czas trwania: ${fullDuration}
- Liczba uczestników: ${participants || '1'}
- Data rozpoczęcia: ${formattedDate}
- Budżet: ${budget ? budget + ' zł' : 'nieokreślony'}
- Środek transportu: ${transport || 'dowolny'}
- Dodatkowe preferencje: ${customNotes || 'brak'}
${locationText}
${withHours ? '- Wymagane godziny: TAK (podaj dokładne godziny)' : '- Wymagane godziny: NIE'}
${childrenText}
- Pożądany poziom aktywności (1-5): ${activityLevel} (1 – bardzo lekki relaks, 5 – bardzo intensywny)
- Preferencje pogodowe: ${weather === 'niezależny od pogody' ? 'plan ma być uniwersalny, niezależny od pogody' : 'preferowana pogoda: ' + weather}
${mealsText}

FORMAT ODPOWIEDZI:
- Typ: ${formatMap[planFormat]}
${includeChecklist ? '- Dołącz checklistę rzeczy do spakowania/przygotowania' : ''}
${includeMap ? '- Dołącz opisowe wskazówki dojazdu (bez mapy graficznej)' : ''}
${includeAlternatives ? '- Zaproponuj alternatywne aktywności na wypadek zmiany planów' : ''}

ZASADY GENEROWANIA:
1. Jeśli w podanym terminie i lokalizacji odbywają się rzeczywiste wydarzenia (koncerty, festiwale, wystawy, wydarzenia sportowe itp.) – umieść je jako pierwsze propozycje.
2. NIE wymyślaj fikcyjnych wydarzeń – jeśli nie masz pewności, zaproponuj neutralne, ogólnodostępne aktywności (np. spacer, kawiarnia, kino, park, muzeum, basen).
3. Dostosuj intensywność i rodzaj aktywności do poziomu aktywności (${activityLevel}/5) oraz obecności dzieci.
4. Uwzględnij budżet (${budget ? budget + ' zł' : 'nieokreślony'}) i dostępny transport (${transport || 'dowolny'}).
5. Plan musi być realistyczny, użyteczny i gotowy do natychmiastowego wykorzystania.

STRUKTURA ODPOWIEDZI:
- Zacznij bezpośrednio od planu – BEZ wstępu, powitania, podsumowania ani pytań.
- Nie używaj zwrotów grzecznościowych ani marketingowych.
- Przedstaw plan w czystej formie, zgodnie z wybranym formatem (${formatMap[planFormat]}).

Teraz wygeneruj plan.`;
};
  const handleGeneratePlan = async () => {
    const fullDuration = `${durationAmount} ${durationUnit}`;
    const user = auth.currentUser;
    if (!user) {
      // handle auth elsewhere
      return;
    }
    const prompt = buildPrompt();

    try {
      setIsLoading(true);

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-5-mini", 
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Błąd API:", errorData);
        setPlan(`Błąd API: ${errorData.error?.message || res.statusText}`);
        return;
      }

      const data = await res.json();

      if (data?.choices?.[0]?.message?.content) {
        const aiText = data.choices[0].message.content;
        setPlan(aiText);

        const user = auth.currentUser;
        if (user) {
          const planObj = {
            type: "plan",
            prompt,
            response: aiText,
            timestamp: Date.now(),
            meta: {
              type: selectedType,
              duration: fullDuration,
              participants,
              budget,
              transport,
              withHours,
              location: locationCoords,
              radius,
              customNotes,
              hasChildren,
              childrenAges,
              activityLevel,
              weather,
              includeMeals,
              needBreaks,
              planFormat,
              includeChecklist,
              includeMap,
              includeAlternatives,
            },
          };
          await savePlan(user.uid, planObj);
        }

        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 300);
      } else {
        setPlan("Brak odpowiedzi od AI (choices puste).");
      }
    } catch (err) {
      console.error("Błąd fetch:", err);
      setPlan("Błąd podczas generowania planu.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ----------------- render history mode ----------------- */
  if (isHistoryMode) {
    return (
      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={80} 
        keyboardOpeningTime={0} 
      >
        <Text style={styles.heading}>Plan czasu wolnego</Text>
        <LiquidCard style={{ marginBottom: 20 }}>
          <Text style={styles.label}>Wygenerowany plan</Text>
          <Text style={{ marginTop: 8, color: '#222' }}>{plan}</Text>
        </LiquidCard>
      </KeyboardAwareScrollView>
    );
  }

  /* ----------------- main form ----------------- */
  return (
    <KeyboardAwareScrollView
      ref={scrollRef}
      enableOnAndroid={true}
      extraScrollHeight={100}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.container}
    >
      <Text style={styles.heading}>Generator planu czasu wolnego</Text>
      <Text style={styles.description}>
        Stwórz plan aktywności który zachwyci cię dopasowaniem do twoich możliwości i wykorzystaj ten czas najlepiej jak możesz!
      </Text>

      {/* SEKCJA 1: Rodzaj i czas */}
      <AccordionSection title="Rodzaj i czas">
        <Text style={styles.label}>Forma spędzania czasu:</Text>
        <Picker selectedValue={selectedType} onValueChange={setSelectedType}>
          <Picker.Item label="Bez znaczenia" value="" />
          <Picker.Item label="Edukacja" value="edukacja" />
          <Picker.Item label="Rekreacja / relaks" value="rekreacja" />
          <Picker.Item label="Sport / ruch" value="sport" />
          <Picker.Item label="Kultura / sztuka" value="kultura" />
          <Picker.Item label="Towarzyska / społeczna" value="towarzyska" />
          <Picker.Item label="Turystyczna" value="turystyczna" />
          <Picker.Item label="Rozrywkowa" value="rozrywkowa" />
        </Picker>

        <Text style={styles.label}>Czas trwania:</Text>
        <View style={styles.inlineRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 10 }]}
            keyboardType="numeric"
            value={durationAmount}
            onChangeText={setDurationAmount}
            placeholder="np. 2"
          />
          <Picker
            selectedValue={durationUnit}
            onValueChange={setDurationUnit}
            style={{ flex: 1 }}
          >
            <Picker.Item label="godzin" value="godzin" />
            <Picker.Item label="dni" value="dni" />
            <Picker.Item label="tygodni" value="tygodni" />
          </Picker>
        </View>

        <Text style={styles.label}>Data i czas rozpoczęcia:</Text>
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.smallButton}>
          <Text style={styles.smallButtonText}>{date.toLocaleString()}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="datetime"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}
      </AccordionSection>

      {/* SEKCJA 2: Uczestnicy i preferencje */}
      <AccordionSection title="Uczestnicy i preferencje">

        <Text style={styles.label}>Liczba uczestników:</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={participants}
          onChangeText={setParticipants}
          placeholder="np. 2"
        />
        {/* Dzieci */}
        <View style={styles.switchRow}>
          <Text>W grupie są dzieci?</Text>
          <Switch value={hasChildren} onValueChange={setHasChildren} />
        </View>
        {hasChildren && (
          <>
            <Text style={styles.label}>Wiek dzieci (opcjonalnie):</Text>
            <TextInput
              style={styles.input}
              value={childrenAges}
              onChangeText={setChildrenAges}
              placeholder="np. 5 i 8 lat"
            />
          </>
        )}

        {/* Poziom aktywności */}
        <Text style={styles.label}>Pożądany poziom aktywności (1-5):</Text>
        <View style={styles.inlineRow}>
          {[1,2,3,4,5].map(level => (
            <TouchableOpacity
              key={level}
              style={[
                styles.levelButton,
                activityLevel === level.toString() && styles.levelButtonActive
              ]}
              onPress={() => setActivityLevel(level.toString())}
            >
              <Text style={activityLevel === level.toString() ? styles.levelButtonTextActive : styles.levelButtonText}>
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.hint}>1 - bardzo lekki relaks, 5 - bardzo intensywny</Text>

        {/* Pogoda */}
        <Text style={styles.label}>Preferencje pogodowe:</Text>
        <Picker selectedValue={weather} onValueChange={setWeather}>
          <Picker.Item label="Bez znaczenia" value="bez znaczenia" />
          <Picker.Item label="Tylko ładna" value="tylko ładna" />
          <Picker.Item label="Deszczowa" value="deszczowa" />
          <Picker.Item label="Zimowa" value="zimowa" />
          <Picker.Item label="Letnia" value="letnia" />
          <Picker.Item label="Niezależny od pogody" value="niezależny od pogody" />
        </Picker>
      </AccordionSection>

      {/* SEKCJA 3: Opcje dodatkowe */}
      <AccordionSection title="Opcje dodatkowe">
        <Text style={styles.label}>Budżet (zł):</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={budget}
          onChangeText={setBudget}
          placeholder="np. 200"
        />

        <Text style={styles.label}>Środek transportu:</Text>
        <Picker selectedValue={transport} onValueChange={setTransport}>
          <Picker.Item label="Bez znaczenia" value="" />
          <Picker.Item label="Pieszo" value="pieszo" />
          <Picker.Item label="Rower" value="rower" />
          <Picker.Item label="Samochód" value="samochód" />
          <Picker.Item label="Komunikacja miejska" value="komunikacja" />
          <Picker.Item label="Inny" value="Każdy" />
        </Picker>

        <Text style={styles.label}>Własne preferencje lub notatki:</Text>
        <TextInput
          style={styles.input}
          value={customNotes}
          onChangeText={setCustomNotes}
          placeholder="np. wolę aktywności na świeżym powietrzu"
          multiline
        />
        {/* Lokalizacja */}
        <View style={styles.switchRow}>
          <Text>Użyj bieżącej lokalizacji</Text>
          <Switch value={useLocation} onValueChange={setUseLocation} />
        </View>
        {useLocation && (
          <View>
            <Text style={styles.label}>Promień (w km):</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={radius}
              onChangeText={setRadius}
              placeholder="np. 10"
            />
          </View>
        )}

        {/* Posiłki */}
        <View style={styles.switchRow}>
          <Text>Uwzględnij posiłki w planie</Text>
          <Switch value={includeMeals} onValueChange={setIncludeMeals} />
        </View>

        {/* Przerwy (widoczne tylko gdy posiłki włączone) */}
        {includeMeals && (
          <View style={styles.switchRow}>
            <Text>Potrzebne przerwy na odpoczynek</Text>
            <Switch value={needBreaks} onValueChange={setNeedBreaks} />
          </View>
        )}
      </AccordionSection>

    
      {/* SEKCJA 4: Format odpowiedzi */}
      <AccordionSection title="Format odpowiedzi">
        <Text style={styles.label}>Typ planu:</Text>
        <Picker selectedValue={planFormat} onValueChange={setPlanFormat}>
          <Picker.Item label="Lista punktowana" value="lista" />
          <Picker.Item label="Opisowa (narracja)" value="opisowa" />
          <Picker.Item label="Tabela godzinowa" value="tabela" />
        </Picker>

        <View style={styles.switchRow}>
          <Text>Dodaj godziny do planu</Text>
          <Switch value={withHours} onValueChange={setWithHours} />
        </View>

        <View style={styles.switchRow}>
          <Text>Checklista rzeczy do spakowania</Text>
          <Switch value={includeChecklist} onValueChange={setIncludeChecklist} />
        </View>

        <View style={styles.switchRow}>
          <Text>Mapa / wskazówki dojazdu</Text>
          <Switch value={includeMap} onValueChange={setIncludeMap} />
        </View>

        <View style={styles.switchRow}>
          <Text>Alternatywy na zmianę planów</Text>
          <Switch value={includeAlternatives} onValueChange={setIncludeAlternatives} />
        </View>
        
      </AccordionSection>

      {/* Przycisk generowania */}
      <View style={{ marginVertical: 12 }}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleGeneratePlan}>
            <Text style={styles.buttonText}>Wygeneruj plan</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Wynik */}
      {plan ? (
        <LiquidCard style={{ marginBottom: 40 }}>
          <Text style={styles.label}>Twój plan:</Text>
          <Text style={{ marginTop: 8, color: '#222' }}>{plan}</Text>
        </LiquidCard>
      ) : null}
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f4f7fb' },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 20, textAlign: 'center', color: '#222' },
  description: { color: '#444', marginBottom: 12, textAlign: 'center' },

  liquidCard: {
    backgroundColor: '#e0e5ec',
    borderRadius: 18,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 0.2,
    borderColor: 'rgba(255,255,255,0.8)',
  },

  accordionSection: {},
  accordionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#222' },
  accordionContent: { paddingTop: 8 },

  label: { marginTop: 10, fontWeight: '600', color: '#333' },
  hint: { fontSize: 12, color: '#666', marginTop: 4, marginBottom: 8 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginTop: 5,
    backgroundColor: '#fff',
  },

  inlineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 8 },
  
  levelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  levelButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  levelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  levelButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  smallButton: {
    backgroundColor: '#eef6ff',
    padding: 10,
    borderRadius: 10,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  smallButtonText: { color: '#007AFF' },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },

  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default PlannerScreen;