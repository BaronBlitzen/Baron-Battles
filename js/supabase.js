// Shared Supabase connection.
// The publishable key is designed to be public (it ships to every browser),
// so it is safe to keep it in this file and in the GitHub repo.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const SUPABASE_URL = 'https://hphjovvhkckzsgmmfcpc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_82gagRLfhEipDwMXCxtC_g_s8KlPeqh';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Every room is one Realtime channel. The TV joins as "host";
// each phone joins with its own player id as its presence key.
export function roomChannel(code, presenceKey) {
  return supabase.channel(`pmg-room-${code}`, {
    config: {
      broadcast: { self: false },
      presence: { key: presenceKey },
    },
  });
}

// Small storage helpers that never throw (private browsing, etc).
export const session = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } },
};
export const local = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
