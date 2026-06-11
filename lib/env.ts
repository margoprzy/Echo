/**
 * Czysci wartosc zmiennej srodowiskowej. Klucze API i URL-e skladaja sie wylacznie
 * z drukowalnych znakow ASCII, wiec zostawiamy tylko zakres 0x21-0x7E. To usuwa BOM (U+FEFF),
 * zero-width / non-breaking spaces, znaki sterujace i biale znaki, ktore w naglowku HTTP
 * powoduja blad "Cannot convert argument to a ByteString". Na koncu zdejmujemy cudzyslowy.
 *
 * Uzywane dla NEXT_PUBLIC_SUPABASE_* oraz XAI_API_KEY — wartosci wklejone z plikow UTF-8
 * potrafia miec wiodacy BOM, ktory psuje wszystkie zadania (Supabase, xAI).
 */
export function cleanEnv(value: string | undefined): string {
  const printable = Array.from(value ?? "")
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 0x21 && code <= 0x7e;
    })
    .join("");
  return printable.replace(/^["']|["']$/g, "");
}
