import { cleanEnv } from "@/lib/env";

/**
 * Warstwa embeddingów (OpenAI `text-embedding-3-small`, 1536 wymiarów).
 * Jeden wektor na wpis — bez chunkowania. Używane do:
 *  - seedowania historii wpisów (skrypt),
 *  - osadzania zapytań użytkownika w czasie rzeczywistym przed wyszukiwaniem hybrydowym.
 *
 * Klucz: OPENAI_API_KEY (czyszczony przez cleanEnv, spójnie z resztą repo).
 */

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIM = 1536;

const ENDPOINT = "https://api.openai.com/v1/embeddings";

function apiKey(): string {
  const key = cleanEnv(process.env.OPENAI_API_KEY);
  if (!key) {
    throw new Error("Brak OPENAI_API_KEY po stronie serwera.");
  }
  return key;
}

async function callOpenAI(input: string | string[]): Promise<number[][]> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI embeddings ${res.status}: ${detail.slice(0, 300)}`);
  }
  const json = (await res.json()) as { data: { embedding: number[]; index: number }[] };
  // OpenAI gwarantuje kolejność po `index` — sortujemy dla pewności.
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

/** Embedding pojedynczego tekstu (np. zapytania użytkownika). */
export async function embedText(text: string): Promise<number[]> {
  const [vec] = await callOpenAI(text.slice(0, 8000));
  return vec;
}

/**
 * Embedding wielu tekstów jednym żądaniem. Wołający powinien dzielić na paczki
 * (~100 wejść), żeby nie przekroczyć limitów tokenów requesta.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  return callOpenAI(texts.map((t) => t.slice(0, 8000)));
}

/** Format wektora akceptowany przez pgvector / funkcje RPC: "[0.1,0.2,...]". */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
