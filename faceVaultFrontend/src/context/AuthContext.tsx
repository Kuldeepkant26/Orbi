import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser } from '../api/authApi';

// The one-shot welcome banner shown right after authenticating.
//   'back' → "Welcome back, X"   (login)
//   'new'  → "Welcome to Orbi, X" (signup)
type Welcome = { mode: 'back' | 'new'; name: string } | null;

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: AuthUser, token: string) => Promise<void>;
  logout: () => Promise<void>;
  // Update the stored user in place (e.g. after editing the profile) so the
  // whole app sees the new name / avatar / bio without logging in again.
  updateUser: (updates: Partial<AuthUser>) => Promise<void>;
  // The welcome banner shown once after login/signup.
  welcome: Welcome;
  setWelcome: (w: Welcome) => void;
  clearWelcome: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [welcome, setWelcome] = useState<Welcome>(null);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem('auth_token');
        const storedUser = await AsyncStorage.getItem('auth_user');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (userData: AuthUser, authToken: string) => {
    await AsyncStorage.setItem('auth_token', authToken);
    await AsyncStorage.setItem('auth_user', JSON.stringify(userData));
    setUser(userData);
    setToken(authToken);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
    setUser(null);
    setToken(null);
  };

  const updateUser = async (updates: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return prev;
      const merged = { ...prev, ...updates };
      // Persist so the change survives an app restart.
      AsyncStorage.setItem('auth_user', JSON.stringify(merged));
      return merged;
    });
  };

  const clearWelcome = () => setWelcome(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
        welcome,
        setWelcome,
        clearWelcome,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
