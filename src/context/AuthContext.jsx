import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchJson } from '../lib/api';

const AUTH_TOKEN_KEY = 'dailyspoon.auth.token';
const AUTH_USER_KEY = 'dailyspoon.auth.user';
const AuthContext = createContext(null);

function readStoredToken() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY) ?? '';
}

function readStoredUser() {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(AUTH_USER_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

function writeStoredSession(session) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, session.token);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
}

function clearStoredSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => readStoredToken());
  const [user, setUser] = useState(() => readStoredUser());
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function syncUser() {
      if (!token) {
        setUser(null);
        setAuthReady(true);
        return;
      }

      try {
        const payload = await fetchJson('/api/auth/me');
        if (!ignore) {
          setUser(payload.user);
          writeStoredSession({ token, user: payload.user });
        }
      } catch {
        if (!ignore) {
          clearStoredSession();
          setToken('');
          setUser(null);
        }
      } finally {
        if (!ignore) {
          setAuthReady(true);
        }
      }
    }

    syncUser();

    return () => {
      ignore = true;
    };
  }, [token]);

  async function completeAuth(url, body) {
    const session = await fetchJson(url, {
      method: 'POST',
      body: JSON.stringify(body),
      skipAuth: true,
    });

    writeStoredSession(session);
    setToken(session.token);
    setUser(session.user);
    setAuthReady(true);
    return session;
  }

  async function signin(credentials) {
    return completeAuth('/api/auth/signin', credentials);
  }

  async function signup(profile) {
    return completeAuth('/api/auth/signup', profile);
  }

  async function signout() {
    try {
      if (token) {
        await fetchJson('/api/auth/signout', { method: 'POST' });
      }
    } catch {
      // Ignore signout failures and clear the local session anyway.
    } finally {
      clearStoredSession();
      setToken('');
      setUser(null);
      setAuthReady(true);
    }
  }

  const value = useMemo(
    () => ({
      authReady,
      isAuthenticated: Boolean(user && token),
      signin,
      signout,
      signup,
      token,
      user,
    }),
    [authReady, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
