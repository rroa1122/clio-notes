import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://toisvwdmscmnogzcpeyj.supabase.co';
const supabaseAnonKey = 'sb_publishable_E7E4184wtBhtTXD0hobNnQ_OALEmO9G';

// Custom storage adapter that falls back to persistent cookies if localStorage is cleared or disabled
const customStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    
    // 1. Try localStorage
    try {
      const localValue = localStorage.getItem(key);
      if (localValue) return localValue;
    } catch (e) {}

    // 2. Try Cookies fallback
    try {
      const name = key + "=";
      const decodedCookie = decodeURIComponent(document.cookie);
      const ca = decodedCookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
          c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
          return c.substring(name.length, c.length);
        }
      }
    } catch (e) {}

    return null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    
    // 1. Set localStorage
    try {
      localStorage.setItem(key, value);
    } catch (e) {}

    // 2. Set Cookie (expires in 365 days)
    try {
      const d = new Date();
      d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
      const expires = "expires=" + d.toUTCString();
      document.cookie = key + "=" + encodeURIComponent(value) + ";" + expires + ";path=/;SameSite=Lax;Secure";
    } catch (e) {}
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    
    // 1. Remove from localStorage
    try {
      localStorage.removeItem(key);
    } catch (e) {}

    // 2. Remove from Cookies
    try {
      document.cookie = key + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;SameSite=Lax;Secure";
    } catch (e) {}
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: customStorage,
    storageKey: 'clio-auth-token'
  }
});
