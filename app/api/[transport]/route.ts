import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { z } from "zod";
import { db, hashToken } from "@/lib/api/server";
import { addEntry, getEntriesByDate, askTherapist, ApiOpError } from "@/lib/api/operations";

/**
 * Zdalny serwer MCP Echo (Streamable HTTP) pod adresem /api/mcp.
 * Uwierzytelnianie: nagłówek Authorization: Bearer <token API Echo> (ten sam token co REST).
 * Udostępnia trzy narzędzia odpowiadające endpointom REST.
 */

export const maxDuration = 60;

/** Wyciąga hash tokenu z kontekstu uwierzytelnienia narzędzia. */
function tokenHashFrom(extra: { authInfo?: AuthInfo }): string {
  const hash = extra.authInfo?.extra?.tokenHash;
  if (typeof hash !== "string") {
    throw new ApiOpError("missing_token", "Brak prawidłowego tokenu API.");
  }
  return hash;
}

function textResult(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

function errorResult(err: unknown) {
  const code = err instanceof ApiOpError ? err.code : "server_error";
  const message = err instanceof Error ? err.message : "Nieznany błąd.";
  return {
    isError: true,
    content: [{ type: "text" as const, text: JSON.stringify({ error: { code, message } }, null, 2) }],
  };
}

const baseHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "echo_add_entry",
      {
        title: "Dodaj wpis do dziennika",
        description:
          "Tworzy nowy wpis w dzienniku Echo zalogowanego użytkownika. Jeśli nie podasz daty, użyta zostanie data dnia dzisiejszego.",
        inputSchema: {
          content: z.string().describe("Treść wpisu (zwykły tekst; nowe linie zachowane)."),
          title: z.string().optional().describe("Opcjonalny tytuł wpisu."),
          date: z
            .string()
            .optional()
            .describe("Data wpisu w formacie ISO 8601 (np. 2026-06-10). Domyślnie dziś."),
        },
      },
      async (args, extra) => {
        try {
          const entry = await addEntry(tokenHashFrom(extra), args);
          return textResult({ entry });
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    server.registerTool(
      "echo_get_entry",
      {
        title: "Odczytaj wpis z dnia",
        description:
          "Zwraca wpisy z konkretnego dnia. Jeśli nie podasz daty, użyty zostanie dzień dzisiejszy. Gdy brak wpisu, lista jest pusta.",
        inputSchema: {
          date: z
            .string()
            .optional()
            .describe("Dzień do odczytu w formacie YYYY-MM-DD. Domyślnie dziś."),
        },
      },
      async (args, extra) => {
        try {
          const result = await getEntriesByDate(tokenHashFrom(extra), args.date);
          return textResult(result);
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    server.registerTool(
      "echo_ask_therapist",
      {
        title: "Zapytaj psychoterapeutę",
        description:
          "Wysyła pytanie do cyfrowego psychoterapeuty i zwraca odpowiedź tekstową. Domyślnie kontekstem jest dzień dzisiejszy; pole 'date' wskazuje wpis z innego dnia jako główny kontekst (uwzględniane jest też tło z 30 dni).",
        inputSchema: {
          message: z.string().describe("Pytanie lub wiadomość do terapeuty."),
          date: z
            .string()
            .optional()
            .describe("Dzień będący głównym kontekstem (YYYY-MM-DD). Domyślnie dziś."),
        },
      },
      async (args, extra) => {
        try {
          const result = await askTherapist(tokenHashFrom(extra), args);
          return textResult(result);
        } catch (err) {
          return errorResult(err);
        }
      }
    );
  },
  {
    serverInfo: { name: "echo", version: "1.0.0" },
  },
  {
    basePath: "/api", // → endpoint Streamable HTTP: /api/mcp
    disableSse: true, // SSE jest przestarzałe w specyfikacji MCP
    maxDuration: 60,
  }
);

/**
 * Weryfikacja tokenu Bearer: hashujemy go i sprawdzamy w bazie (api_whoami).
 * Nieważny lub brakujący token → undefined (żądanie zostanie odrzucone z 401).
 */
async function verifyToken(_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;
  const tokenHash = hashToken(bearerToken);
  const { data, error } = await db().rpc("api_whoami", { p_token_hash: tokenHash });
  if (error || !data) return undefined;
  return {
    token: bearerToken,
    clientId: data as string,
    scopes: ["echo:rw"],
    extra: { tokenHash, userId: data as string },
  };
}

const handler = withMcpAuth(baseHandler, verifyToken, { required: true });

export { handler as GET, handler as POST, handler as DELETE };
