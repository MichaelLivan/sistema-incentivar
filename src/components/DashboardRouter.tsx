import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from './ui/Card';
import { ATDashboard } from './dashboards/ATDashboard';
import { PaisDashboard } from './dashboards/PaisDashboard';
import { FinanceiroDashboard } from './dashboards/FinanceiroDashboard';
import { AdminDashboard } from './dashboards/AdminDashboard';
import { GeneralAdminDashboard } from './dashboards/GeneralAdminDashboard';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export const DashboardRouter: React.FC = () => {
  const { user, isLoading } = useAuth(); // ✅ CORRIGIDO: Usar isLoading

  // ✅ CORREÇÃO: Estado de loading melhorado
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6">
            <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-purple-800 mb-2">Carregando Sistema</h2>
          <p className="text-gray-600 mb-4">Verificando autenticação e carregando seu painel...</p>
          <div className="w-48 bg-gray-200 rounded-full h-2 mx-auto">
            <div className="bg-purple-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ CORREÇÃO: Usuário não autenticado melhorado
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Acesso Negado
            </h2>
            <p className="text-gray-600 mb-4">
              Você precisa estar logado para acessar esta página.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">💡 Faça login para continuar</p>
              <p className="text-sm text-blue-700">Use as credenciais de exemplo da tela de login</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ CORREÇÃO: Log detalhado para debug
  console.log('🔍 [DASHBOARD ROUTER] Redirecionando usuário:', {
    name: user.name,
    email: user.email,
    type: user.type,
    sector: user.sector
  });

  // ✅ FUNÇÃO MELHORADA: Renderizar dashboard correto baseado no tipo de usuário
  const renderDashboard = () => {
    switch (user.type) {
      // ===== ACOMPANHANTES TERAPÊUTICOS =====
      case 'at-aba':
      case 'at-denver':
      case 'at-grupo':
      case 'at-escolar':
        console.log('🩺 [DASHBOARD ROUTER] Redirecionando AT para ATDashboard');
        return <ATDashboard />;
      
      // ===== PAIS/RESPONSÁVEIS =====
      case 'pais':
        console.log('👨‍👩‍👧‍👦 [DASHBOARD ROUTER] Redirecionando para PaisDashboard');
        return <PaisDashboard />;
      
      // ===== FINANCEIRO =====
      case 'financeiro-ats':
        console.log('💰 [DASHBOARD ROUTER] Redirecionando para FinanceiroDashboard (ATS)');
        return <FinanceiroDashboard />;
      
      case 'financeiro-pct':
        console.log('💰 [DASHBOARD ROUTER] Redirecionando para FinanceiroDashboard (PCT)');
        return <FinanceiroDashboard />;
      
      // ===== ADMINISTRADORES DE SETOR =====
      case 'adm-aba':
      case 'adm-denver':
      case 'adm-grupo':
      case 'adm-escolar':
        console.log('⚙️ [DASHBOARD ROUTER] Redirecionando para AdminDashboard (Admin Setorial + Recepção)');
        return <AdminDashboard />;
      
      // ===== ADMINISTRADOR GERAL =====
      case 'adm-geral':
        console.log('🔧 [DASHBOARD ROUTER] Redirecionando para GeneralAdminDashboard');
        return <GeneralAdminDashboard />;
      
      // ===== COORDENAÇÃO (DESCONTINUADO) =====
      case 'coordenacao-aba':
      case 'coordenacao-denver':
      case 'coordenacao-grupo':
      case 'coordenacao-escolar':
        console.log('⚠️ [DASHBOARD ROUTER] Perfil de coordenação removido - redirecionando para AdminDashboard');
        return (
          <div className="container mx-auto px-4 py-6">
            <Card>
              <CardContent className="text-center py-8">
                <div className="mb-4">
                  <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-orange-600 mb-4">
                  Perfil de Coordenação Removido
                </h2>
                <div className="bg-orange-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-orange-800 mb-2">
                    <strong>Mudanças importantes:</strong>
                  </p>
                  <ul className="text-sm text-orange-700 space-y-1 text-left">
                    <li>• Os perfis de coordenação foram descontinuados</li>
                    <li>• ATs agora lançam suas próprias supervisões</li>
                    <li>• Use o painel administrativo para gerenciar</li>
                  </ul>
                </div>
                <p className="text-gray-600 mb-4">
                  Entre em contato com o administrador geral para atualizar seu perfil.
                </p>
                <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-100 rounded-lg">
                  <strong>Usuário atual:</strong> {user.name} ({user.email})<br />
                  <strong>Tipo:</strong> {user.type}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      // ===== TIPO NÃO RECONHECIDO =====
      default:
        console.error('❌ [DASHBOARD ROUTER] Tipo de usuário não reconhecido:', user.type);
        return (
          <div className="container mx-auto px-4 py-6">
            <Card>
              <CardContent className="text-center py-8">
                <div className="mb-4">
                  <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-red-600 mb-4">
                  Tipo de Usuário Não Reconhecido
                </h2>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Usuário:</strong> {user.name}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Email:</strong> {user.email}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Tipo:</strong> <code className="bg-red-100 px-2 py-1 rounded text-red-800">{user.type}</code>
                  </p>
                </div>
                <p className="text-gray-600 mb-4">
                  Entre em contato com o administrador do sistema para verificar suas permissões.
                </p>
                
                {/* ✅ Lista atualizada de tipos válidos */}
                <div className="text-xs text-gray-500 mt-4 p-4 bg-gray-100 rounded-lg text-left">
                  <strong className="block mb-2">Tipos de usuário válidos:</strong>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <strong>🩺 Acompanhantes Terapêuticos:</strong><br />
                      • at-aba<br />
                      • at-denver<br />
                      • at-grupo<br />
                      • at-escolar
                    </div>
                    <div>
                      <strong>👨‍👩‍👧‍👦 Responsáveis:</strong><br />
                      • pais
                    </div>
                    <div>
                      <strong>💰 Financeiro:</strong><br />
                      • financeiro-ats<br />
                      • financeiro-pct
                    </div>
                    <div>
                      <strong>⚙️ Administradores:</strong><br />
                      • adm-aba<br />
                      • adm-denver<br />
                      • adm-grupo<br />
                      • adm-escolar<br />
                      • adm-geral
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-orange-50 rounded border-l-4 border-orange-400">
                    <strong className="text-orange-800">⚠️ Removidos:</strong><br />
                    <span className="text-orange-700">Os perfis de coordenação (coordenacao-*) foram descontinuados.</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {renderDashboard()}
    </div>
  );
};