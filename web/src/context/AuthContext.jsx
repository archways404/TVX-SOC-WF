import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/api/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const loginWithGoogleCredential = useCallback(async (credential) => {
    const loggedInUser = await api.post('/api/auth/google', { credential });
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout', {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogleCredential, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
