import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StoreState {
  token: string | null;
  userData: any | null;
  theme: 'light' | 'dark';
  language: 'ru' | 'en' | 'es';
  sound: 's1' | 's2' | 's3' | 'off'; // <-- Добавили звук
  
  setToken: (t: string | null) => void;
  setUserData: (d: any) => void;
  setTheme: (t: 'light' | 'dark') => void;
  setLanguage: (l: 'ru' | 'en' | 'es') => void;
  setSound: (s: 's1' | 's2' | 's3' | 'off') => void; // <-- Функция
  logout: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      token: null,
      userData: null,
      theme: 'dark',
      language: 'ru',
      sound: 's1', // По умолчанию включен звук №1
      
      setToken: (token) => set({ token }),
      setUserData: (userData) => set({ userData }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setSound: (sound) => set({ sound }),
      logout: () => set({ token: null, userData: null }),
    }),
    { name: 'bank-storage' }
  )
);