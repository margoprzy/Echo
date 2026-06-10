---
name: echo-dodaj-wpis
description: Dodaje nowy wpis do dziennika Echo (baza Supabase, tabela entries) przez connector Supabase i weryfikuje, że wpis został poprawnie zapisany. Domyślna data to dzisiaj. Użyj, gdy chcę dodać, nagrać lub zapisać wpis do Echo, zanotować dzień albo dopisać coś do swojego dziennika.
---

# Dodawanie wpisu do Echo

Twoim zadaniem jest dodawanie wpisów do mojego dziennika Echo. Wpisy leżą w
**Supabase** — łączysz się z bazą przez **connector Supabase** (musi być włączony
w tej rozmowie). NIE szukaj osobnej aplikacji „Echo" ani połączenia z „Echo";
baza Echo jest w Supabase.

- Projekt Supabase: `hiyzcmmiwpfdgpkmdrru`
- Tabela: `public.entries`
- Narzędzie: `execute_sql` z connectora Supabase

## Schemat tabeli entries
- `id` (uuid, generowane automatycznie — nie podawaj)
- `user_id` (uuid, właściciel wpisu — wymagane)
- `date` (timestamptz — data wpisu)
- `content` (text — treść jako HTML z edytora Tiptap)
- `title` (text, opcjonalne)
- `photo_url` (text, opcjonalne)
- `created_at`, `updated_at` (generowane automatycznie)

## Procedura

Gdy proszę o dodanie wpisu (mówię głosem lub piszę po polsku):

1. Jeśli nie podałam gotowej treści, pomóż ułożyć krótki, naturalny wpis na
   podstawie tego, co powiem. Pokaż mi go i poczekaj na akceptację przed zapisem.
2. Treść zapisz jako HTML — każdy akapit owiń w `<p>…</p>`.
3. Data: domyślnie dzisiejsza (ISO 8601, strefa Europe/Warsaw, np.
   `2026-06-09T12:00:00+02:00`). Inną datę („wczoraj", „3 czerwca") przelicz i
   użyj południa tego dnia.
4. Ustal `user_id` (w bazie jest jeden użytkownik):
   ```sql
   select user_id, count(*) from entries
   group by user_id order by count(*) desc limit 1;
   ```
5. Wstaw wpis i pobierz jego id (apostrofy w treści podwój: `'` → `''`):
   ```sql
   insert into entries (user_id, date, content)
   values ('<USER_ID>', '<DATA_ISO>', '<TRESC_HTML>')
   returning id;
   ```
6. Zweryfikuj zapis:
   ```sql
   select id, date, content, user_id from entries where id = '<NOWE_ID>';
   ```
   Potwierdź, że zwrócony jest dokładnie jeden wiersz, a data i treść się zgadzają.
7. Odpowiedz po polsku: potwierdź, że wpis został zapisany i zweryfikowany, podaj
   datę i id wpisu.

## Zasady
- Jeśli nie masz dostępu do narzędzi Supabase / brak połączenia — powiedz to
  wprost i poproś o włączenie connectora Supabase w tej rozmowie. Nie udawaj zapisu.
- Nie zapisuj pustego wpisu (bez treści).
- Ten skill tylko DODAJE nowe wpisy — nie edytuj i nie usuwaj istniejących.
- Zawsze odpowiadaj po polsku.
