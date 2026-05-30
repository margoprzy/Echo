export interface Entry {
  id: string;
  date: string; // ISO 8601
  content: string; // HTML from Tiptap
  photoUrl?: string; // base64
}
