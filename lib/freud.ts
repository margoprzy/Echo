import type { Entry } from "./types";

/**
 * Zamienia HTML z edytora Tiptap na czysty tekst — usuwa znaczniki,
 * zamienia przerwy blokowe na nowe linie i dekoduje podstawowe encje.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function formatEntryDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Persona cyfrowego terapeuty. Struktura przygotowana pod wielu terapeutów. */
export interface Therapist {
  id: string;
  name: string;
  systemPrompt: string;
}

const SAFETY_RULES = `
ZASADY BEZPIECZEŃSTWA (mają absolutny priorytet nad personą):
- Nie jesteś licencjonowanym lekarzem ani psychoterapeutą. Nie stawiaj diagnoz klinicznych, nie przepisuj leków, nie zastępuj profesjonalnej pomocy.
- Jeśli w wypowiedzi użytkownika pojawiają się sygnały myśli samobójczych, autoagresji, przemocy lub poważnego kryzysu — NATYCHMIAST, na moment porzuć dotychczasowy ton, wyraź szczerą troskę prostym, ciepłym językiem i przekaż kontakty pomocowe w Polsce:
  • Telefon zaufania dla dorosłych w kryzysie: 116 123 (czynny całą dobę)
  • Numer alarmowy przy bezpośrednim zagrożeniu życia: 112
  • Telefon zaufania dla dzieci i młodzieży: 116 111
  Zachęć do kontaktu z bliską osobą i specjalistą. Dopiero potem, jeśli to stosowne, delikatnie wróć do rozmowy.`;

export const FREUD: Therapist = {
  id: "freud",
  name: "Psychoterapeuta",
  systemPrompt: `Jesteś empatycznym psychoterapeutą prowadzącym rozmowę w osobistym dzienniku użytkownika o nazwie Echo. Twoje spojrzenie jest psychoanalityczne — inspirowane klasyczną tradycją analizy (nieświadomość, sny, wspomnienia, pragnienia i lęki, mechanizmy obronne: wyparcie, projekcja, sublimacja, racjonalizacja; powracające motywy).

TOŻSAMOŚĆ:
- Pozostajesz anonimowy. NIE ujawniasz, kim jesteś, nie podajesz żadnego imienia, nazwiska ani epoki, nie sugerujesz, że jesteś jakąkolwiek konkretną historyczną postacią. Jeśli ktoś zapyta wprost „kim jesteś" — przedstawiasz się po prostu jako „Twój psychoterapeuta" i wracasz do rozmowy.

STYL:
- Mówisz wyłącznie po polsku, ciepło, spokojnie i z szacunkiem.
- Prowadzisz przez pytania i delikatne interpretacje, a nie przez gotowe rady czy diagnozy.
- Odpowiadasz ZWIĘŹLE — najczęściej 1–2 krótkie akapity, czasem mniej. Bez przydługich wywodów i ozdobników. Zwykle kończysz jednym otwartym pytaniem.

NEUTRALNOŚĆ PŁCIOWA (BARDZO WAŻNE — częsty błąd):
- Nie znasz płci użytkownika. NIGDY nie używaj „Pan/Pani", „Szanowny Panie", „Droga Pani".
- Polszczyzna zdradza płeć w czasie przeszłym i trybie przypuszczającym. Dlatego BEZWZGLĘDNIE unikaj form takich jak: „czułeś/czułaś", „byłeś/byłaś", „zrobiłeś/zrobiłaś", „byś zapisał/zapisała", „mógłbyś/mogłabyś", „chciałbyś/chciałabyś", „zauważyłeś/zauważyłaś". One natychmiast zdradzają, że zakładasz płeć.
- Zamiast nich stosuj formy NEUTRALNE:
  • TRYB ROZKAZUJĄCY (bezpłciowy) — to Twoje główne narzędzie: „Zapisz…", „Spróbuj…", „Opowiedz…", „Zauważ…", „Pomyśl…", „Zwróć uwagę…".
  • Czas teraźniejszy w 2. osobie: „czujesz", „piszesz", „wracasz", „nosisz w sobie".
  • Formy bezosobowe i strona bierna: „coś wraca", „pojawia się", „daje się odczuć", „warto zapisać", „można zauważyć".
- Przykład poprawki: zamiast „Zachęcam, byś zapisał, co czujesz" → „Spróbuj zapisać, co się w tych chwilach pojawia". Buduj każde zdanie tak, by pasowało do dowolnej osoby.

NA CZYM PRACUJESZ:
- Otrzymujesz fragmenty dziennika jako KONTEKST — to prawdziwe zapiski tej osoby. Traktuj je z powagą i dyskrecją. Interpretuj wyłącznie to, co napisano; nie zmyślaj faktów. Czego brakuje — zapytaj.

TRYBY ROZMOWY:
- "analiza wpisu": gdy w kontekście są WPISY DNIA, skup się na nich (w jednym dniu może być kilka różnych myśli — potraktuj je łącznie jako zapis tego samego dnia); starsze zapiski to tło. Zacznij od krótkiej, trafnej obserwacji, potem zaproś do rozmowy.
- "ogólny": gdy nie ma wpisu dnia, odpowiadaj na pytania w oparciu o zapiski z ostatnich tygodni — wskazuj wzorce i powracające motywy.
- Gdy zapisków brak lub są bardzo skąpe, łagodnie zachęć do pisania dziennika.

PRZYKŁAD (wzorzec tonu, neutralności i DŁUGOŚCI — nie cytuj go dosłownie):
Użytkownik: "Od kilku dni wciąż śni mi się dom z dzieciństwa. Wracam do niego, ale drzwi są zamknięte."
Terapeuta: "Sen rzadko mówi wprost — przemawia obrazem. Dom z dzieciństwa to często my sami z czasów, gdy świat był prosty, a bezpieczeństwo oczywiste. To, że wracasz, zdradza tęsknotę; zamknięte drzwi zdają się mówić o czymś, co dziś wydaje się nieosiągalne — albo czego część Ciebie woli nie otwierać.

Co zostało po drugiej stronie tych drzwi?"
${SAFETY_RULES}`,
};

function formatEntryTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Buduje blok kontekstu (czysty tekst) wstrzykiwany do promptu systemowego:
 * WSZYSTKIE wpisy z analizowanego dnia (oś rozmowy) + tło z ostatnich N dni + opcjonalnie powiązane wpisy.
 *
 * `dayEntries` to komplet wpisów z jednego dnia (może być ich kilka — krótkie myśli
 * z całego dnia). Renderujemy je chronologicznie i traktujemy łącznie.
 * `relevantEntries` to wyniki wyszukiwania hybrydowego (dopasowane do pytania użytkownika).
 */
export function buildContextBlock(
  dayEntries: Entry[],
  recentEntries: Entry[],
  relevantEntries?: Entry[]
): string {
  const parts: string[] = [];

  if (dayEntries.length > 0) {
    // chronologicznie (od rana) — myśli z całego dnia czytane po kolei
    const ordered = [...dayEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const dateLabel = formatEntryDate(ordered[0].date);
    const multi = ordered.length > 1;
    const rendered = ordered
      .map((e, i) => {
        const text = htmlToPlainText(e.content) || "(pusty wpis)";
        return multi ? `— wpis ${i + 1} (${formatEntryTime(e.date)}) —\n${text}` : text;
      })
      .join("\n\n");
    const header = multi
      ? `=== WPISY DNIA (oś tej rozmowy) — ${dateLabel} ===\n` +
        `(Tego dnia zapisano ${ordered.length} wpisy/wpisów; potraktuj je łącznie jako myśli z jednego dnia.)`
      : `=== WPIS DNIA (oś tej rozmowy) — ${dateLabel} ===`;
    parts.push(`${header}\n\n${rendered}`);
  }

  // Powiązane wpisy (wyszukiwanie hybrydowe — najlepiej dopasowane do pytania/tematu).
  if (relevantEntries && relevantEntries.length > 0) {
    const dayIds = new Set(dayEntries.map((e) => e.id));
    const unique = relevantEntries.filter((e) => !dayIds.has(e.id));
    if (unique.length > 0) {
      const rendered = unique
        .map((e) => {
          const text = htmlToPlainText(e.content);
          return `— ${formatEntryDate(e.date)} —\n${text || "(pusty wpis)"}`;
        })
        .join("\n\n");
      parts.push(
        `=== POWIĄZANE WCZEŚNIEJSZE WPISY (dopasowane do pytania) ===\n${rendered}`
      );
    }
  }

  // Tło: pozostałe zapiski (z wykluczeniem wpisów dnia i powiązanych, gdyby się powtórzyły).
  const dayIds = new Set(dayEntries.map((e) => e.id));
  const relevantIds = new Set((relevantEntries ?? []).map((e) => e.id));
  const background = recentEntries
    .filter((e) => !dayIds.has(e.id) && !relevantIds.has(e.id))
    .slice(0, 60);

  if (background.length > 0) {
    const rendered = background
      .map((e) => {
        const text = htmlToPlainText(e.content);
        return `— ${formatEntryDate(e.date)} —\n${text || "(pusty wpis)"}`;
      })
      .join("\n\n");
    parts.push(
      `=== TŁO: zapiski z ostatnich tygodni (od najnowszych) ===\n${rendered}`
    );
  }

  if (parts.length === 0) {
    return "=== KONTEKST ===\nUżytkownik nie ma jeszcze zapisków w dzienniku.";
  }

  return parts.join("\n\n");
}
