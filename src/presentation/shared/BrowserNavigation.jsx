import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createNavigationHistory } from '../../infrastructure/navigation/navigation-history.js';

export const BrowserNavigationContext = createContext(null);

export function useBrowserNavigation() {
  const [screen, setScreen] = useState({ tab: 'home', view: null });
  const navigation = useRef(null);
  if (!navigation.current) navigation.current = createNavigationHistory(window, setScreen);
  useLayoutEffect(() => navigation.current.start(), []);
  const setTab = useCallback(tab => navigation.current.navigate(current => ({
    tab: typeof tab === 'function' ? tab(current.tab) : tab, view: null,
  })), []);
  const setView = useCallback((view, options) => navigation.current.navigate(current => ({
    ...current, view: typeof view === 'function' ? view(current.view) : view,
  }), options), []);
  return { ...screen, setTab, setView, navigation: navigation.current };
}

export function useBackLayer(open, onBack) {
  const navigation = useContext(BrowserNavigationContext);
  const callback = useRef(onBack);
  callback.current = onBack;
  useEffect(() => {
    if (open && navigation) return navigation.layer(() => callback.current());
  }, [open, navigation]);
}

export function useBackGuard(enabled, onBack) {
  const navigation = useContext(BrowserNavigationContext);
  const callback = useRef(onBack);
  callback.current = onBack;
  useEffect(() => {
    if (enabled && navigation) return navigation.guard(() => callback.current());
  }, [enabled, navigation]);
}
