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
  const [isLoading, setIsLoading] = useState(true); // ✅ CORRIGIDO: Usar isLoading consistentemente
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('authToken');
        console.log('🔍 [AUTH] Verificando token:', token ? 'Presente' : 'Ausente');
        
        if (token) {
          console.log('🔄 [AUTH] Validando token com servidor...');
          const result = await apiService.verifyToken();
          console.log('📊 [AUTH] Resultado verificação:', result);
          
          if (result.valid && result.user) {
            setUser(result.user);
            console.log('✅ [AUTH] Usuário autenticado:', result.user.email, result.user.type);
          } else {
            console.log('⚠️ [AUTH] Token inválido, removendo...');
            localStorage.removeItem('authToken');
            setUser(null);
          }
        } else {
          console.log('⚠️ [AUTH] Nenhum token encontrado');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ [AUTH] Erro ao verificar token:', error);
        
        // ✅ CORREÇÃO: Tratamento melhor de erros de rede
        if (error instanceof Error) {
          if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
            setError('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
          } else if (error.message.includes('401') || error.message.includes('403')) {
            console.log('🧹 [AUTH] Token expirado, limpando...');
            localStorage.removeItem('authToken');
            setUser(null);
          } else {
            setError('Erro ao verificar autenticação');
          }
        }
        
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
    
    console.log('🔄 [AUTH] Tentando login:', { email, password: '***' });
    
    try {
      const response = await apiService.login(email, password);
      console.log('📊 [AUTH] Resposta do login:', response);
      
      // ✅ CORREÇÃO: Verificação mais robusta da resposta
      if (response && response.user && response.token) {
        console.log('✅ [AUTH] Login bem-sucedido');
        setUser(response.user);
        localStorage.setItem('authToken', response.token);
        setError(null); // ✅ Limpar erro em caso de sucesso
        return true;
      } else {
        console.log('❌ [AUTH] Resposta de login inválida:', response);
        setError('Formato de resposta inválido do servidor');
        return false;
      }
      
    } catch (error) {
      console.error('❌ [AUTH] Erro no login:', error);
      
      // ✅ CORREÇÃO: Mensagens de erro mais específicas e úteis
      let errorMessage = 'Erro ao fazer login';
      
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('credencial inválida') || message.includes('invalid credentials')) {
          errorMessage = 'Email ou senha incorretos';
        } else if (message.includes('401') || message.includes('unauthorized')) {
          errorMessage = 'Email ou senha incorretos';
        } else if (message.includes('403') || message.includes('forbidden')) {
          errorMessage = 'Acesso negado. Verifique suas credenciais';
        } else if (message.includes('500') || message.includes('internal server error')) {
          errorMessage = 'Erro no servidor. Tente novamente em alguns minutos';
        } else if (message.includes('failed to fetch') || message.includes('connection refused') || message.includes('network error')) {
          errorMessage = 'Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3001';
        } else if (message.includes('timeout')) {
          errorMessage = 'Timeout na conexão. Verifique sua internet';
        } else {
          errorMessage = error.message || 'Erro desconhecido';
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
      console.log('🔄 [AUTH] Fazendo logout...');
      await apiService.logout();
      console.log('✅ [AUTH] Logout bem-sucedido');
    } catch (error) {
      console.error('⚠️ [AUTH] Erro no logout (ignorando):', error);
      // Ignorar erros de logout e continuar
    } finally {
      // Sempre limpar os dados locais
      localStorage.removeItem('authToken');
      setUser(null);
      setIsLoading(false);
      setError(null); // ✅ Limpar erro no logout
      console.log('🧹 [AUTH] Dados locais limpos');
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading, // ✅ CORRIGIDO: Usar isLoading consistentemente
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};