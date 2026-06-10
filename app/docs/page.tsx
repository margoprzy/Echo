import type { Metadata } from "next";
import Link from "next/link";
import { FileText, KeyRound, ArrowLeft, Plug } from "lucide-react";
import CodeBlock from "@/components/CodeBlock";
import ApiKeysManager from "@/components/ApiKeysManager";
import DocsNav, { type DocsNavGroup } from "@/components/DocsNav";

export const metadata: Metadata = {
  title: "Echo API & MCP — dokumentacja",
  description:
    "Dokumentacja Echo: REST API (wpisy, terapeuta) oraz serwer MCP dla agentów AI.",
};

const BASE_URL = "https://echo-dziennik.vercel.app";
const MCP_URL = `${BASE_URL}/api/mcp`;

const NAV_GROUPS: DocsNavGroup[] = [
  {
    title: "REST API",
    items: [
      { id: "keys", label: "Twoje klucze API" },
      { id: "auth", label: "Uwierzytelnianie" },
      { id: "add-entry", label: "Dodaj wpis" },
      { id: "therapist", label: "Zapytaj terapeutę" },
      { id: "get-entry", label: "Odczytaj wpis" },
      { id: "errors", label: "Błędy" },
    ],
  },
  {
    title: "MCP (dla agentów AI)",
    items: [
      { id: "mcp-about", label: "Czym jest MCP" },
      { id: "mcp-config", label: "Konfiguracja" },
      { id: "mcp-connect", label: "Podłączenie klienta" },
      { id: "mcp-tools", label: "Narzędzia" },
    ],
  },
];

function Method({ verb }: { verb: "GET" | "POST" }) {
  const color = verb === "GET" ? "#34D399" : "#A07DE0";
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide"
      style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
    >
      {verb}
    </span>
  );
}

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section
      id={id}
      className="scroll-mt-20 p-5 rounded-[20px] border border-white/10 space-y-4"
      style={{ background: "rgba(255,255,255,0.035)" }}
    >
      {children}
    </section>
  );
}

function Field({ name, type, required, desc }: { name: string; type: string; required?: boolean; desc: string }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <code className="text-[13px] text-[#C4A8FF] font-mono">{name}</code>
      <span className="text-[11px] text-white/35">{type}</span>
      {required ? (
        <span className="text-[10px] font-semibold text-[#F0A0A0]">wymagane</span>
      ) : (
        <span className="text-[10px] text-white/30">opcjonalne</span>
      )}
      <span className="w-full text-xs text-white/55 leading-relaxed">{desc}</span>
    </li>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-white/45 uppercase tracking-wide">{children}</p>
  );
}

