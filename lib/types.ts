export interface Entry {
  id: string;
  date: string; // ISO 8601
  content: string; // HTML from Tiptap
  /** Stare wpisy: base64 inline (legacy, jedno zdjęcie). */
  photoUrl?: string;
  /** Nowe wpisy: ścieżki w buckecie Supabase „entry-photos". */
  photoPaths?: string[];
}
