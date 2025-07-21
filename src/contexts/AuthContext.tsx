import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  type: string;
  sector?: string;
  children?: string[];
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('authToken');
        console.log('🔍 Verificando token:', token ? 'Presente' : 'Ausente');
        
        if (token) {
          const { valid, user } = await apiService.verifyToken();
          console.log('📊 Resultado verificação:', { valid, user });
          
          if (valid && user) {
            setUser(user);
            console.log('✅ Usuário autenticado:', user.email);
          } else {
            console.log('⚠️ Token inválido, removendo...');
            localStorage.removeItem('authToken');
            setUser(null);
          }
        } else {
          console.log('⚠️ Nenhum token encontrado');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Erro ao verificar token:', error);
        setError('Falha ao verificar autenticação');
        localStorage.removeItem('authToken');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    console.log('🔄 Tentando login:', { email, password: '***' });
    
    try {
      const response = await apiService.login(email, password);
      console.log('📊 Resposta do login:', response);
      
      // CORREÇÃO: Verificar se a resposta tem o formato correto
      if (response && response.user && response.token) {
        console.log('✅ Login bem-sucedido');
        setUser(response.user);
        localStorage.setItem('authToken', response.token);
        return true;
      } else if (response && response.user) {
        // CORREÇÃO: Caso o token venha em outro campo
        const token = response.token || response.accessToken || response.authToken;
        if (token) {
          console.log('✅ Login bem-sucedido (token alternativo)');
          setUser(response.user);
          localStorage.setItem('authToken', token);
          return true;
        }
      }
      
      console.log('❌ Resposta de login inválida:', response);
      setError('Formato de resposta inválido do servidor');
      return false;
      
    } catch (error) {
      console.error('❌ Erro no login:', error);
      
      // CORREÇÃO: Mensagens de erro mais específicas
      let errorMessage = 'Erro ao fazer login';
      
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Email ou senha inválidos';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
          errorMessage = 'Acesso negado. Verifique suas credenciais';
        } else if (error.message.includes('500')) {
          errorMessage = 'Erro no servidor. Tente novamente em alguns minutos';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
          errorMessage = 'Não foi possível conectar ao servidor. Verifique se o servidor está rodando';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fazendo logout...');
      await apiService.logout();
      console.log('✅ Logout bem-sucedido');
    } catch (error) {
      console.error('⚠️ Erro no logout (ignorando):', error);
      // Ignorar erros de logout e continuar
    } finally {
      // Sempre limpar os dados locais
      localStorage.removeItem('authToken');
      setUser(null);
      setIsLoading(false);
      console.log('🧹 Dados locais limpos');
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};