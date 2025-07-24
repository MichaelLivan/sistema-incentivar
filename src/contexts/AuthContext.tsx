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
        console.log('🔍 [AUTH] Verificando autenticação:', token ? 'Token presente' : 'Sem token');
        
        if (token) {
          console.log('🔄 [AUTH] Validando token com servidor...');
          
          // ✅ Primeiro testar conectividade
          const connectionTest = await apiService.testConnection();
          if (!connectionTest.success) {
            console.warn('⚠️ [AUTH] Servidor não acessível, mantendo estado local');
            setError('Servidor não está acessível. Verifique se o backend está rodando.');
            setUser(null);
            localStorage.removeItem('authToken');
            return;
          }
          
          const result = await apiService.verifyToken();
          console.log('📊 [AUTH] Resultado verificação:', result);
          
          if (result.valid && result.user) {
            setUser(result.user);
            setError(null);
            console.log('✅ [AUTH] Usuário autenticado:', result.user.email, result.user.type);
          } else {
            console.log('⚠️ [AUTH] Token inválido, removendo...');
            localStorage.removeItem('authToken');
            setUser(null);
            setError(null);
          }
        } else {
          console.log('ℹ️ [AUTH] Nenhum token encontrado');
          setUser(null);
          setError(null);
        }
      } catch (error) {
        console.error('❌ [AUTH] Erro ao verificar token:', error);
        
        // ✅ CORREÇÃO: Tratamento melhor de erros de rede
        if (error instanceof Error) {
          if (error.message.includes('Failed to fetch') || 
              error.message.includes('ERR_CONNECTION_REFUSED') ||
              error.message.includes('ECONNREFUSED')) {
            setError('Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3001.');
          } else if (error.message.includes('401') || error.message.includes('403')) {
            console.log('🧹 [AUTH] Token expirado, limpando...');
            localStorage.removeItem('authToken');
            setUser(null);
            setError(null);
          } else if (error.message.includes('timeout')) {
            setError('Timeout na conexão. Verifique sua internet.');
          } else {
            setError(`Erro ao verificar autenticação: ${error.message}`);
          }
        } else {
          setError('Erro desconhecido ao verificar autenticação');
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
    
    console.log('🔄 [AUTH] Iniciando processo de login:', { email, password: '***' });
    
    try {
      // ✅ Validações básicas
      if (!email?.trim() || !password?.trim()) {
        setError('Email e senha são obrigatórios');
        return false;
      }

      // ✅ Validação de formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError('Formato de email inválido');
        return false;
      }

      console.log('📤 [AUTH] Enviando requisição de login...');
      const response = await apiService.login(email.trim(), password);
      console.log('📊 [AUTH] Resposta recebida:', response);
      
      // ✅ CORREÇÃO: Verificação mais robusta da resposta
      if (!response) {
        setError('Resposta vazia do servidor');
        return false;
      }

      if (!response.user) {
        setError('Dados do usuário não recebidos do servidor');
        return false;
      }

      if (!response.token) {
        setError('Token de autenticação não recebido');
        return false;
      }

      // ✅ Validação adicional dos dados do usuário
      if (!response.user.email || !response.user.name || !response.user.type) {
        setError('Dados do usuário incompletos');
        return false;
      }

      console.log('✅ [AUTH] Login validado, salvando dados...');
      
      // ✅ Salvar dados do usuário e token
      setUser(response.user);
      localStorage.setItem('authToken', response.token);
      setError(null);
      
      console.log('✅ [AUTH] Login concluído com sucesso para:', response.user.email);
      return true;
      
    } catch (error) {
      console.error('❌ [AUTH] Erro no login:', error);
      
      // ✅ CORREÇÃO: Mensagens de erro mais específicas e úteis
      let errorMessage = 'Erro ao fazer login';
      
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('credencial inválida') || 
            message.includes('invalid credentials') ||
            message.includes('email ou senha incorretos')) {
          errorMessage = 'Email ou senha incorretos';
        } else if (message.includes('401') || message.includes('unauthorized')) {
          errorMessage = 'Email ou senha incorretos';
        } else if (message.includes('403') || message.includes('forbidden')) {
          errorMessage = 'Acesso negado. Verifique suas credenciais';
        } else if (message.includes('500') || message.includes('internal server error')) {
          errorMessage = 'Erro no servidor. Tente novamente em alguns minutos';
        } else if (message.includes('failed to fetch') || 
                   message.includes('connection refused') || 
                   message.includes('econnrefused') ||
                   message.includes('network error')) {
          errorMessage = 'Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3001';
        } else if (message.includes('timeout') || message.includes('aborted')) {
          errorMessage = 'Timeout na conexão. Verifique sua internet e tente novamente';
        } else if (message.includes('cors')) {
          errorMessage = 'Erro de CORS. Verifique a configuração do servidor';
        } else {
          // ✅ Usar a mensagem original se for específica
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
      console.log('🔄 [AUTH] Iniciando logout...');
      
      // ✅ Tentar fazer logout no servidor (se acessível)
      try {
        await apiService.logout();
        console.log('✅ [AUTH] Logout no servidor bem-sucedido');
      } catch (logoutError) {
        console.warn('⚠️ [AUTH] Erro no logout do servidor (ignorando):', logoutError);
        // Continuar mesmo se o logout do servidor falhar
      }
      
    } catch (error) {
      console.error('⚠️ [AUTH] Erro no logout (ignorando):', error);
      // Ignorar erros de logout e continuar
    } finally {
      // ✅ Sempre limpar os dados locais, independente de erro
      console.log('🧹 [AUTH] Limpando dados locais...');
      localStorage.removeItem('authToken');
      setUser(null);
      setIsLoading(false);
      setError(null);
      console.log('✅ [AUTH] Logout concluído');
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