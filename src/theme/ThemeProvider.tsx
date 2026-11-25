import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
} from '@expo-google-fonts/outfit';
import { useFonts } from 'expo-font';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { asyncStorageStore } from '@/data/storage';
import { dark, light, type Palette } from '@/theme/tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeValue {
  colors: Palette;
  mode: 'light' | 'dark';
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  fontsReady: boolean;
  displayFont: string | undefined;
  displayBold: string | undefined;
  bodyFont: string | undefined;
  bodyMedium: string | undefined;
  bodySemi: string | undefined;
}

const ThemeContext = createContext<ThemeValue | null>(null);
const THEME_KEY = 'certkeep.theme.v1';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
  });

  useEffect(() => {
    void asyncStorageStore.getItem(THEME_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') setPreferenceState(stored);
    });
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void asyncStorageStore.setItem(THEME_KEY, next);
  }, []);

  const mode = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const fontsReady = fontsLoaded || Boolean(fontError);

  const value = useMemo<ThemeValue>(
    () => ({
      colors: mode === 'dark' ? dark : light,
      mode,
      preference,
      setPreference,
      fontsReady,
      displayFont: fontsLoaded ? 'Fraunces_600SemiBold' : undefined,
      displayBold: fontsLoaded ? 'Fraunces_700Bold' : undefined,
      bodyFont: fontsLoaded ? 'Outfit_400Regular' : undefined,
      bodyMedium: fontsLoaded ? 'Outfit_500Medium' : undefined,
      bodySemi: fontsLoaded ? 'Outfit_600SemiBold' : undefined,
    }),
    [fontsLoaded, fontsReady, mode, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used within ThemeProvider');
  return value;
}
