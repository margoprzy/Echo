"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function translateError(msg: string): string {
    if (msg.includes("Invalid login credentials")) return "Nieprawidłowy e-mail lub hasło";
    if (msg.includes("User already registered")) return "Konto z tym e-mailem już istnieje";
    if (msg.includes("Password should be at least")) return "Hasło musi mieć co najmniej 6 znaków";
    if (msg.includes("invalid format")) return "Nieprawidłowy format e-maila";
    if (msg.includes("Email not confirmed")) return "E-mail nie został potwierdzony";
    if (msg.includes("Invalid email")) return "Nieprawidłowy e-mail";
    return "Wystąpił błąd. Spróbuj ponownie.";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const err = mode === "login"
      ? await signIn(email, password)
      : await signUp(email, password);
    if (err) setError(translateError(err));
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Echo</h1>
          <p className="text-white/40 text-sm mt-2">Twój prywatny dziennik</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            required
            className="w-full px-4 py-3 rounded-[14px] text-white text-sm placeholder-white/25 outline-none"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(124,92,191,0.35)",
            }}
          />
          <div className="space-y-1">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Hasło"
              required
              className="w-full px-4 py-3 rounded-[14px] text-white text-sm placeholder-white/25 outline-none"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${password.length > 0 && password.length < 6 ? "rgba(255,255,255,0.15)" : "rgba(124,92,191,0.35)"}`,
              }}
            />
            {password.length > 0 && password.length < 6 && (
              <p className="text-white/40 text-xs px-1">Hasło musi mieć co najmniej 6 znaków</p>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-xs px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-[16px] font-semibold text-sm text-white disabled:opacity-50 transition-all active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #7C5CBF 0%, #A07DE0 100%)",
            }}
          >
            {loading ? "..." : mode === "login" ? "Zaloguj się" : "Zarejestruj się"}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
          className="text-sm text-white/30 hover:text-white/60 transition-colors"
        >
          {mode === "login" ? "Nie masz konta? Zarejestruj się" : "Masz już konto? Zaloguj się"}
        </button>
      </div>
    </div>
  );
}
