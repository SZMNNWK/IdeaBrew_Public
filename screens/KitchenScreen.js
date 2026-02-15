import { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Button,
  View,
  ActivityIndicator,
  Switch,
  TouchableOpacity,
  Animated,
  Pressable
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { auth } from '../firebase';
import { savePlan } from '../services/firestoreService';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

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

const KitchenScreen = ({ route }) => {
  const [mustIngredients, setMustIngredients] = useState('');
  const [optionalIngredients, setOptionalIngredients] = useState('');
  const [excludeIngredients, setExcludeIngredients] = useState('');
  const [allowExtra, setAllowExtra] = useState(false);
  const [budget, setBudget] = useState('');
  const [time, setTime] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [equipmentConstraints, setEquipmentConstraints] = useState('');
  const [servings, setServings] = useState('1');
  const [maxCaloriesPerPortion, setMaxCaloriesPerPortion] = useState('');
  const [countCalories, setCountCalories] = useState(false);
  const [countMacros, setCountMacros] = useState(false);
  const [countMicros, setCountMicros] = useState(false);
  const [lunchbox, setLunchbox] = useState(false);
  const [cuisine, setCuisine] = useState('');
  const [mealType, setMealType] = useState('');
  const [diet, setDiet] = useState('');
  const [presentationStyle, setPresentationStyle] = useState('');
  const [servingSuggestion, setServingSuggestion] = useState('');
  const [occasion, setOccasion] = useState('');
  const [seasonal, setSeasonal] = useState(false);
  const [aiCreativity, setAiCreativity] = useState(50);
  const [recipe, setRecipe] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currency, setCurrency] = useState('zł');

  useEffect(() => {
    if (route?.params?.planData) {
      setRecipe(route.params.planData.response || '');
    }
    const userCurrency = Intl.NumberFormat().resolvedOptions().currency;
    if (userCurrency) setCurrency(userCurrency);
  }, [route?.params]);
const buildPrompt = () => {
  const currentDate = new Date().toLocaleDateString();

  // Składniki
  const ingredientsText = `
- Składniki obowiązkowe: ${mustIngredients || 'dowolne'}
- Składniki opcjonalne: ${optionalIngredients || 'brak'}
- Składniki do uniknięcia: ${excludeIngredients || 'brak'}
${seasonal ? '- Używaj sezonowych składników (dostosuj do pory roku)' : ''}
${allowExtra ? `- Można dodać dodatkowe składniki (budżet: ${budget || 'nieokreślony'} ${currency})` : '- Nie dodawaj żadnych innych składników poza wymienionymi'}
`;

  // Czas i porcje
  const timeText = `
- Czas przygotowania: ${time || 'dowolny'}
- Poziom trudności: ${difficulty || 'dowolny'}
- Liczba porcji: ${servings}
- Maksymalna liczba kalorii na porcję: ${maxCaloriesPerPortion || 'dowolna'}
- Ograniczenia sprzętowe: ${equipmentConstraints || 'brak'}
`;

  // Typ kuchni i posiłku
  const cuisineText = `
- Typ kuchni: ${cuisine || 'dowolna'}
- Rodzaj posiłku: ${mealType || 'dowolny'}
`;

  // Dieta i preferencje
  const dietText = `
- Dieta: ${diet || 'brak'}
- Styl podania: ${presentationStyle || 'dowolny'}
- Sugestie serwowania: ${servingSuggestion || 'brak'}
- Specjalna okazja: ${occasion === 'bez okazji' ? 'brak' : occasion}
${lunchbox ? '- Przepis ma nadawać się do przygotowania w formie lunchboxów (do przechowywania i odgrzewania)' : ''}
`;

  // Opcje obliczeniowe
  const nutritionText = `
${countCalories ? '- Podaj łączną liczbę kalorii' : ''}
${countMacros ? '- Podaj makroskładniki (białko, tłuszcze, węglowodany)' : ''}
${countMicros ? '- Podaj wybrane mikroskładniki (np. witamina C, żelazo, wapń)' : ''}
`;

  // Kreatywność (opcjonalnie, jeśli używamy temperature)
  const creativityNote = aiCreativity !== 50 ? `\nPoziom kreatywności: ${aiCreativity}/100 (gdzie 0 - bardzo schematycznie, 100 - bardzo eksperymentalnie)` : '';

  return `Jesteś profesjonalnym szefem kuchni i ekspertem od żywienia. Na podstawie poniższych danych stwórz SZCZEGÓŁOWY PRZEPIS KULINARNY.

DANE OD UŻYTKOWNIKA:
${ingredientsText}
${timeText}
${cuisineText}
${dietText}
${nutritionText}
${creativityNote}

WYMAGANIA DOTYCZĄCE PRZEPISU:
- Przepis ma być praktyczny, łatwy do wykonania i dostosowany do umiejętności użytkownika.
- Jeśli podano ograniczenia sprzętowe, zaproponuj alternatywne metody wykonania.
- Uwzględnij listę zakupów z podziałem na kategorie (np. warzywa, nabiał, mięso).
- Instrukcje krok po kroku powinny być jasne i zrozumiałe.
- Jeśli użytkownik wybrał lunchbox, podaj wskazówki dotyczące przechowywania i odgrzewania.
- Jeśli podano maksymalną liczbę kalorii, dostosuj przepis tak, by się w niej mieścił.
- W przypadku diety (wegetariańska, wegańska, keto itp.) ściśle przestrzegaj jej zasad.
- Jeśli zaznaczono opcje liczenia kalorii/makro/mikro - podaj te wartości w przejrzystej formie (np. w tabeli na końcu).
- Uwzględnij sugestie serwowania i styl podania, jeśli zostały podane.
- Jeśli to okazja (np. Boże Narodzenie), dostosuj przepis do tradycji.

STRUKTURA ODPOWIEDZI:
- Zacznij BEZPOŚREDNIO od przepisu - BEZ wstępu, powitania, podsumowania ani pytań.
- Nie używaj zwrotów grzecznościowych ani marketingowych.
- Przedstaw przepis w następującym formacie:
  1. Nazwa potrawy
  2. Lista składników (z ilościami)
  3. Instrukcja przygotowania (krok po kroku)
  4. (opcjonalnie) Wskazówki i warianty
  5. (jeśli wymagane) Wartości odżywcze

Teraz wygeneruj przepis.`;
};

  const handleGenerateRecipe = async () => {
    const prompt = buildPrompt();
    try {
      setIsLoading(true);
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-5-mini',
          messages: [{ role: 'user', content: prompt }],
          //temperature: aiCreativity / 100,
        }),
      });

       if (!res.ok) {
          const errorData = await res.json();
          console.error("Błąd API:", errorData);
          setRecipe(`Błąd API: ${errorData.error?.message || res.statusText}`);
          return;
        }

        const data = await res.json();
        console.log("AI raw response:", data);

        if (data?.choices?.[0]?.message?.content) {
          const aiText = data.choices[0].message.content;
          setRecipe(aiText);

          const user = auth.currentUser;
          if (user) {
            const recipeObj = {
              type: "recipe",
              prompt,
              response: aiText,
              timestamp: Date.now(),
              meta: {
                mustIngredients,
                optionalIngredients,
                excludeIngredients,
                allowExtra,
                budget,
                time,
                difficulty,
                equipmentConstraints,
                servings,
                maxCaloriesPerPortion,
                countCalories,
                countMacros,
                countMicros,
                lunchbox,
                cuisine,
                mealType,
                diet,
                presentationStyle,
                servingSuggestion,
                occasion,
                seasonal,
                aiCreativity,
              },
            };
            await savePlan(user.uid, recipeObj);
          }
        } else {
          setRecipe("Brak odpowiedzi od AI (choices puste).");
        }
      } catch (err) {
        console.error("Błąd fetch:", err);
        setRecipe("Błąd podczas generowania planu.");
      } finally {
        setIsLoading(false);
      }
  };

  return (
    <KeyboardAwareScrollView
    contentContainerStyle={styles.container}
    showsVerticalScrollIndicator={false}
    enableOnAndroid
    extraScrollHeight={80}   // ile ma się podnieść nad klawiaturą
    keyboardOpeningTime={0}  // szybka reakcja
  >
      <Text style={styles.heading}>Znajdź przepis</Text>
      <Text style={styles.description}>
        Stwórz przepis skrojony do twoich możliwości, wykorzystaj jedzenie blisko swojej daty ważności i Smacznego!
      </Text>
      {recipe ? (
        <LiquidCard style={styles.recipeBox}>
          <Text style={styles.label}>Przepis:</Text>
          <Text>{recipe}</Text>
        </LiquidCard>
      ) : (
        <>
          <AccordionSection title="Składniki">
            <Text style={styles.label}>Składniki obowiązkowe:</Text>
            <TextInput style={styles.input} value={mustIngredients} onChangeText={setMustIngredients} placeholder="np. kurczak, ryż" />

            <Text style={styles.label}>Składniki opcjonalne:</Text>
            <TextInput style={styles.input} value={optionalIngredients} onChangeText={setOptionalIngredients} placeholder="np. marchewka, czosnek" />

            <Text style={styles.label}>Składniki do uniknięcia (alergie/ nietolerancje):</Text>
            <TextInput style={styles.input} value={excludeIngredients} onChangeText={setExcludeIngredients} placeholder="np. gluten, orzechy" />

            <View style={styles.switchRow}>
              <Text>Pozwól na dodatkowe składniki</Text>
              <Switch value={allowExtra} onValueChange={setAllowExtra} />
            </View>
            {allowExtra && (
              <>
                <Text style={styles.label}>Budżet ({currency}):</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={budget} onChangeText={setBudget} />
              </>
            )}

            <View style={styles.switchRow}>
              <Text>Używaj sezonowych składników</Text>
              <Switch value={seasonal} onValueChange={setSeasonal} />
            </View>
          </AccordionSection>

          <AccordionSection title="Czas i trudność">
            <Text style={styles.label}>Czas przygotowania:</Text>
            <Picker selectedValue={time} onValueChange={setTime}>
              <Picker.Item label="Dowolny" value="" />
              <Picker.Item label="< 15 minut" value="<15 minut" />
              <Picker.Item label="< 30 minut" value="<30 minut" />
              <Picker.Item label="30-60 minut" value="30-60 minut" />
              <Picker.Item label="1-2 godziny" value="1-2 godziny" />
              <Picker.Item label="2-4 godziny" value="2-4 godziny" />
              <Picker.Item label="Cały dzień / przez noc" value="12+ godzin" />
            </Picker>

            <Text style={styles.label}>Poziom trudności przepisu:</Text>
            <Picker selectedValue={difficulty} onValueChange={setDifficulty}>
              <Picker.Item label="Dowolny" value="" />
              <Picker.Item label="Dla laików" value="łatwy" />
              <Picker.Item label="Średni" value="średni" />
              <Picker.Item label="Trudny" value="trudny" />
            </Picker>

            <Text style={styles.label}>Ograniczenia sprzętowe:</Text>
            <TextInput style={styles.input} value={equipmentConstraints} onChangeText={setEquipmentConstraints} placeholder="np. brak piekarnika" />

            <Text style={styles.label}>Porcje:</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={servings} onChangeText={setServings} />

            <Text style={styles.label}>Maks. kalorie na porcję:</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={maxCaloriesPerPortion} onChangeText={setMaxCaloriesPerPortion} />
          </AccordionSection>

          <AccordionSection title="Typ kuchni i posiłku">
            <Text style={styles.label}>Typ kuchni:</Text>
            <Picker selectedValue={cuisine} onValueChange={setCuisine}>
              <Picker.Item label="Dowolna" value="" />
              <Picker.Item label="Włoska" value="włoska" />
              <Picker.Item label="Polska" value="polska" />
              <Picker.Item label="Meksykańska" value="meksykańska" />
              <Picker.Item label="Japońska" value="japońska" />
              <Picker.Item label="Indyjska" value="indyjska" />
              <Picker.Item label="Chińska" value="chińska" />
              <Picker.Item label="Francuska" value="francuska" />
              <Picker.Item label="Hiszpańska" value="hiszpańska" />
              <Picker.Item label="Tajska" value="tajska" />
              <Picker.Item label="Grecka" value="grecka" />
              <Picker.Item label="Turecka" value="turecka" />
              <Picker.Item label="Amerykańska" value="amerykańska" />
            </Picker>

            <Text style={styles.label}>Rodzaj posiłku:</Text>
            <Picker selectedValue={mealType} onValueChange={setMealType}>
              <Picker.Item label="Dowolny" value="" />
              <Picker.Item label="Śniadanie" value="śniadanie" />
              <Picker.Item label="Obiad" value="obiad" />
              <Picker.Item label="Kolacja" value="kolacja" />
              <Picker.Item label="Sałatka" value="sałatka" />
              <Picker.Item label="Deser" value="deser" />
              <Picker.Item label="Ciasto" value="ciasto" />
              <Picker.Item label="Przekąska" value="przekąska" />
              <Picker.Item label="Zupa" value="zupa" />
            </Picker>
          </AccordionSection>

          <AccordionSection title="Dieta i preferencje">
            <Text style={styles.label}>Dieta:</Text>
            <Picker selectedValue={diet} onValueChange={setDiet}>
              <Picker.Item label="Brak" value="" />
              <Picker.Item label="Wegetariańska" value="wegetariańska" />
              <Picker.Item label="Wegańska" value="wegańska" />
              <Picker.Item label="Keto" value="keto" />
              <Picker.Item label="Paleo" value="paleo" />
              <Picker.Item label="Bezglutenowa" value="bezglutenowa" />
              <Picker.Item label="Wysokobiałkowa" value="wysokobiałkowa" />
            </Picker>

            <Text style={styles.label}>Styl podania:</Text>
            <TextInput style={styles.input} value={presentationStyle} onChangeText={setPresentationStyle} placeholder="elegancki, domowy, lunchbox, dekoracja z ziół" />

            <Text style={styles.label}>Sugestie serwowania:</Text>
            <TextInput style={styles.input} value={servingSuggestion} onChangeText={setServingSuggestion} placeholder="np. podać z ryżem, makaronem, sałatką" />
            
            <View style={styles.switchRow}>
              <Text>Przygotuj w formie lunchboxów</Text>
              <Switch value={lunchbox} onValueChange={setLunchbox} />
            </View>

            <Text style={styles.label}>Specjalna okazja:</Text>
            <Picker selectedValue={occasion} onValueChange={setOccasion}>
              <Picker.Item label="Bez okazji" value="bez okazji" />
              <Picker.Item label="Urodziny" value="urodziny" />
              <Picker.Item label="Boże Narodzenie" value="boze narodzenie" />
              <Picker.Item label="Wielkanoc" value="wielkanoc" />
              <Picker.Item label="Halloween" value="halloween" />
              <Picker.Item label="Sylwester" value="sylwester" />
              <Picker.Item label="Grill" value="grill" />
            </Picker>

            <View style={styles.switchRow}>
              <Text>Zlicz kalorie</Text>
              <Switch value={countCalories} onValueChange={setCountCalories} />
            </View>

            <View style={styles.switchRow}>
              <Text>Zlicz makro</Text>
              <Switch value={countMacros} onValueChange={setCountMacros} />
            </View>

            <View style={styles.switchRow}>
              <Text>Zlicz mikroskładniki</Text>
              <Switch value={countMicros} onValueChange={setCountMicros} />
            </View>

            <Text style={styles.label}>Kreatywność przepisu (0-100):</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={aiCreativity.toString()} onChangeText={(val) => setAiCreativity(Number(val))} placeholder="0-100" />
          </AccordionSection>

          {isLoading ? (
            <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />
          ) : (
            <TouchableOpacity onPress={handleGenerateRecipe} style={styles.button}>
              <Text style={styles.buttonText}>Generuj</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f4f7fb' },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 20, textAlign: 'center', color: '#222' },
  description: { color: '#444', marginBottom: 12, textAlign: 'center' },

  // Liquid look
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

  label: { marginTop: 10, fontWeight: '600', color: '#333' },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginTop: 5,
    backgroundColor: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },

  recipeBox: {
    backgroundColor: '#e0e5ec',
  },

  accordionSection: {},
  accordionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#222' },
  accordionContent: { paddingTop: 8 },
  accordionHeader: { backgroundColor: 'rgba(255,255,255,0.9)' },
  accordionChevron: { fontSize: 14, color: '#333' },

  // button in liquid style
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

export default KitchenScreen;