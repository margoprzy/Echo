# Dodawanie wpisów do Echo przez aplikację Claude (telefon)

Cel: w aplikacji Claude mówisz „dodaj wpis do Echo…", a Claude zapisuje wpis do
bazy Echo (Supabase) i weryfikuje zapis. Wymaga **Claude Pro** + connectora
Supabase MCP.

## 1. Upgrade do Claude Pro
Connectory (zdalne MCP) są niedostępne na planie darmowym. W aplikacji Claude:
Ustawienia → Subskrypcja → wybierz **Pro**.

## 2. Dodaj connector Supabase
Najlepiej zrobić to raz w przeglądarce na **claude.ai** (po dodaniu działa też w
apce mobilnej):

1. claude.ai → **Settings → Connectors → Add custom connector**.
2. Wklej URL:
   ```
   https://mcp.supabase.com/mcp?project_ref=hiyzcmmiwpfdgpkmdrru&features=database
   ```
   - `project_ref=hiyzcmmiwpfdgpkmdrru` ogranicza dostęp tylko do projektu Echo.
   - `features=database` zawęża narzędzia do operacji na bazie.
   - NIE dodawaj `read_only=true` — wpisy trzeba zapisywać.
3. Zapisz i kliknij **Connect** → otworzy się logowanie Supabase (OAuth) →
   zaloguj się i wybierz organizację z projektem Echo. Zatwierdź dostęp.
4. Sprawdź połączenie: w czacie napisz „Jakie tabele są w bazie? Użyj Supabase
   MCP." — powinno wymienić m.in. `entries`.

## 3. Włącz connector w apce mobilnej
W aplikacji Claude na telefonie włącz connector „Supabase" dla rozmowy
(ikona narzędzi / connectors przy polu wiadomości).

## 4. Instrukcja dla Claude (wklej jako stałą instrukcję)
Najlepiej utwórz **Projekt** w Claude („Echo dziennik") i wklej poniższy tekst w
instrukcjach projektu. Dzięki temu nie musisz tłumaczyć tego za każdym razem —
wystarczy napisać np. „dodaj wpis: dziś był spokojny dzień…".

---
Jesteś asystentem do dodawania wpisów w moim dzienniku Echo. Wpisy trzymane są w
Supabase, projekt `hiyzcmmiwpfdgpkmdrru`, tabela `public.entries`. Używaj
narzędzi Supabase MCP (`execute_sql`).

Schemat `entries`: `id` (uuid, auto), `user_id` (uuid, właściciel), `date`
(timestamptz), `content` (text = HTML z edytora Tiptap), `title` (nullable),
`photo_url` (nullable), `created_at`/`updated_at` (auto).

Gdy proszę o dodanie wpisu:
1. Pomóż ułożyć krótką, naturalną treść, jeśli nie podaję gotowej. Pokaż mi ją i
   poczekaj na akceptację.
2. Treść zapisz jako HTML — każdy akapit w `<p>…</p>`.
3. Data domyślnie dzisiejsza (ISO 8601, strefa Europe/Warsaw, np.
   `2026-06-09T12:00:00+02:00`). Inną datę przelicz.
4. Ustal `user_id`: `select user_id, count(*) from entries group by user_id
   order by count(*) desc limit 1;` (w bazie jest jeden użytkownik).
5. Wstaw wpis i pobierz id:
   `insert into entries (user_id, date, content) values ('<USER_ID>', '<DATE>',
   '<HTML>') returning id;` (escapuj apostrofy: `'` → `''`).
6. ZWERYFIKUJ: `select id, date, content, user_id from entries where id =
   '<NEW_ID>';` — potwierdź, że wiersz istnieje i dane się zgadzają.
7. Potwierdź po polsku: data + id wpisu. Jeśli weryfikacja zawiedzie — zgłoś
   problem, nie udawaj sukcesu.

Nie zapisuj pustych wpisów. Ten tryb tylko DODAJE nowe wpisy.
---

## Uwagi bezpieczeństwa
- Connector daje Claude pełny dostęp (admin) do bazy Echo — omija RLS. To OK dla
  Twojego prywatnego, jednoosobowego dziennika, ale traktuj go jak dostęp do
  całej bazy. Nie udostępniaj tego connectora innym osobom.
- Supabase oficjalnie odradza podłączanie MCP do produkcji — tu świadomie
  akceptujemy ryzyko dla wygody. Zatwierdzaj wywołania narzędzi, zanim się wykonają.
- Echo jako zwykła aplikacja na telefonie (bez Claude) działa pod
  https://echo-dziennik.vercel.app — to zawsze dostępna, bezpieczna alternatywa.
