import { useCallback, useMemo, useState } from 'react';
import { AuthContext } from './authContextValue';
import {
  clearSession,
  getStoredToken,
  getStoredUser,
  loginWithRole,
  saveSession,
} from '../services/authService';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());

  const login = useCallback(async (credentials) => {
    const result = await loginWithRole(credentials);
    setToken(result?.session?.accessToken || getStoredToken());
    setUser(result?.user || getStoredUser());
    return result;
  }, []);

  const setSession = useCallback((sessionData) => {
    saveSession(sessionData);
    setToken(getStoredToken());
    setUser(getStoredUser());
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      role: user?.role ? String(user.role).toLowerCase() : null,
      isAuthenticated: Boolean(token && user),
      login,
      setSession,
      logout,
    }),
    [user, token, login, setSession, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
