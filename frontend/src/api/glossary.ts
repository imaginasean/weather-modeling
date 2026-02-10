import { API_BASE } from "../config";

export type GlossaryEntry = {
  term: string;
  definition: string;
  category: string;
};

export type GlossaryResponse = {
  entries: GlossaryEntry[];
  by_category: Record<string, GlossaryEntry[]>;
};

export async function fetchGlossary(): Promise<GlossaryResponse> {
  const r = await fetch(`${API_BASE}/glossary`);
  if (!r.ok) throw new Error("Failed to fetch glossary");
  return r.json();
}

export async function fetchTerm(term: string): Promise<GlossaryEntry | null> {
  const r = await fetch(`${API_BASE}/glossary/${encodeURIComponent(term)}`);
  if (!r.ok) return null;
  return r.json();
}
