import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
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

    console.log('🔄 Tentando login via formulário:', { 
      email: formData.email, 
      password: '***',
      url: 'http://localhost:5173/api/auth/login'
    });

    const success = await login(formData.email, formData.password);
    
    if (!success) {
      console.log('❌ Login falhou');
    } else {
      console.log('✅ Login bem-sucedido');
    }
  };

  // Função para testar conectividade
  const testConnection = async () => {
    try {
      console.log('🔍 Testando conectividade...');
      const response = await fetch('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: 'test@test.com', 
          password: 'test' 
        })
      });
      
      console.log('📊 Status do servidor:', response.status);
      const text = await response.text();
      console.log('📄 Resposta do servidor:', text);
      
      if (response.status === 404) {
        alert('❌ Endpoint não encontrado. Verifique se o servidor backend está rodando na porta correta.');
      } else {
        alert(`✅ Servidor respondeu com status ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erro de conexão:', error);
      alert('❌ Não foi possível conectar ao servidor. Verifique se está rodando na porta 5173.');
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
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                <p className="font-semibold">❌ Erro:</p>
                <p>{error}</p>
                {error.includes('conectar') && (
                  <div className="mt-2">
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="secondary" 
                      onClick={testConnection}
                    >
                      Testar Conexão
                    </Button>
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

          

<div className="mt-6 text-xs text-gray-500 space-y-2">
            <p className="text-center font-semibold">Para testes, use a senha: <strong>123456</strong></p>
            <div className="border-t pt-3">
              <p className="font-semibold mb-2">Exemplos de emails:</p>
              <div className="space-y-1 text-xs">
                <p><strong>Administrador Geral:</strong> adm.geral@incentivar.com</p>
                <p><strong>Administrador Denver:</strong> debora.denver@incentivar.com</p>
                <p><strong>Financeiro Ats:</strong> financeiro.ats@incentivar.com</p>
                <p><strong>Financeiro Pct:</strong> financeiro.pct@incentivar.com</p>
                <p><strong>AT Denver:</strong> jessicasantana@incentivar.com</p>
                <p><strong>AT Denver:</strong> camilaalves@incentivar.com</p>
                <p><strong>Mãe:</strong> elba@incentivar.com</p>
                <p><strong>Pai:</strong> ronaldo@incentivar.com</p>
                
                <div className="bg-blue-50 p-2 rounded mt-3">
                  <p className="text-blue-800 font-medium text-xs">🔄 Mudanças Recentes:</p>
                  <p className="text-blue-700 text-xs">• Perfil de coordenação removido</p>
                  <p className="text-blue-700 text-xs">• ATs lançam próprias supervisões</p>
                  <p className="text-blue-700 text-xs">• Pais apenas visualizam atendimentos</p>
                  <p className="text-blue-700 text-xs">• Recepção confirma atendimentos</p>
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
