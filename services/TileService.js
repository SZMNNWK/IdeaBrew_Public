import AsyncStorage from '@react-native-async-storage/async-storage';

const tilePrompts = {
  FunFact: () => {
    const today = new Date().toISOString().split('T')[0];
    return `Dziś jest ${today}. Podaj krótką, ciekawą ciekawostkę dnia (ma mieć długość maksymalnnie 15 słów) z różnych dziedzin życia: nauki, historii, kultury, przyrody lub codziennych sytuacji. 
    Treść ma być łatwa do zrozumienia, zaskakująca i różna od poprzednich ciekawostek użytkownika.`;
  },
  quote: () => {
    return `Podaj krótki, inspirujący cytat motywacyjny na dziś (ma mieć długość maksymalnnie 15 słów). Niech będzie pozytywny, uniwersalny, zrozumiały i inny niż poprzednie cytaty użytkownika. Podaj czyj to jest cytat.`;
  },
  inspiration: () => {
    return `Podaj krótką, kreatywną myśl lub inspirację dnia (ma mieć długość maksymalnnie 15 słów). Ma być świeża, zaskakująca i zachęcać do działania. Unikaj powtarzania wcześniejszych inspiracji użytkownika.`;
  },
  joke: () => {
    return `Opowiedz krótki, zabawny żart dnia (ma mieć długość maksymalnnie 15 słów), najlepiej związany z codziennym życiem, wydarzeniami dnia lub relacjami międzyludzkimi. 
    Unikaj żartów o komputerach lub zbyt wąskich tematów. Nie powtarzaj wcześniejszych żartów użytkownika a najlepiej użyj innego tematu niż te z poprzednich dni.`;
  }
};

export const generateTile = async (tileId) => {
  try {
    const storedHistory = await AsyncStorage.getItem(`tileHistory_${tileId}`);
    const historyArr = storedHistory ? JSON.parse(storedHistory) : [];

    const prompt = tilePrompts[tileId]();
    const fullPrompt = `${prompt}\nPoprzednie odpowiedzi: ${historyArr.join('; ')}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: fullPrompt }],
        temperature: 1,
        max_tokens: 60,
      }),
    });

    const data = await res.json();
    const aiText = data?.choices?.[0]?.message?.content?.trim() || 'Spróbuj ponownie później!';

    const updatedHistory = [aiText, ...historyArr].slice(0, 20);
    await AsyncStorage.setItem(`tileHistory_${tileId}`, JSON.stringify(updatedHistory));

    return aiText;
  } catch (err) {
    console.error(`Błąd generowania kafla ${tileId}:`, err);
    return 'Spróbuj ponownie później!';
  }
};
