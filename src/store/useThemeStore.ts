import { create } from 'zustand';

interface ThemeTokens {
  colors: {
    primary: string;
    secondary: string;
    background: string;
  };
  typography: {
    heading: string;
    body: string;
  };
}

interface ThemeState {
  tokens: ThemeTokens;
  setTokens: (tokens: ThemeTokens) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  tokens: {
    colors: {
      primary: '#4f46e5', // indigo-600
      secondary: '#06b6d4', // cyan-500
      background: '#020617', // slate-950
    },
    typography: {
      heading: 'Inter',
      body: 'Inter',
    },
  },
  setTokens: (tokens) => set({ tokens }),
}));
