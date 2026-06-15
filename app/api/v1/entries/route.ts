import { db, json, apiError, requireToken, mapDbError, plainTextToHtml, preflight } from "@/lib/api/server";
import { uploadApiPhotos, resolveUserId } from "@/lib/api/server-storage";
import { htmlToPlainText } from "@/lib/freud";

/**
 * /api/v1/entries
 *  POST — dodaje nowy wpis (domyślnie z datą dnia dzisiejszego).
 *  GET  — zwraca wpisy z konkretnego dnia (?date=YYYY-MM-DD, domyślnie dziś).
 * Uwierzytelnianie: Authorization: Bearer <token>.
 */

export const dynamic = "force-dynamic";

interface EntryRow {
  id: string;
  date: string;
  content: string;
  title: string | null;
  photo_url: string | null;
  photo_paths: string[] | null;
  created_at: string;
}

/** Publiczna reprezentacja wpisu zwracana z API. */
function toDto(row: EntryRow) {
  return {
    id: row.id,
    date: row.date,
    title: row.title ?? null,
    content: row.content, // HTML tak jak przechowywany w Echo
    text: htmlToPlainText(row.content), // wygodny czysty tekst
    photoPaths: row.photo_paths ?? [],
    createdAt: row.created_at,
  };
}

/** YYYY-MM-DD; akceptuje też pełne ISO i bierze część dzienną. */
function parseDate(input: string | null): string | null {
  if (!input) return null;
  const m = input.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function OPTIONS() {
  return preflight();
}

export async function POST(req: Request) {
  const auth = requireToken(req);
  if ("response" in auth) return auth.response;

  let body: { content?: unknown; title?: unknown; date?: unknown; photos?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("bad_request", "Treść żądania musi być poprawnym JSON-em.", 400);
  }

  if (typeof body.content !== "string" || !body.content.trim()) {
    return apiError("bad_request", "Pole 'content' jest wymagane (niepusty tekst).", 400);
  }
  if (body.title != null && typeof body.title !== "string") {
    return apiError("bad_request", "Pole 'title' musi być tekstem.", 400);
  }
  if (body.date != null && typeof body.date !== "string") {
    return apiError("bad_request", "Pole 'date' musi być tekstem (ISO 8601).", 400);
  }
  if (body.photos != null) {
    if (!Array.isArray(body.photos) || body.photos.some((p) => typeof p !== "string")) {
      return apiError(
        "bad_request",
        "Pole 'photos' musi być listą napisów (data URL z base64).",
        400
      );
    }
    if (body.photos.length > 10) {
      return apiError("bad_request", "Maksymalnie 10 zdjęć na wpis.", 400);
    }
  }

  // Domyślnie: teraz (dzień dzisiejszy). Jeśli podano datę bez czasu, ustaw południe UTC,
  // żeby uniknąć przesunięć stref czasowych przy wyświetlaniu dnia.
  let dateIso: string;
  if (typeof body.date === "string" && body.date.trim()) {
    const onlyDate = parseDate(body.date);
    dateIso = body.date.includes("T")
      ? new Date(body.date).toISOString()
      : new Date(`${onlyDate}T12:00:00.000Z`).toISOString();
    if (Number.isNaN(Date.parse(dateIso))) {
      return apiError("bad_request", "Pole 'date' ma nieprawidłowy format.", 400);
    }
  } else {
    dateIso = new Date().toISOString();
  }

  // Upload zdjęć (opcjonalne) — przed insertem.
  let photoPaths: string[] = [];
  const photos = body.photos as string[] | undefined;
  if (photos && photos.length) {
    const userId = await resolveUserId(db(), auth.tokenHash);
    if (!userId) {
      return apiError("invalid_token", "Nieprawidłowy lub odwołany token API.", 401);
    }
    try {
      photoPaths = await uploadApiPhotos(userId, photos);
    } catch (err) {
      console.error("entries POST: photo upload failed", err);
      return apiError(
        "server_error",
        "Nie udało się wgrać zdjęć (brak konfiguracji storage po stronie serwera).",
        500
      );
    }
  }

  const { data, error } = await db().rpc("api_add_entry", {
    p_token_hash: auth.tokenHash,
    p_content: plainTextToHtml(body.content),
    p_title: body.title ?? null,
    p_date: dateIso,
    p_photo_paths: photoPaths,
  });

  if (error) return mapDbError(error);
  return json({ entry: toDto(data as EntryRow) }, 201);
}

export async function GET(req: Request) {
  const auth = requireToken(req);
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const date = parseDate(url.searchParams.get("date")) ?? todayISODate();

  const { data, error } = await db().rpc("api_get_entries_by_date", {
    p_token_hash: auth.tokenHash,
    p_date: date,
  });

  if (error) return mapDbError(error);

  const rows = (data ?? []) as EntryRow[];
  return json({
    date,
    count: rows.length,
    entries: rows.map(toDto),
  });
}
