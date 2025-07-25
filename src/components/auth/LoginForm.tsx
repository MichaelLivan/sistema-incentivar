import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Eye, EyeOff, RefreshCw, AlertCircle, Wifi, WifiOff, CheckCircle } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [apiUrl, setApiUrl] = useState<string>('');
  
  const { login, isLoading, error } = useAuth();

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

  // ✅ FUNÇÃO MELHORADA: Testar conectividade com melhor diagnóstico
  const testConnection = async () => {
    setConnectionTested(true);
    setConnectionStatus('unknown');
    
    try {
      console.log('🔍 [LOGIN FORM] Testando conectividade...');
      
      // URLs para testar em ordem de prioridade
      const urlsToTest = [
        'http://localhost:3001/api/health',
        'http://localhost:3001/api/auth/health',
        '/api/health',
        '/api/auth/health'
      ];
      
      let lastError = null;
      let successUrl = null;
      
      for (const url of urlsToTest) {
        try {
          console.log(`🌐 [LOGIN FORM] Testando URL: ${url}`);
          
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
          });
          
          clearTimeout(timeout);
          
          console.log(`📊 [LOGIN FORM] Resposta (${url}):`, response.status);
          
          if (response.ok) {
            // Tentar ler a resposta
            try {
              const data = await response.json();
              console.log(`✅ [LOGIN FORM] Resposta válida de ${url}:`, data);
              successUrl = url;
              setApiUrl(url);
              break;
            } catch (parseError) {
              console.log(`⚠️ [LOGIN FORM] Resposta não-JSON de ${url}, mas servidor respondeu`);
              successUrl = url;
              setApiUrl(url);
              break;
            }
          } else if (response.status === 404) {
            // 404 significa que o servidor está rodando, mas endpoint não existe
            console.log(`ℹ️ [LOGIN FORM] Servidor ativo em ${url} (404 = endpoint não encontrado)`);
            successUrl = url;
            setApiUrl(url);
            break;
          }
          
        } catch (fetchError) {
          console.log(`❌ [LOGIN FORM] Erro na URL ${url}:`, fetchError);
          lastError = fetchError;
          continue;
        }
      }
      
      if (successUrl) {
        setConnectionStatus('success');
        alert(`✅ Servidor backend encontrado!\n\n` +
              `URL: ${successUrl}\n` +
              `Status: Conectado\n\n` +
              `Agora você pode tentar fazer login.`);
      } else {
        setConnectionStatus('error');
        
        let errorMessage = '❌ Não foi possível conectar ao servidor backend.\n\n';
        
        if (lastError instanceof Error) {
          if (lastError.name === 'AbortError') {
            errorMessage += 'Motivo: Timeout na conexão (>5s)\n\n';
          } else if (lastError.message.includes('Failed to fetch') || 
                     lastError.message.includes('ERR_CONNECTION_REFUSED') ||
                     lastError.message.includes('ECONNREFUSED')) {
            errorMessage += 'Motivo: Conexão recusada - Servidor não está rodando\n\n';
          } else {
            errorMessage += `Motivo: ${lastError.message}\n\n`;
          }
        }
        
        errorMessage += '🔧 SOLUÇÕES:\n';
        errorMessage += '1. ✅ Verifique se o backend está rodando:\n';
        errorMessage += '   npm run dev:backend\n\n';
        errorMessage += '2. ✅ Verifique se está na porta 3001:\n';
        errorMessage += '   http://localhost:3001/api/health\n\n';
        errorMessage += '3. ✅ Verifique se não há outras aplicações usando a porta 3001\n\n';
        errorMessage += '4. ✅ Reinicie o backend se necessário';
        
        alert(errorMessage);
      }
      
    } catch (criticalError) {
      console.error('❌ [LOGIN FORM] Erro crítico no teste de conexão:', criticalError);
      setConnectionStatus('error');
      alert('❌ Erro crítico ao testar conexão. Verifique o console do navegador para mais detalhes.');
    }
  };

  // ✅ FUNÇÃO NOVA: Verificar configuração da API
  const checkApiConfig = () => {
    const isDev = !import.meta.env.PROD;
    const envApiUrl = import.meta.env.VITE_API_URL;
    
    const currentApiUrl = isDev ? 'http://localhost:3001/api' : (envApiUrl || '/api');
    
    const configInfo = {
      environment: isDev ? 'DESENVOLVIMENTO' : 'PRODUÇÃO',
      currentUrl: currentApiUrl,
      envVariable: envApiUrl || 'Não definida',
      frontendUrl: window.location.href,
      userAgent: navigator.userAgent
    };
    
    console.log('🔍 [LOGIN FORM] Configuração da API:', configInfo);
    
    const message = `📋 CONFIGURAÇÃO ATUAL DA API:\n\n` +
      `Ambiente: ${configInfo.environment}\n` +
      `URL da API: ${configInfo.currentUrl}\n` +
      `VITE_API_URL: ${configInfo.envVariable}\n` +
      `Frontend: ${configInfo.frontendUrl}\n\n` +
      `🔧 PARA DESENVOLVIMENTO:\n` +
      `• O backend deve estar rodando em http://localhost:3001\n` +
      `• Execute: npm run dev:backend\n` +
      `• Teste: http://localhost:3001/api/health\n\n` +
      `🚀 PARA PRODUÇÃO:\n` +
      `• Configure VITE_API_URL no .env\n` +
      `• Exemplo: VITE_API_URL=https://seu-backend.com/api`;
    
    alert(message);
  };

  // ✅ FUNÇÃO NOVA: Teste rápido de login
  const quickLoginTest = async () => {
    if (!formData.email || !formData.password) {
      alert('⚠️ Preencha email e senha antes de testar');
      return;
    }

    try {
      console.log('🧪 [LOGIN FORM] Teste rápido de login...');
      
      // Fazer uma requisição direta para debug
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });
      
      console.log('📊 [LOGIN FORM] Resposta do teste:', response.status);
      
      const responseText = await response.text();
      console.log('📄 [LOGIN FORM] Conteúdo da resposta:', responseText);
      
      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          alert('✅ Teste de login bem-sucedido!\n\n' +
                `Usuário: ${data.user?.name || 'N/A'}\n` +
                `Tipo: ${data.user?.type || 'N/A'}\n` +
                `Token: ${data.token ? 'Recebido' : 'Ausente'}`);
        } catch (parseError) {
          alert('✅ Servidor respondeu, mas resposta não é JSON válido');
        }
      } else {
        alert(`❌ Teste de login falhou\n\n` +
              `Status: ${response.status}\n` +
              `Resposta: ${responseText}`);
      }
      
    } catch (error) {
      console.error('❌ [LOGIN FORM] Erro no teste rápido:', error);
      alert(`❌ Erro no teste de login:\n\n${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
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

            {/* ✅ SEÇÃO MELHORADA: Exibição de erros com diagnóstico */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-800 text-sm">Erro no Login:</p>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                    
                    {/* ✅ Botões de diagnóstico baseados no tipo de erro */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(error.includes('conectar') || 
                        error.includes('servidor') || 
                        error.includes('Failed to fetch') ||
                        error.includes('Connection refused')) ? (
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
                            onClick={checkApiConfig}
                            disabled={isLoading}
                            className="text-xs"
                          >
                            🔍 Config API
                          </Button>
                        </>
                      ) : (error.includes('credencial') || 
                           error.includes('senha') || 
                           error.includes('401') ||
                           error.includes('403')) ? (
                        <>
                          <p className="text-xs text-red-600 mt-1">
                            💡 Verifique seu email e senha. Use as credenciais de exemplo abaixo para teste.
                          </p>
                          <Button 
                            type="button" 
                            size="sm" 
                            variant="secondary" 
                            onClick={quickLoginTest}
                            disabled={isLoading}
                            className="text-xs"
                          >
                            🧪 Teste Direto
                          </Button>
                        </>
                      ) : (
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
                            Diagnóstico
                          </Button>
                          <Button 
                            type="button" 
                            size="sm" 
                            variant="secondary" 
                            onClick={quickLoginTest}
                            disabled={isLoading}
                            className="text-xs"
                          >
                            🧪 Teste Login
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* ✅ Status da conexão melhorado */}
                {connectionTested && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <div className="flex items-center space-x-2">
                      {connectionStatus === 'success' ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-green-700 text-xs font-medium">Servidor conectado</span>
                          {apiUrl && <span className="text-green-600 text-xs">({apiUrl})</span>}
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

          {/* ✅ SEÇÃO ATUALIZADA: Credenciais de exemplo e diagnóstico */}
          <div className="mt-6 text-xs text-gray-500 space-y-2">
            <p className="text-center font-semibold">Para testes, use a senha: <strong>123456</strong></p>
            
            {/* ✅ Botão de diagnóstico sempre visível */}
            <div className="flex justify-center space-x-2 mb-3">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={testConnection}
                disabled={isLoading}
                className="text-xs px-2 py-1"
              >
                <Wifi className="w-3 h-3 mr-1" />
                Testar Backend
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={checkApiConfig}
                disabled={isLoading}
                className="text-xs px-2 py-1"
              >
                🔍 Ver Config
              </Button>
            </div>
            
            <div className="border-t pt-3">
              <p className="font-semibold mb-2">📧 Exemplos de emails:</p>
              <div className="space-y-1 text-xs">
                <p><strong>👑 Admin Geral:</strong> adm.geral@incentivar.com</p>
                <p><strong>🏢 Admin Denver:</strong> debora.denver@incentivar.com</p>
                <p><strong>💰 Financeiro ATs:</strong> financeiro.ats@incentivar.com</p>
                <p><strong>💼 Financeiro PCT:</strong> financeiro.pct@incentivar.com</p>
                <p><strong>👨‍⚕️ AT Denver:</strong> jessicasantana@incentivar.com</p>
                <p><strong>👩‍⚕️ AT Denver:</strong> camilaalves@incentivar.com</p>
                <p><strong>👩‍👧‍👦 Mãe:</strong> elba@incentivar.com</p>
                <p><strong>👨‍👧‍👦 Pai:</strong> ronaldo@incentivar.com</p>
                
                <div className="bg-blue-50 p-2 rounded mt-3">
                  <p className="text-blue-800 font-medium text-xs">🔄 Atualizações Recentes:</p>
                  <p className="text-blue-700 text-xs">• Sistema totalmente integrado com banco</p>
                  <p className="text-blue-700 text-xs">• Login via backend Node.js + Supabase</p>
                  <p className="text-blue-700 text-xs">• Melhor diagnóstico de erros</p>
                </div>

                <div className="bg-green-50 p-2 rounded mt-2">
                  <p className="text-green-800 font-medium text-xs">🔧 Troubleshooting:</p>
                  <p className="text-green-700 text-xs">• Backend deve rodar na porta 3001</p>
                  <p className="text-green-700 text-xs">• Execute: npm run dev:backend</p>
                  <p className="text-green-700 text-xs">• Teste: http://localhost:3001/api/health</p>
                  <p className="text-green-700 text-xs">• Use os botões de diagnóstico acima</p>
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