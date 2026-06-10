/**
 * Bezpieczne kopiowanie do schowka.
 * Próbuje Clipboard API; gdy jest niedostępne lub zablokowane (np. iframe podglądu,
 * brak HTTPS, brak uprawnień) — używa fallbacku przez ukryty <textarea>.
 * Zwraca true/false zamiast rzucać wyjątkiem.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // przechodzimy do fallbacku poniżej
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
