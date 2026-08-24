import { useState, useEffect, useCallback } from 'react';

export function useTheme() {
  const [theme, setThemeState] = useState(() => localStorage.getItem('questra-theme') || 'system');
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  useEffect(() => {
    const isDark = theme === 'dark' || (theme === 'system' && systemDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, [theme, systemDark]);

  const setTheme = useCallback((t) => {
    setThemeState(t);
    localStorage.setItem('questra-theme', t);
  }, []);

  const resolvedTheme = theme === 'dark' || (theme === 'system' && systemDark) ? 'dark' : 'light';

  return { theme, resolvedTheme, setTheme };
}

