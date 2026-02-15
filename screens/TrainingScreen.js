import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  Switch,
  ActivityIndicator,
  Platform,
  Keyboard,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Checkbox from 'expo-checkbox';
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

const TrainingScreen = ({ route }) => {
  const planData = route?.params?.planData || null;
  const isHistoryMode = !!planData;
  const scrollViewRef = useRef(null); 
  // refs
  const scrollRef = useRef(null);

  // form states
  const [goal, setGoal] = useState('');
  const [customGoal, setCustomGoal] = useState('');
  const [competitionDate, setCompetitionDate] = useState(null);
  const [showCompetitionPicker, setShowCompetitionPicker] = useState(false);
  const [disciplines, setDisciplines] = useState({}); // { name: { level:1-5, priority: 'main'|'secondary' } }
  const availableDisciplines = ['Siłownia', 'Bieganie', 'Pływanie', 'Rower', 'Crossfit', 'Sporty walki', 'Joga / mobilność'];

  const [newDisciplineText, setNewDisciplineText] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState('3'); // string for Picker compatibility
  const [sessionMinutes, setSessionMinutes] = useState('45'); // typical session length
  const [planDuration, setPlanDuration] = useState('8');

  const [place, setPlace] = useState('Siłownia'); // Siłownia, Dom, Plener, Basen, Sala
  const [equipment, setEquipment] = useState('');
  const [preferences, setPreferences] = useState(''); // text
  const [restrictions, setRestrictions] = useState('');

  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [sleepHours, setSleepHours] = useState('7'); // Picker
  const [stressLevel, setStressLevel] = useState('3'); // 1-5
  const [currentActivity, setCurrentActivity] = useState('');
  const [jobType, setJobType] = useState('Siedząca');

  const [injuries, setInjuries] = useState('');

  const [outputType, setOutputType] = useState('tygodniowa'); // 'tygodniowa' | 'opisowa'
  const [withChecklist, setWithChecklist] = useState(true);
  const [planText, setPlanText] = useState(planData?.response || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (planData?.meta) {
      const m = planData.meta;
      setGoal(m.goal || '');
      setCustomGoal(m.customGoal || '');
      if (m.competitionDate) setCompetitionDate(new Date(m.competitionDate));
      setDisciplines(m.disciplines || {});
      setDaysPerWeek(m.daysPerWeek || '3');
      setSessionMinutes(m.sessionMinutes || '45');
      setPlanDuration(m.planDuration || '8');
      setPlace(m.place || 'Siłownia');
      setEquipment(m.equipment || '');
      setPreferences(m.preferences || '');
      setRestrictions(m.restrictions || '');
      setAge(m.age || '');
      setGender(m.gender || '');
      setHeight(m.height || '');
      setWeight(m.weight || '');
      setSleepHours(m.sleepHours || '7');
      setStressLevel(m.stressLevel || '3');
      setCurrentActivity(m.currentActivity || '');
      setJobType(m.jobType || 'Siedząca');
      setInjuries(m.injuries || '');
      setOutputType(m.outputType || 'tygodniowa');
      setWithChecklist(m.withChecklist ?? true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planData]);

  /* ---------- discipline helpers ---------- */
  const toggleDiscipline = (name) => {
    setDisciplines(prev => {
      const copy = { ...prev };
      if (copy[name]) delete copy[name];
      else copy[name] = { level: 3, priority: 'secondary' };
      return copy;
    });
  };

  const setDisciplineLevel = (name, level) => {
    setDisciplines(prev => ({ ...prev, [name]: { ...(prev[name] || {}), level } }));
  };

  const toggleDisciplinePriority = (name) => {
    setDisciplines(prev => {
      const copy = { ...prev };
      if (!copy[name]) return prev;
      copy[name].priority = copy[name].priority === 'main' ? 'secondary' : 'main';
      return copy;
    });
  };

  const addCustomDiscipline = () => {
    if (!newDisciplineText.trim()) return;
    const name = newDisciplineText.trim();
    setDisciplines(prev => ({ ...prev, [name]: { level: 3, priority: 'secondary' } }));
    setNewDisciplineText('');
    // expand view to show new discipline (KeyboardAwareScrollView will handle)
  };

  /* ---------- prompt + generation ---------- */
 const buildPrompt = () => {
  const chosenGoal = goal === 'Inny' ? (customGoal || 'Inny cel') : goal;
  const compText = goal === 'Przygotowanie pod zawody' && competitionDate ? ` (zawody: ${competitionDate.toLocaleDateString()})` : '';
  
  const disciplinesText = Object.entries(disciplines).length
    ? Object.entries(disciplines)
        .map(([d, v]) => `${d} (poziom ${v.level}/5, ${v.priority === 'main' ? 'główna' : 'dodatkowa'})`)
        .join('; ')
    : 'brak konkretnych dyscyplin';

  return `Jesteś doświadczonym trenerem personalnym. Na podstawie poniższych danych przygotuj SPERSONALIZOWANY PLAN TRENINGOWY.

Dane użytkownika:
- Cel: ${chosenGoal}${compText}
- Dyscypliny: ${disciplinesText}
- Dostępność: ${daysPerWeek} dni w tygodniu, ${sessionMinutes} minut na sesję
- Długość planu: ${planDuration} tygodni
- Miejsce ćwiczeń: ${place}
- Dostępny sprzęt: ${equipment || 'brak dodatkowego'}
- Preferencje: ${preferences || 'brak'}
- Ograniczenia zdrowotne: ${restrictions || 'brak'}
- Wiek: ${age || 'niepodany'} | Płeć: ${gender || 'niepodana'} | Wzrost: ${height || '?'} cm | Waga: ${weight || '?'} kg
- Sen: ${sleepHours} h | Stres: ${stressLevel}/5 | Praca: ${jobType}
- Obecna aktywność: ${currentActivity || 'brak danych'}
- Kontuzje/choroby: ${injuries || 'brak'}

Wymagania dotyczące planu:
- Format: ${outputType === 'tygodniowa' ? 'tabela tygodniowa z podziałem na dni i sesje' : 'opisowy przewodnik z przykładowymi treningami i progresją'}
${withChecklist ? '- Dołącz checklistę zadań do odhaczenia dla każdego treningu' : ''}
- Uwzględnij objętość i intensywność na poszczególne tygodnie
- Zaproponuj skalowane warianty ćwiczeń (dla poziomów 1–5)
- Podaj wskazówki regeneracyjne i priorytety ćwiczeń
- Opisz krótko rozgrzewkę i cooldown
- Zaproponuj modyfikacje przy ograniczeniach zdrowotnych
- Przedstaw plan progresji (co 2 tygodnie zwiększaj obciążenie/objętość)

WAŻNE:
- Odpowiedz WYŁĄCZNIE treścią planu – bez powitania, podsumowania, pytań do użytkownika ani dodatkowych komentarzy.
- Nie używaj zwrotów typu "Oto plan", "Mam nadzieję, że pomoże" itp.
- Plan ma być gotowy do natychmiastowego wykorzystania.`;
};

  const handleGeneratePlan = async () => {
    const user = auth.currentUser;
    if (!user) {
      // handle auth elsewhere
      return;
    }

    const prompt = buildPrompt();
    try {
      setIsLoading(true);
      setPlanText('');
      // API call
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-5-mini', 
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await res.json();
      if (data.choices?.length) {
        const aiText = data.choices[0].message.content;
        setPlanText(aiText);

        // save meta
        const planObj = {
          type: 'training',
          prompt,
          response: aiText,
          timestamp: Date.now(),
          meta: {
            goal,
            customGoal,
            competitionDate: competitionDate ? competitionDate.toISOString() : null,
            disciplines,
            daysPerWeek,
            sessionMinutes,
            planDuration,
            place,
            equipment,
            preferences,
            restrictions,
            age,
            gender,
            height,
            weight,
            sleepHours,
            stressLevel,
            currentActivity,
            jobType,
            injuries,
            outputType,
            withChecklist,
          },
        };
        await savePlan(user.uid, planObj);

        // scroll to bottom to show result
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 300);
      } else {
        setPlanText('Brak odpowiedzi od AI.');
      }
    } catch (err) {
      console.error(err);
      setPlanText('Błąd podczas generowania planu.');
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
      >
        <Text style={styles.heading}>Plan treningowy</Text>
        <LiquidCard style={{ marginBottom: 20 }}>
          <Text style={styles.label}>Wygenerowany plan</Text>
          <Text style={{ marginTop: 8, color: '#222' }}>{planText}</Text>
        </LiquidCard>
      </KeyboardAwareScrollView>
    );
  }

  /* ----------------- main form ----------------- */
  return (
    <KeyboardAwareScrollView
      ref={scrollViewRef}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      enableOnAndroid={true}
      extraScrollHeight={100}
      keyboardShouldPersistTaps="handled"
      
    >

      <Text style={styles.heading}>Generator planu treningowego</Text>
      <Text style={styles.description}>
        Wypełnij kilka prostych pól i kliknij Wygeneruj plan a dostaniesz plan treningowy idealnie dopasowany do ciebie.
      </Text>

      {/* Cel */}
      <AccordionSection title="Cel i zawody">
        <Text style={styles.label}>Cel:</Text>
        <Picker selectedValue={goal} onValueChange={setGoal}>
          <Picker.Item label="Wybierz cel..." value="" />
          <Picker.Item label="Redukcja tkanki tłuszczowej" value="Redukcja tkanki tłuszczowej" />
          <Picker.Item label="Budowa masy mięśniowej" value="Budowa masy mięśniowej" />
          <Picker.Item label="Siła" value="Siła" />
          <Picker.Item label="Kondycja / wytrzymałość" value="Kondycja / wytrzymałość" />
          <Picker.Item label="Ogólna sprawność / zdrowie" value="Ogólna sprawność / zdrowie" />
          <Picker.Item label="Przygotowanie pod zawody" value="Przygotowanie pod zawody" />
          <Picker.Item label="Rehabilitacja / powrót po kontuzji" value="Rehabilitacja / powrót po kontuzji" />
          <Picker.Item label="Inny (wpisz poniżej)" value="Inny" />
        </Picker>

        {goal === 'Inny' && (
          <>
            <Text style={styles.label}>Wpisz własny cel:</Text>
            <TextInput style={styles.input} value={customGoal} onChangeText={setCustomGoal} placeholder="np. poprawa mobilności" />
          </>
        )}

        {goal === 'Przygotowanie pod zawody' && (
          <>
            <Text style={styles.label}>Data zawodów:</Text>
            <TouchableOpacity onPress={() => setShowCompetitionPicker(true)} style={styles.smallButton}>
              <Text style={styles.smallButtonText}>{competitionDate ? competitionDate.toLocaleDateString() : 'Wybierz datę'}</Text>
            </TouchableOpacity>
            {showCompetitionPicker && (
              <DateTimePicker
                value={competitionDate || new Date()}
                mode="date"
                display="default"
                onChange={(e, d) => {
                  setShowCompetitionPicker(false);
                  if (d) setCompetitionDate(d);
                }}
              />
            )}
            <Text style={[styles.label, { marginTop: 10 }]}>Typ zawodów (opcjonalnie):</Text>
            <TextInput style={styles.input} placeholder="np. maraton, triathlon" onChangeText={() => {}} />
          </>
        )}
      </AccordionSection>

      {/* Dyscypliny */}
      <AccordionSection title="Dyscypliny">
        <Text style={styles.label}>Wybierz dyscypliny i ustaw poziom:</Text>
        {/* render wszystkich aktualnych dyscyplin: standardowe + własne */}
        {[
          ...availableDisciplines.filter(d => !disciplines[d]), // tylko nie wybrane z default
          ...Object.keys(disciplines) // wszystkie wybrane (default i własne)
        ].map((d) => {
          const isChecked = !!disciplines[d];
          const level = disciplines[d]?.level || 3;
          const priority = disciplines[d]?.priority || 'secondary';
          return (
            <View key={d} style={styles.disciplineRow}>
              <Checkbox value={isChecked} onValueChange={() => toggleDiscipline(d)} />
              <Text style={{ marginLeft: 10, flex: 1 }}>{d}</Text>

              {isChecked && (
                <View style={styles.inlineGroup}>
                  <TouchableOpacity
                    style={styles.smallControl}
                    onPress={() => setDisciplineLevel(d, Math.max(1, level - 1))}
                  >
                    <Text>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.levelText}>{level}</Text>
                  <TouchableOpacity
                    style={styles.smallControl}
                    onPress={() => setDisciplineLevel(d, Math.min(5, level + 1))}
                  >
                    <Text>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.priorityButton, priority === 'main' && styles.priorityButtonActive]}
                    onPress={() => toggleDisciplinePriority(d)}
                  >
                    <Text style={{ color: priority === 'main' ? '#fff' : '#333' }}>
                      {priority === 'main' ? 'Główna' : 'Dodatkowa'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {/* Dodawanie własnej dyscypliny */}
        <View style={{ marginTop: 12 }}>
          <Text style={styles.label}>Dodaj własną dyscyplinę:</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="np. wspinaczka"
              value={newDisciplineText}
              onChangeText={setNewDisciplineText}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                addCustomDiscipline();
                // Scroll do dołu akordeonu, aby nowa dyscyplina była widoczna
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
              }}
            >
              <Text style={styles.addButtonText}>Dodaj</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AccordionSection>

      {/* Organizacja */}
      <AccordionSection title="Organizacja tygodnia">
        <Text style={styles.label}>Dni w tygodniu:</Text>
        <Picker selectedValue={daysPerWeek} onValueChange={setDaysPerWeek}>
          {['1','2','3','4','5','6','7'].map(n => <Picker.Item key={n} label={n} value={n} />)}
        </Picker>

        <Text style={styles.label}>Czas sesji (min):</Text>
        <Picker selectedValue={sessionMinutes} onValueChange={setSessionMinutes}>
          {['15','30','45','60','90'].map(n => <Picker.Item key={n} label={n} value={n} />)}
        </Picker>

        <Text style={styles.label}>Długość planu (tygodnie):</Text>
        <Picker selectedValue={planDuration} onValueChange={setPlanDuration}>
          {['4','8','12','16','20'].map(n => <Picker.Item key={n} label={n} value={n} />)}
        </Picker>
      </AccordionSection>

      {/* Sprzęt i preferencje */}
      <AccordionSection title="Sprzęt i preferencje">
        <Text style={styles.label}>Miejsce treningu:</Text>
        <Picker selectedValue={place} onValueChange={setPlace}>
          <Picker.Item label="Dowolne" value="Dowolne" />
          <Picker.Item label="Siłownia" value="Siłownia" />
          <Picker.Item label="Dom" value="Dom" />
          <Picker.Item label="Plener" value="Plener" />
          <Picker.Item label="Basen" value="Basen" />
          <Picker.Item label="Sala fitness" value="Sala fitness" />
        </Picker>

        <Text style={styles.label}>Sprzęt (własne):</Text>
        <TextInput style={styles.input} placeholder="np. hantel 20kg, kettlebell 16kg" value={equipment} onChangeText={setEquipment} />

        <Text style={styles.label}>Preferencje treningowe:</Text>
        <TextInput style={styles.input} placeholder="np. krótkie sesje, trening w parach" value={preferences} onChangeText={setPreferences} />

        <Text style={styles.label}>Ograniczenia zdrowotne:</Text>
        <TextInput style={styles.input} placeholder="np. problem z kolanem" value={restrictions} onChangeText={setRestrictions} />
      </AccordionSection>

      {/* Dane fizyczne */}
      <AccordionSection title="Dane fizyczne i zdrowie">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput placeholder="Wiek" style={[styles.input, { flex: 1 }]} value={age} onChangeText={setAge} keyboardType="numeric" />
          <TextInput placeholder="Wzrost (cm)" style={[styles.input, { flex: 1 }]} value={height} onChangeText={setHeight} keyboardType="numeric" />
          <TextInput placeholder="Waga (kg)" style={[styles.input, { flex: 1 }]} value={weight} onChangeText={setWeight} keyboardType="numeric" />
        </View>

        <Text style={styles.label}>Płeć:</Text>
        <Picker selectedValue={gender} onValueChange={setGender}>
          <Picker.Item label="Nie podano" value="" />
          <Picker.Item label="Kobieta" value="kobieta" />
          <Picker.Item label="Mężczyzna" value="mezczyzna" />
          <Picker.Item label="Inna" value="inna" />
        </Picker>

        <Text style={styles.label}>Sen (godziny):</Text>
        <Picker selectedValue={sleepHours} onValueChange={setSleepHours}>
          {['<5','5','6','7','8','9+'].map(v => <Picker.Item key={v} label={v} value={v} />)}
        </Picker>

        <Text style={styles.label}>Poziom stresu (1-5):</Text>
        <Picker selectedValue={stressLevel} onValueChange={setStressLevel}>
          {['1','2','3','4','5'].map(v => <Picker.Item key={v} label={v} value={v} />)}
        </Picker>

        <Text style={styles.label}>Kontuzje / schorzenia:</Text>
        <TextInput style={styles.input} placeholder="np. ból barku" value={injuries} onChangeText={setInjuries} />
      </AccordionSection>

      {/* Styl życia / aktywność */}
      <AccordionSection title="Styl życia">
        <Text style={styles.label}>Praca / aktywność (krótko):</Text>
        <Picker selectedValue={jobType} onValueChange={setJobType}>
          <Picker.Item label="Siedząca" value="Siedząca" />
          <Picker.Item label="Aktywna" value="Aktywna" />
          <Picker.Item label="Fizyczna" value="Fizyczna" />
        </Picker>

        <Text style={styles.label}>Obecna aktywność (np. kroki / tydzień):</Text>
        <TextInput style={styles.input} value={currentActivity} onChangeText={setCurrentActivity} placeholder="np. 8000 kroków/dzień" />
      </AccordionSection>

      {/* Wyjścia / format */}
      <AccordionSection title="Format odpowiedzi">
        <Text style={styles.label}>Typ wyjścia:</Text>
        <Picker selectedValue={outputType} onValueChange={setOutputType}>
          <Picker.Item label="Tabela tygodniowa" value="tygodniowa" />
          <Picker.Item label="Opisowy przewodnik" value="opisowa" />
        </Picker>

        <View style={styles.switchRow}>
          <Text>Dołącz checklistę do odhaczania</Text>
          <Switch value={withChecklist} onValueChange={setWithChecklist} />
        </View>
      </AccordionSection>

      {/* generate */}
      <View style={{ marginVertical: 12 }}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleGeneratePlan}>
            <Text style={styles.buttonText}>Wygeneruj plan</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* wynik */}
      {planText ? (
        <LiquidCard style={{ marginBottom: 40 }}>
          <Text style={styles.label}>Wynik (plan treningowy)</Text>
          <Text style={{ marginTop: 8, color: '#222' }}>{planText}</Text>
        </LiquidCard>
      ) : null}
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f4f7fb' },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 20, textAlign: 'center', color: '#222' },
  description: { color: '#444', marginBottom: 12, textAlign: 'center' },

  // liquid
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

  // accordion header
  accordionSection: {},
  accordionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#222' },
  accordionContent: { paddingTop: 8 },
  accordionHeader: { backgroundColor: 'rgba(255,255,255,0.9)' },
  accordionChevron: { fontSize: 14, color: '#333' },

  label: { marginTop: 10, fontWeight: '600', color: '#333' },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginTop: 5,
    backgroundColor: '#fff',
  },

  picker: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 5,
  },
  disciplineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  inlineGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallControl: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 6,
  },
  levelText: { minWidth: 24, textAlign: 'center', fontWeight: '700' },
  priorityButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)'
  },
  priorityButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },

  addButton: {
    marginLeft: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: '700' },

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

export default TrainingScreen;