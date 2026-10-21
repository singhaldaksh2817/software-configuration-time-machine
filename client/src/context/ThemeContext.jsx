import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = [
  { id: 'archive-dark', name: 'Archive Dark', description: 'Graphite, copper & archival ink' },
  { id: 'obsidian-teal', name: 'Obsidian Teal', description: 'Deep slate with radiant teal accents' },
  { id: 'warm-light', name: 'Warm Light', description: 'Archival paper & burnished amber' }
];

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('scm_theme') || 'archive-dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-archive-dark', 'theme-obsidian-teal', 'theme-warm-light');
    root.classList.add(`theme-${theme}`);
    localStorage.setItem('scm_theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
