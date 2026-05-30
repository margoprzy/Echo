import type { Entry } from "./types";

const KEY = "echo_entries";

export function getEntries(): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Entry[];
  } catch {
    return [];
  }
}

export function saveEntry(entry: Entry): void {
  const entries = getEntries();
  const idx = entries.findIndex((e) => e.id === entry.id);
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.unshift(entry);
  }
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function deleteEntry(id: string): void {
  const entries = getEntries().filter((e) => e.id !== id);
  localStorage.setItem(KEY, JSON.stringify(entries));
}

const NAME_KEY = "echo_user_name";

export function getUserName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(NAME_KEY);
}

export function setUserName(name: string): void {
  localStorage.setItem(NAME_KEY, name);
}
