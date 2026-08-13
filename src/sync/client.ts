import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase config can come from build-time env or be pasted into Settings at
// runtime (stored in localStorage so it's readable before Dexie opens).

const URL_KEY = "overload:sb_url";
const ANON_KEY = "overload:sb_key";

export interface SbConfig {
  url: string;
  key: string;
}

export function getConfig(): SbConfig | null {
  const url =
    localStorage.getItem(URL_KEY) || import.meta.env.VITE_SUPABASE_URL || "";
  const key =
    localStorage.getItem(ANON_KEY) ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    "";
  if (!url || !key) return null;
  return { url, key };
}

export function saveConfig(url: string, key: string): void {
  localStorage.setItem(URL_KEY, url.trim().replace(/\/$/, ""));
  localStorage.setItem(ANON_KEY, key.trim());
  client = null;
}

export function clearConfig(): void {
  localStorage.removeItem(URL_KEY);
  localStorage.removeItem(ANON_KEY);
  client = null;
}

let client: SupabaseClient | null = null;
let clientFor: string | null = null;

export function getClient(): SupabaseClient | null {
  const cfg = getConfig();
  if (!cfg) return null;
  const sig = cfg.url + "|" + cfg.key;
  if (!client || clientFor !== sig) {
    client = createClient(cfg.url, cfg.key, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    clientFor = sig;
  }
  return client;
}

export async function currentUserEmail(): Promise<string | null> {
  const c = getClient();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session?.user.email ?? null;
}
