import { createContext, useState, useEffect } from 'react';
import api from '../services/api';
import { isTokenExpired } from '../utils/jwt';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('sms_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [logoutReason, setLogoutReason] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('sms_token');
    const storedUser = localStorage.getItem('sms_user');
    // A token left over from a previous session that's already expired
    // shouldn't render the dashboard shell before the first API call fails
    // — clear it up front so an old browser tab reopened days later goes
    // straight to the login page.
    if (storedToken && isTokenExpired(storedToken)) {
      localStorage.removeItem('sms_token');
      localStorage.removeItem('sms_user');
      setToken(null);
      setUser(null);
      setLogoutReason('expired');
    } else if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('sms_token', data.token);
    localStorage.setItem('sms_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    setLogoutReason(null);
    return data;
  }

  function logout(reason) {
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_user');
    setToken(null);
    setUser(null);
    if (reason) setLogoutReason(reason);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, logoutReason }}>
      {children}
    </AuthContext.Provider>
  );
}
