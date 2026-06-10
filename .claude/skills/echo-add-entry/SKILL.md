---
name: echo-add-entry
description: Dodaje nowy wpis do dziennika Echo w imieniu zalogowanej osoby (logowanie do jej konta Echo + zapis przez Supabase REST) i weryfikuje, że wpis został poprawnie zapisany. Domyślna data to dzisiaj. Użyj, gdy ktoś mówi, że chce dodać/zapisać wpis do Echo, zanotować dzień albo dopisać coś do swojego dziennika.
---

# Dodawanie wpisu do Echo (dla dowolnej zalogowanej osoby)

Ten skill dodaje wpis do aplikacji **Echo** w imieniu osoby, która ma **własne
konto w Echo**. Działa u każdego — nie wymaga żadnego sekretnego admin-tokenu
ani Supabase MCP. Logujesz osobę jej e-mailem i hasłem przez publiczny klucz
`anon`, dostajesz token sesji (JWT) i wstawiasz wpis jako ta osoba. Dzięki RLS
wpis trafia wyłącznie do JEJ dziennika.

Treść wpisu pomagasz ułożyć w rozmowie. Weryfikacja zapisu jest obowiązkowa.

## Stałe (publiczne — bezpieczne do osadzenia)

- **Supabase URL:** `https://hiyzcmmiwpfdgpkmdrru.supabase.co`
- **Klucz anon (publishable):** `sb_publishable_1bDII9zhRqcX97JTEnOA5Q_Kd4iSYr6`

Klucz `anon` jest publiczny (i tak trafia do przeglądarki). Sam w sobie nie daje
dostępu do danych — wszystko chroni RLS, więc bez zalogowania nic nie zapiszesz.

Tabela `entries`: `id` (uuid, auto), `user_id` (uuid, = właściciel),
`date` (timestamptz), `content` (text, HTML z Tiptap), `title` (text, nullable),
`photo_url` (text, nullable), `created_at`/`updated_at` (auto). Polityka RLS
`users_own_entries`: `user_id = auth.uid()` — każdy widzi i zapisuje tylko swoje.

## Procedura

### 1. Uzyskaj dane logowania do Echo

Potrzebny e-mail i hasło konta Echo tej osoby. Kolejność:

1. Sprawdź zmienne środowiskowe `ECHO_EMAIL` i `ECHO_PASSWORD` — jeśli są, użyj ich.
2. Jeśli nie ma — poproś osobę o e-mail i hasło do Echo.

**Bezpieczeństwo:** hasło wysyłasz tylko do Supabase po HTTPS. Nigdy nie zapisuj
hasła do pliku, repo ani pamięci. Jeśli osoba woli nie podawać hasła w czacie,
zaproponuj ustawienie `ECHO_EMAIL`/`ECHO_PASSWORD` w jej środowisku.

### 2. Zaloguj i pobierz token + user_id

```bash
curl -s -X POST \
  "https://hiyzcmmiwpfdgpkmdrru.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: sb_publishable_1bDII9zhRqcX97JTEnOA5Q_Kd4iSYr6" \
  -H "Content-Type: application/json" \
  -d '{"email":"<EMAIL>","password":"<HASŁO>"}'
```

Z odpowiedzi weź `access_token` (JWT) oraz `user.id` (to `user_id` wpisu).
Jeśli odpowiedź zawiera błąd (np. `invalid_grant`) — logowanie się nie powiodło;
zgłoś to i poproś o poprawne dane. Nie kontynuuj bez tokenu.

### 3. Ustal treść wpisu

Pomóż ułożyć treść — dopytaj o przebieg dnia / emocje, jeśli nie ma gotowego
tekstu, i zaproponuj zwięzły wpis. **Pokaż treść i poczekaj na akceptację przed
zapisem.** Treść to **HTML** (Tiptap) — każdy akapit owiń w `<p>…</p>`:

```
<p>Pierwszy akapit.</p><p>Drugi akapit.</p>
```

Nie zapisuj pustego wpisu.

### 4. Ustal datę

Domyślnie **dzisiaj**. Użyj ISO 8601 w strefie Europe/Warsaw, np.
`2026-06-09T12:00:00+02:00`. Inną datę („wczoraj", „3 czerwca") przelicz i użyj
południa tego dnia.

### 5. Wstaw wpis

Żeby uniknąć problemów z cudzysłowami w różnych powłokach, zapisz treść żądania
do pliku tymczasowego i wyślij przez `--data @plik`. Przykład body (`body.json`):

```json
{
  "user_id": "<USER_ID>",
  "date": "2026-06-09T12:00:00+02:00",
  "content": "<p>Treść wpisu.</p>",
  "title": null
}
```

```bash
curl -s -X POST \
  "https://hiyzcmmiwpfdgpkmdrru.supabase.co/rest/v1/entries" \
  -H "apikey: sb_publishable_1bDII9zhRqcX97JTEnOA5Q_Kd4iSYr6" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  --data @body.json
```

`user_id` MUSI być równy `user.id` z kroku 2 — inaczej RLS odrzuci zapis
(`new row violates row-level security policy`). Z odpowiedzi weź `id` nowego
wpisu. Po zapisie usuń plik tymczasowy.

> Na Windows/PowerShell zamiast curl możesz użyć `Invoke-RestMethod`
> (`-Method Post`, nagłówki w `-Headers`, body przez `-Body`). Mechanika ta sama.

### 6. Zweryfikuj zapis (obowiązkowe)

Odczytaj wstawiony wiersz tym samym tokenem i potwierdź zgodność:

```bash
curl -s \
  "https://hiyzcmmiwpfdgpkmdrru.supabase.co/rest/v1/entries?id=eq.<NEW_ID>&select=id,user_id,date,content,created_at" \
  -H "apikey: sb_publishable_1bDII9zhRqcX97JTEnOA5Q_Kd4iSYr6" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Sprawdź, że: zwrócony jest dokładnie jeden wiersz, `date` zgadza się z ustaloną
datą, `content` zawiera zapisaną treść, a `user_id` to id zalogowanej osoby.

### 7. Podsumuj

Potwierdź po polsku: wpis zapisany i zweryfikowany, podaj datę i `id`. Jeśli
weryfikacja się nie powiodła — nie udawaj sukcesu, zgłoś problem i zaproponuj
ponowienie.

## Uwagi

- Każdy zapis trafia do prawdziwego dziennika — nie zapisuj danych „na próbę".
- Ten skill **dodaje** nowy wpis. Edycja istniejącego to inne zadanie.
- Dzięki RLS osoba może dodać wpis wyłącznie do własnego dziennika — nie da się
  tym skillem pisać do cudzego konta.
