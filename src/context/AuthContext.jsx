import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@/api/entities';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [actingRole, setActingRole] = useState('user');
  const [loading, setLoading] = useState(true);

  // Load on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await User.me();
        if (cancelled) return;
        setUser(u);
        const stored = localStorage.getItem('sh-acting-role');
        if (u && u.role === 'admin' && stored && ['admin','user'].includes(stored)) {
          setActingRole(stored);
        } else if (u && u.role === 'admin') {
          setActingRole('admin');
        } else {
          setActingRole('user');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const handler = () => {
      User.me().then(nu => setUser(nu)).catch(()=>setUser(null));
    };
    window.addEventListener('sh-auth-changed', handler);
    return () => { cancelled = true; window.removeEventListener('sh-auth-changed', handler); };
  }, []);

  const toggleActingRole = useCallback(() => {
    if (!user || user.role !== 'admin') return;
    setActingRole(prev => {
      const next = prev === 'admin' ? 'user' : 'admin';
      localStorage.setItem('sh-acting-role', next);
      return next;
    });
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, setUser, actingRole, toggleActingRole, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext) || { user: null, actingRole: 'user', loading: true };
}
