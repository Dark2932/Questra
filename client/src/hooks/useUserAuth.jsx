import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const UserAuthContext = createContext(null);

export function UserAuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null });
  const refresh = useCallback(async () => {
    const auth = await api.userMe().catch(() => null);
    setState({ loading: false, user: auth?.user || null });
    return auth?.user || null;
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const logout = useCallback(async () => {
    await api.userLogout().catch(() => {});
    setState({ loading: false, user: null });
  }, []);

  const value = useMemo(() => ({ ...state, authenticated: Boolean(state.user), refresh, logout }), [state, refresh, logout]);
  return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
}

export function useUserAuth() {
  const value = useContext(UserAuthContext);
  if (!value) throw new Error('useUserAuth must be used inside UserAuthProvider');
  return value;
}
