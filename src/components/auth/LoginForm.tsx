import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Eye, EyeOff, RefreshCw, AlertCircle, Wifi, WifiOff } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  
  const { login, isLoading, error } = useAuth(); // ✅ CORRIGIDO: Usar isLoading

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    console.log('🔄 [LOGIN FORM] Tentando login via formulário:', { 
      email: formData.email, 
      password: '***'
    });

    const success = await login(formData.email, formData.password);
    
    if (!success) {
      console.log('❌ [LOGIN FORM] Login falhou');
    } else {
      console.log('✅ [LOGIN FORM] Login bem-sucedido');
    }
  };

  // ✅ FUNÇÃO MELHORADA: Testar conectividade com o backend
  const testConnection = async () => {
    setConnectionTested(true);
    setConnectionStatus('unknown');
    
    try {
      console.log('🔍 [LOGIN FORM] Testando conectividade...');
      
      // Tentar duas URLs possíveis
      const urls = [
        'http://localhost:3001/api/auth/health',
        '/api/auth/health'
      ];
      
      let lastError = null;
      let connected = false;
      
      for (const url of urls) {
        try {
          console.log(`🌐 [LOGIN FORM] Testando URL: ${url}`);
          
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
          
          const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
          });
          
          clearTimeout(timeout);
          
          console.log(`📊 [LOGIN FORM] Status da resposta (${url}):`, response.status);
          
          if (response.ok || response.status === 404) {
            // 404 é OK porque significa que o servidor está rodando
            setConnectionStatus('success');
            connected = true;
            
            const message = response.status === 404 
              ? `✅ Servidor backend está rodando!\n\nURL: ${url}\nStatus: ${response.status} (endpoint não encontrado, mas servidor está ativo)`
              : `✅ Servidor backend conectado com sucesso!\n\nURL: ${url}\nStatus: ${response.status}`;
            
            alert(message);
            break;
          } else {
            lastError = `Status ${response.status}: ${response.statusText}`;
          }
        } catch (fetchError) {
          console.log(`❌ [LOGIN FORM] Erro na URL ${url}:`, fetchError);
          lastError = fetchError;
          continue;
        }
      }
      
      if (!connected) {
        setConnectionStatus('error');
        
        let errorMessage = '❌ Não foi possível conectar ao servidor backend.\n\n';
        
        if (lastError instanceof Error) {
          if (lastError.name === 'AbortError') {
            errorMessage += 'Motivo: Timeout na conexão (>5s)\n\n';
          } else if (lastError.message.includes('Failed to fetch') || lastError.message.includes('ERR_CONNECTION_REFUSED')) {
            errorMessage += 'Motivo: Conexão recusada\n\n';
          } else {
            errorMessage += `Motivo: ${lastError.message}\n\n`;
          }
        }
        
        errorMessage += 'Verificações necessárias:\n';
        errorMessage += '1. ✅ O servidor backend está rodando na porta 3001?\n';
        errorMessage += '2. ✅ Execute: npm run dev:backend\n';
        errorMessage += '3. ✅ Verifique o console do backend para erros\n';
        errorMessage += '4. ✅ Teste: http://localhost:3001/api/health';
        
        alert(errorMessage);
      }
      
    } catch (criticalError) {
      console.error('❌ [LOGIN FORM] Erro crítico no teste de conexão:', criticalError);
      setConnectionStatus('error');
      alert('❌ Erro crítico ao testar conexão. Verifique o console do navegador.');
    }
  };

  // ✅ FUNÇÃO NOVA: Informações de debug
  const showDebugInfo = () => {
    const debugInfo = {
      frontend: {
        url: window.location.href,
        mode: import.meta.env.PROD ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'
      },
      backend: {
        expectedUrl: 'http://localhost:3001/api',
        healthCheck: 'http://localhost:3001/api/health'
      },
      token: localStorage.getItem('authToken') ? 'Presente' : 'Ausente',
      lastError: error || 'Nenhum'
    };
    
    console.log('🔍 [LOGIN FORM] Debug Info:', debugInfo);
    
    const message = `📋 INFORMAÇÕES DE DEBUG:\n\n` +
      `Frontend: ${debugInfo.frontend.url}\n` +
      `Modo: ${debugInfo.frontend.mode}\n\n` +
      `Backend esperado: ${debugInfo.backend.expectedUrl}\n` +
      `Health check: ${debugInfo.backend.healthCheck}\n\n` +
      `Token: ${debugInfo.token}\n` +
      `Último erro: ${debugInfo.lastError}`;
    
    alert(message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4">
            <img 
              src="/logo.jpg" 
              alt="Logo Clínica Incentivar" 
              className="mx-auto w-24 h-24 rounded-lg border-2 border-teal-600 shadow-lg"
            />
          </div>
          <CardTitle className="text-2xl">Clínica Incentivar</CardTitle>
          <p className="text-gray-600 mt-2">Sistema de Gerenciamento de ATs</p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-purple-800 mb-2">
                Email
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="seu@email.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-purple-800 mb-2">
                Senha
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Sua senha"
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* ✅ SEÇÃO MELHORADA: Exibição de erros */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-800 text-sm">Erro no Login:</p>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                    
                    {/* Botões de ajuda baseados no tipo de erro */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {error.includes('conectar') || error.includes('servidor') ? (
                        <>
                          <Button 
                            type="button" 
                            size="sm" 
                            variant="secondary" 
                            onClick={testConnection}
                            disabled={isLoading}
                            className="text-xs"
                          >
                            <Wifi className="w-3 h-3 mr-1" />
                            Testar Conexão
                          </Button>
                          <Button 
                            type="button" 
                            size="sm" 
                            variant="secondary" 
                            onClick={showDebugInfo}
                            disabled={isLoading}
                            className="text-xs"
                          >
                            🔍 Debug
                          </Button>
                        </>
                      ) : error.includes('credencial') || error.includes('senha') ? (
                        <p className="text-xs text-red-600 mt-1">
                          💡 Verifique seu email e senha. Use as credenciais de exemplo abaixo para teste.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
                
                {/* Status da conexão */}
                {connectionTested && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <div className="flex items-center space-x-2">
                      {connectionStatus === 'success' ? (
                        <>
                          <Wifi className="w-4 h-4 text-green-600" />
                          <span className="text-green-700 text-xs font-medium">Servidor conectado</span>
                        </>
                      ) : connectionStatus === 'error' ? (
                        <>
                          <WifiOff className="w-4 h-4 text-red-600" />
                          <span className="text-red-700 text-xs font-medium">Servidor não responde</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 text-gray-600 animate-spin" />
                          <span className="text-gray-700 text-xs font-medium">Testando...</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          {/* ✅ SEÇÃO ATUALIZADA: Credenciais de exemplo */}
          <div className="mt-6 text-xs text-gray-500 space-y-2">
            <p className="text-center font-semibold">Para testes, use a senha: <strong>123456</strong></p>
            <div className="border-t pt-3">
              <p className="font-semibold mb-2">📧 Exemplos de emails:</p>
              <div className="space-y-1 text-xs">
                <p><strong>👑 Administrador Geral:</strong> adm.geral@incentivar.com</p>
                <p><strong>🏢 Admin Denver:</strong> debora.denver@incentivar.com</p>
                <p><strong>💰 Financeiro ATs:</strong> financeiro.ats@incentivar.com</p>
                <p><strong>💼 Financeiro PCT:</strong> financeiro.pct@incentivar.com</p>
                <p><strong>👨‍⚕️ AT Denver:</strong> jessicasantana@incentivar.com</p>
                <p><strong>👩‍⚕️ AT Denver:</strong> camilaalves@incentivar.com</p>
                <p><strong>👩‍👧‍👦 Mãe:</strong> elba@incentivar.com</p>
                <p><strong>👨‍👧‍👦 Pai:</strong> ronaldo@incentivar.com</p>
                
                <div className="bg-blue-50 p-2 rounded mt-3">
                  <p className="text-blue-800 font-medium text-xs">🔄 Atualizações Recentes:</p>
                  <p className="text-blue-700 text-xs">• Perfil de coordenação removido</p>
                  <p className="text-blue-700 text-xs">• ATs lançam próprias supervisões</p>
                  <p className="text-blue-700 text-xs">• Pais apenas visualizam atendimentos</p>
                  <p className="text-blue-700 text-xs">• Recepção confirma atendimentos</p>
                </div>

                <div className="bg-green-50 p-2 rounded mt-2">
                  <p className="text-green-800 font-medium text-xs">🔧 Troubleshooting:</p>
                  <p className="text-green-700 text-xs">• Backend deve rodar na porta 3001</p>
                  <p className="text-green-700 text-xs">• Execute: npm run dev:backend</p>
                  <p className="text-green-700 text-xs">• Teste: http://localhost:3001/api/health</p>
                </div>

                <p className="text-gray-400 mt-2">Outros usuários podem ser cadastrados pelo administrador</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card> 
    </div>
  );
};