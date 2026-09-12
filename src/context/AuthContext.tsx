import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Store } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  store: Store | null;
  token: string | null;
  loading: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  isSuperAdmin: boolean;
  login: (email: string, pass: string, storeId?: string) => Promise<void>;
  register: (data: {
    storeName: string;
    cnpj?: string;
    adminName: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<void>;
  switchStoreContext: (storeId: string) => Promise<void>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
  updateStoreProfile: (data: Partial<Store>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [store, setStore] = useState<Store | null>(() => {
    const saved = localStorage.getItem('auth_store');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUserData = async () => {
    if (!localStorage.getItem('auth_token')) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.getMe();
      setUser(data.user);
      setStore(data.store);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      localStorage.setItem('auth_store', JSON.stringify(data.store));
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUserData();

    const handleLogout = () => {
      setUser(null);
      setStore(null);
      setToken(null);
    };

    window.addEventListener('auth_logout', handleLogout);
    return () => window.removeEventListener('auth_logout', handleLogout);
  }, []);

  const login = async (email: string, pass: string, storeId?: string) => {
    const res = await api.login(email, pass, storeId);
    setToken(res.token);
    setUser(res.user);
    setStore(res.store);
    localStorage.setItem('auth_token', res.token);
    localStorage.setItem('auth_user', JSON.stringify(res.user));
    localStorage.setItem('auth_store', JSON.stringify(res.store));
  };

  const register = async (data: {
    storeName: string;
    cnpj?: string;
    adminName: string;
    email: string;
    password: string;
    phone?: string;
  }) => {
    const res = await api.register(data);
    setToken(res.token);
    setUser(res.user);
    setStore(res.store);
    localStorage.setItem('auth_token', res.token);
    localStorage.setItem('auth_user', JSON.stringify(res.user));
    localStorage.setItem('auth_store', JSON.stringify(res.store));
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_store');
    setUser(null);
    setStore(null);
    setToken(null);
  };

  const updateStoreProfile = async (data: Partial<Store>) => {
    const updated = await api.updateStore(data);
    setStore(updated);
    localStorage.setItem('auth_store', JSON.stringify(updated));
  };

  const switchStoreContext = async (storeId: string) => {
    const res = await api.switchSuperAdminStore(storeId);
    setToken(res.token);
    setStore(res.store);
    localStorage.setItem('auth_token', res.token);
    localStorage.setItem('auth_store', JSON.stringify(res.store));
    if (user) {
      const updatedUser = { ...user, storeId: res.store.id };
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    }
  };

  const isSuperAdmin = Boolean(
    user?.role === 'SUPER_ADMIN' ||
    user?.email.toLowerCase() === 'entrecoposadm@gmail.com'
  );
  const isAdmin = isSuperAdmin || user?.role === 'ADMINISTRADOR';
  const isEmployee = user?.role === 'FUNCIONARIO';

  return (
    <AuthContext.Provider
      value={{
        user,
        store,
        token,
        loading,
        isAdmin,
        isEmployee,
        isSuperAdmin,
        login,
        register,
        switchStoreContext,
        logout,
        refreshUserData,
        updateStoreProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
