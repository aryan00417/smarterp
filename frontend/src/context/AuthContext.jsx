import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('erp_user');
    const savedCompany = localStorage.getItem('erp_company');
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedCompany) setCompany(JSON.parse(savedCompany));
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('erp_token', res.data.token);
    localStorage.setItem('erp_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('erp_token', res.data.token);
    localStorage.setItem('erp_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const selectCompany = (comp) => {
    setCompany(comp);
    localStorage.setItem('erp_company', JSON.stringify(comp));
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setCompany(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, company, loading, login, register, logout, selectCompany }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);