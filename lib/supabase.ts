import { createClient } from "@supabase/supabase-js";

/**
 * Czysci wartosc zmiennej srodowiskowej. URL-e i klucze Supabase skladaja sie wylacznie
 * z drukowalnych znakow ASCII, wiec zostawiamy tylko zakres 0x21-0x7E. To usuwa BOM (U+FEFF),
 * zero-width / non-breaking spaces, znaki sterujace i biale znaki, ktore w naglowku HTTP
 * powoduja blad "Cannot convert argument to a ByteString". Na koncu zdejmujemy cudzyslowy.
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

export const supabase = createClient(
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);
