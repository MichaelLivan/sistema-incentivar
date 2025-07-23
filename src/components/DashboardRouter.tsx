import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from './ui/Card';
import { ATDashboard } from './dashboards/ATDashboard';
import { PaisDashboard } from './dashboards/PaisDashboard';
import { FinanceiroDashboard } from './dashboards/FinanceiroDashboard';
import { AdminDashboard } from './dashboards/AdminDashboard';
import { GeneralAdminDashboard } from './dashboards/GeneralAdminDashboard';

export const DashboardRouter: React.FC = () => {
  const { user, loading } = useAuth();

  // Estado de loading
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Usuário não autenticado
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="text-center py-8">
            <h2 className="text-2xl font-bold text-purple-800 mb-4">
              Acesso Negado
            </h2>
            <p className="text-gray-600">
              Você precisa estar logado para acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Função para renderizar o dashboard correto baseado no tipo de usuário
  const renderDashboard = () => {
    console.log('🔍 [DASHBOARD ROUTER] Tipo de usuário:', user.type);

    switch (user.type) {
      // Acompanhantes Terapêuticos
      case 'at-aba':
      case 'at-denver':
      case 'at-grupo':
      case 'at-escolar':
        console.log('📋 [DASHBOARD ROUTER] Redirecionando para ATDashboard');
        return <ATDashboard />;
      
      // Pais/Responsáveis
      case 'pais':
        console.log('👨‍👩‍👧‍👦 [DASHBOARD ROUTER] Redirecionando para PaisDashboard');
        return <PaisDashboard />;
      
      // Financeiro
      case 'financeiro-ats':
        console.log('💰 [DASHBOARD ROUTER] Redirecionando para FinanceiroDashboard (ATS)');
        return <FinanceiroDashboard />;
      
      case 'financeiro-pct':
        console.log('💰 [DASHBOARD ROUTER] Redirecionando para FinanceiroDashboard (PCT)');
        return <FinanceiroDashboard />;
      
      // Administradores de Setor (incluindo recepção)
      case 'adm-aba':
      case 'adm-denver':
      case 'adm-grupo':
      case 'adm-escolar':
        console.log('⚙️ [DASHBOARD ROUTER] Redirecionando para AdminDashboard (Admin + Recepção)');
        return <AdminDashboard />;
      
      // Administrador Geral
      case 'adm-geral':
        console.log('🔧 [DASHBOARD ROUTER] Redirecionando para GeneralAdminDashboard');
        return <GeneralAdminDashboard />;
      
      // COORDENAÇÃO REMOVIDA - Redirecionar para dashboard de admin
      case 'coordenacao-aba':
      case 'coordenacao-denver':
      case 'coordenacao-grupo':
      case 'coordenacao-escolar':
        console.log('⚠️ [DASHBOARD ROUTER] Perfil de coordenação removido - redirecionando para AdminDashboard');
        return <AdminDashboard />;
      
      // Tipo de usuário não reconhecido
      default:
        console.error('❌ [DASHBOARD ROUTER] Tipo de usuário não reconhecido:', user.type);
        return (
          <div className="container mx-auto px-4 py-6">
            <Card>
              <CardContent className="text-center py-8">
                <div className="mb-4">
                  <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
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
                    <strong>Tipo:</strong> <code className="bg-red-100 px-2 py-1 rounded">{user.type}</code>
                  </p>
                </div>
                <p className="text-gray-600 mb-4">
                  Entre em contato com o administrador do sistema para verificar suas permissões.
                </p>
                <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-100 rounded-lg">
                  <strong>Tipos válidos:</strong><br />
                  • AT: at-aba, at-denver, at-grupo, at-escolar<br />
                  • Pais: pais<br />
                  • Financeiro: financeiro-ats, financeiro-pct<br />
                  • Admin: adm-aba, adm-denver, adm-grupo, adm-escolar, adm-geral<br />
                  <br />
                  <strong>Nota:</strong> O perfil de coordenação foi removido. Os ATs agora lançam suas próprias supervisões.
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
