import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { api } from '../lib/api'; // Assumindo que temos um arquivo de configuração da API

interface User {
  id: number;
  nome: string;
  username: string;
  perfil: 'admin' | 'usuario';
}

interface AuthContextData {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, senha: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = sessionStorage.getItem('@ArtLicor:token');
    const storedUser = sessionStorage.getItem('@ArtLicor:user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      api.defaults.headers.Authorization = `Bearer ${storedToken}`;
    }
    setLoading(false);
  }, []);

  const login = async (username: string, senha: string) => {
    try {
      const response = await api.post('/auth/login', { username, senha });
      const { token, user: loggedUser } = response.data;

      sessionStorage.setItem('@ArtLicor:token', token);
      sessionStorage.setItem('@ArtLicor:user', JSON.stringify(loggedUser));

      api.defaults.headers.Authorization = `Bearer ${token}`;

      setToken(token);
      setUser(loggedUser);

    } catch (error) {
      console.error('Falha no login', error);
      // Lançar o erro para que o componente de UI possa tratá-lo
      throw new Error('Usuário ou senha inválidos.');
    }
  };

  const logout = () => {
    sessionStorage.removeItem('@ArtLicor:token');
    sessionStorage.removeItem('@ArtLicor:user');
    setUser(null);
    setToken(null);
    delete api.defaults.headers.Authorization;
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, token, loading, login, logout }}>
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
