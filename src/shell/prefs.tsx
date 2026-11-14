import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ColorTheme = 'purple' | 'blue' | 'green' | 'orange';
export type FontKey = 'vazir' | 'noto' | 'plex';
export interface Prefs {
  color: ColorTheme; dark: boolean; font: FontKey; size: 14 | 16 | 18; density: 'comfortable' | 'compact';
  focus: boolean; collapsed: boolean; pins: string[]; closedGroups: string[];
}
const KEY = 'bt.prefs';
const DEFAULTS: Prefs = { color: 'purple', dark: false, font: 'vazir', size: 16, density: 'comfortable', focus: false, collapsed: false, pins: [], closedGroups: [] };

function load(): Prefs {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}'), focus: false }; } catch { return DEFAULTS; }
}

interface Ctx extends Prefs { set: (p: Partial<Prefs>) => void; togglePin: (to: string) => void; toggleGroup: (id: string) => void }
const PrefsCtx = createContext<Ctx | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(load);
  useEffect(() => {
    const h = document.documentElement;
    h.dataset.color = prefs.color; h.dataset.font = prefs.font; h.dataset.density = prefs.density;
    h.classList.toggle('dark', prefs.dark);
    h.style.fontSize = `${prefs.size}px`;
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* storage may be blocked */ }
  }, [prefs]);
  const set = useCallback((p: Partial<Prefs>) => setPrefs((x) => ({ ...x, ...p })), []);
  const togglePin = useCallback((to: string) => setPrefs((x) => ({ ...x, pins: x.pins.includes(to) ? x.pins.filter((p) => p !== to) : [...x.pins, to] })), []);
  const toggleGroup = useCallback((id: string) => setPrefs((x) => ({ ...x, closedGroups: x.closedGroups.includes(id) ? x.closedGroups.filter((g) => g !== id) : [...x.closedGroups, id] })), []);
  const value = useMemo(() => ({ ...prefs, set, togglePin, toggleGroup }), [prefs, set, togglePin, toggleGroup]);
  return <PrefsCtx.Provider value={value}>{children}</PrefsCtx.Provider>;
}

export function usePrefs() {
  const c = useContext(PrefsCtx);
  if (!c) throw new Error('usePrefs outside PrefsProvider');
  return c;
}