export default function DocsPage() {
  return (
    <div className="px-5 pt-4 md:pt-12 pb-16">
      {/* Nagłówek */}
      <header className="space-y-2 mb-6">
        <div className="flex items-center gap-2.5">
          <FileText size={22} className="text-[#A07DE0]" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Echo — API &amp; MCP</h1>
        </div>
        <p className="text-sm text-white/55 leading-relaxed">
          Programowy dostęp do dziennika Echo. Masz do wyboru zwykłe REST API oraz serwer MCP dla
          agentów AI. Oba działają w kontekście użytkownika, którego token API został użyty.
        </p>
        <p className="text-xs text-white/35">
          Bazowy URL: <code className="text-white/70 font-mono">{BASE_URL}</code>
        </p>
      </header>

      {/* Mobile: nawigacja na górze */}
      <div className="md:hidden mb-6 p-4 rounded-[16px] border border-white/10" style={{ background: "rgba(255,255,255,0.03)" }}>
        <DocsNav groups={NAV_GROUPS} />
      </div>

      {/* Układ dwukolumnowy */}
      <div className="md:grid md:grid-cols-[160px_1fr] md:gap-8">
        {/* Lewa kolumna — sticky */}
        <aside className="hidden md:block">
          <div className="sticky top-12">
            <DocsNav groups={NAV_GROUPS} />
          </div>
        </aside>

        {/* Treść */}
        <div className="space-y-6 min-w-0">
          {/* ===================== REST API ===================== */}

          {/* Klucze API */}
          <ApiKeysManager />

          {/* Uwierzytelnianie */}
          <Section id="auth">
            <div className="flex items-center gap-2">
              <KeyRound size={18} className="text-[#A07DE0]" />
              <h2 className="text-lg font-semibold text-white">Uwierzytelnianie</h2>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              Każde żądanie wymaga osobistego tokenu API w nagłówku{" "}
              <code className="text-[#C4A8FF] font-mono text-xs">Authorization</code>. Token jest
              powiązany z jednym użytkownikiem — serwer sam ustala, czyje to dane. Wygenerujesz go w
              sekcji{" "}
              <a href="#keys" className="text-[#C4A8FF] underline underline-offset-2">
                Twoje klucze API
              </a>{" "}
              (po zalogowaniu). Pokazujemy go tylko raz.
            </p>
            <CodeBlock lang="http" code={`Authorization: Bearer echo_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`} />
            <p className="text-xs text-white/40">
              Brak lub nieprawidłowy token zwraca <code className="font-mono">401</code>.
            </p>
          </Section>

          {/* 1. Dodaj wpis */}
          <Section id="add-entry">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Method verb="POST" />
              <code className="text-sm font-mono text-white">/api/v1/entries</code>
            </div>
            <h2 className="text-lg font-semibold text-white">Dodaj nowy wpis</h2>
            <p className="text-sm text-white/60 leading-relaxed">
              Tworzy nowy wpis. Jeśli nie podasz daty, użyta zostanie data dnia dzisiejszego.
            </p>
            <Label>Body (JSON)</Label>
            <ul className="space-y-2.5">
              <Field name="content" type="string" required desc="Treść wpisu (zwykły tekst; nowe linie są zachowane)." />
              <Field name="title" type="string" desc="Opcjonalny tytuł wpisu." />
              <Field name="date" type="string (ISO 8601)" desc="Data wpisu, np. „2026-06-10”. Domyślnie dziś." />
            </ul>
            <Label>Przykład</Label>
            <CodeBlock
              lang="bash"
              code={`curl -X POST ${BASE_URL}/api/v1/entries \\
  -H "Authorization: Bearer $ECHO_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Dziś był spokojny dzień. Dużo spacerowałem.",
    "title": "Spokój"
  }'`}
            />
            <Label>Odpowiedź 201</Label>
            <CodeBlock
              lang="json"
              code={`{
  "entry": {
    "id": "a1b2c3d4-…",
    "date": "2026-06-10T09:30:00.000Z",
    "title": "Spokój",
    "content": "<p>Dziś był spokojny dzień. Dużo spacerowałem.</p>",
    "text": "Dziś był spokojny dzień. Dużo spacerowałem.",
    "createdAt": "2026-06-10T09:30:00.000Z"
  }
}`}
            />
          </Section>

          {/* 2. Terapeuta */}
          <Section id="therapist">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Method verb="POST" />
              <code className="text-sm font-mono text-white">/api/v1/therapist</code>
            </div>
            <h2 className="text-lg font-semibold text-white">Zapytaj psychoterapeutę</h2>
            <p className="text-sm text-white/60 leading-relaxed">
              Wysyłasz pytanie (tekst) i otrzymujesz odpowiedź (tekst). Domyślnie kontekstem jest
              dzień dzisiejszy; pole <code className="text-[#C4A8FF] font-mono text-xs">date</code>{" "}
              wskazuje wpis z innego dnia. Uwzględniane jest też tło z ostatnich 30 dni.
            </p>
            <Label>Body (JSON)</Label>
            <ul className="space-y-2.5">
              <Field name="message" type="string" required desc="Twoje pytanie lub wiadomość do terapeuty." />
              <Field name="date" type="string (YYYY-MM-DD)" desc="Dzień będący głównym kontekstem. Domyślnie dziś." />
            </ul>
            <Label>Przykład</Label>
            <CodeBlock
              lang="bash"
              code={`curl -X POST ${BASE_URL}/api/v1/therapist \\
  -H "Authorization: Bearer $ECHO_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Dlaczego ostatnio czuję niepokój wieczorami?",
    "date": "2026-06-09"
  }'`}
            />
            <Label>Odpowiedź 200</Label>
            <CodeBlock
              lang="json"
              code={`{
  "reply": "Niepokój wieczorem często pojawia się, gdy dzień cichnie…",
  "contextDate": "2026-06-09",
  "contextEntries": 1
}`}
            />
          </Section>

          {/* 3. Odczytaj wpis */}
          <Section id="get-entry">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Method verb="GET" />
              <code className="text-sm font-mono text-white">/api/v1/entries?date=YYYY-MM-DD</code>
            </div>
            <h2 className="text-lg font-semibold text-white">Odczytaj wpis z dnia</h2>
            <p className="text-sm text-white/60 leading-relaxed">
              Zwraca wpisy z podanego dnia (domyślnie dziś). Gdy brak wpisu, lista jest pusta
              (<code className="font-mono">count: 0</code>).
            </p>
            <Label>Query</Label>
            <ul className="space-y-2.5">
              <Field name="date" type="string (YYYY-MM-DD)" desc="Dzień do odczytu. Domyślnie dziś." />
            </ul>
            <Label>Przykład</Label>
            <CodeBlock
              lang="bash"
              code={`curl "${BASE_URL}/api/v1/entries?date=2026-06-10" \\
  -H "Authorization: Bearer $ECHO_TOKEN"`}
            />
            <Label>Odpowiedź 200</Label>
            <CodeBlock
              lang="json"
              code={`{
  "date": "2026-06-10",
  "count": 1,
  "entries": [
    {
      "id": "a1b2c3d4-…",
      "date": "2026-06-10T09:30:00.000Z",
      "title": "Spokój",
      "content": "<p>Dziś był spokojny dzień…</p>",
      "text": "Dziś był spokojny dzień…",
      "createdAt": "2026-06-10T09:30:00.000Z"
    }
  ]
}`}
            />
          </Section>

          {/* Błędy */}
          <Section id="errors">
            <h2 className="text-lg font-semibold text-white">Błędy</h2>
            <p className="text-sm text-white/60 leading-relaxed">
              Błędy zwracane są jako JSON ze stałą strukturą i odpowiednim kodem HTTP.
            </p>
            <CodeBlock
              lang="json"
              code={`{ "error": { "code": "invalid_token", "message": "Nieprawidłowy lub odwołany token API." } }`}
            />
            <ul className="space-y-2 text-sm">
              <li className="flex gap-3">
                <code className="text-[#F0A0A0] font-mono text-xs w-8 shrink-0">400</code>
                <span className="text-white/55">Nieprawidłowe żądanie (np. brak pola <code className="font-mono text-xs">content</code>).</span>
              </li>
              <li className="flex gap-3">
                <code className="text-[#F0A0A0] font-mono text-xs w-8 shrink-0">401</code>
                <span className="text-white/55">Brak lub nieprawidłowy token API.</span>
              </li>
              <li className="flex gap-3">
                <code className="text-[#F0A0A0] font-mono text-xs w-8 shrink-0">502</code>
                <span className="text-white/55">Model AI chwilowo niedostępny (dotyczy terapeuty).</span>
              </li>
            </ul>
          </Section>

          {/* ===================== MCP ===================== */}

          {/* Czym jest MCP */}
          <Section id="mcp-about">
            <div className="flex items-center gap-2">
              <Plug size={18} className="text-[#A07DE0]" />
              <h2 className="text-lg font-semibold text-white">Serwer MCP — dla agentów AI</h2>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              Echo udostępnia serwer <strong className="text-white/80">MCP</strong> (Model Context
              Protocol). Dzięki niemu agenci AI (Claude, Cursor i inni kompatybilni klienci) mogą
              korzystać z Twojego dziennika bez pisania kodu — wystarczy podać adres serwera i token.
              Agent dostaje trzy gotowe narzędzia: dodawanie wpisu, odczyt wpisu z dnia oraz pytanie
              do psychoterapeuty.
            </p>
            <ul className="space-y-1.5 text-sm text-white/60">
              <li>• Transport: <strong className="text-white/80">Streamable HTTP</strong> (zdalny, nic nie instalujesz).</li>
              <li>• Nazwa serwera: <code className="text-[#C4A8FF] font-mono text-xs">echo</code></li>
              <li>• Uwierzytelnianie: ten sam token Bearer co w REST API.</li>
            </ul>
          </Section>

          {/* Konfiguracja */}
          <Section id="mcp-config">
            <h2 className="text-lg font-semibold text-white">Konfiguracja</h2>
            <p className="text-sm text-white/60 leading-relaxed">
              Potrzebujesz dwóch rzeczy: adresu serwera MCP oraz tokenu API (wygeneruj go w sekcji{" "}
              <a href="#keys" className="text-[#C4A8FF] underline underline-offset-2">Twoje klucze API</a>).
            </p>
            <Label>Adres serwera (endpoint MCP)</Label>
            <CodeBlock lang="url" code={MCP_URL} />
            <Label>Nagłówek uwierzytelnienia</Label>
            <CodeBlock lang="http" code={`Authorization: Bearer echo_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`} />
          </Section>

          {/* Podłączenie klienta */}
          <Section id="mcp-connect">
            <h2 className="text-lg font-semibold text-white">Podłączenie klienta</h2>
            <p className="text-sm text-white/60 leading-relaxed">
              Przykłady dla popularnych klientów. Podmień token na własny.
            </p>
            <Label>Claude Code (CLI)</Label>
            <CodeBlock
              lang="bash"
              code={`claude mcp add --transport http echo ${MCP_URL} \\
  --header "Authorization: Bearer echo_sk_xxxxxxxx"`}
            />
            <Label>Klient z plikiem konfiguracyjnym (JSON)</Label>
            <CodeBlock
              lang="json"
              code={`{
  "mcpServers": {
    "echo": {
      "url": "${MCP_URL}",
      "headers": {
        "Authorization": "Bearer echo_sk_xxxxxxxx"
      }
    }
  }
}`}
            />
            <p className="text-xs text-white/40">
              Klienci obsługujący wyłącznie serwery lokalne (stdio) mogą połączyć się przez most
              <code className="font-mono text-xs"> mcp-remote</code>, wskazując powyższy adres.
            </p>
          </Section>

          {/* Narzędzia */}
          <Section id="mcp-tools">
            <h2 className="text-lg font-semibold text-white">Narzędzia MCP</h2>
            <p className="text-sm text-white/60 leading-relaxed">
              Serwer udostępnia trzy narzędzia. Każde odpowiada jednemu endpointowi REST i zwraca
              dane w formacie tekstowym (JSON).
            </p>

            <div className="space-y-1.5">
              <code className="text-sm font-mono text-[#C4A8FF]">echo_add_entry</code>
              <p className="text-sm text-white/55">Dodaje nowy wpis (data domyślnie dziś).</p>
              <ul className="space-y-2 pl-1">
                <Field name="content" type="string" required desc="Treść wpisu." />
                <Field name="title" type="string" desc="Opcjonalny tytuł." />
                <Field name="date" type="string (ISO 8601)" desc="Data wpisu. Domyślnie dziś." />
              </ul>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
              <code className="text-sm font-mono text-[#C4A8FF]">echo_get_entry</code>
              <p className="text-sm text-white/55">Zwraca wpisy z konkretnego dnia.</p>
              <ul className="space-y-2 pl-1">
                <Field name="date" type="string (YYYY-MM-DD)" desc="Dzień do odczytu. Domyślnie dziś." />
              </ul>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
              <code className="text-sm font-mono text-[#C4A8FF]">echo_ask_therapist</code>
              <p className="text-sm text-white/55">Wysyła pytanie do psychoterapeuty i zwraca odpowiedź.</p>
              <ul className="space-y-2 pl-1">
                <Field name="message" type="string" required desc="Pytanie do terapeuty." />
                <Field name="date" type="string (YYYY-MM-DD)" desc="Dzień będący kontekstem. Domyślnie dziś." />
              </ul>
            </div>

            <Label>Przykład wywołania (echo_add_entry)</Label>
            <CodeBlock
              lang="json"
              code={`// tools/call
{
  "name": "echo_add_entry",
  "arguments": {
    "content": "Dziś dużo spacerowałem.",
    "title": "Spokój"
  }
}`}
            />
          </Section>

          <Link
            href="/write"
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Wróć do aplikacji
          </Link>
        </div>
      </div>
    </div>
  );
}
