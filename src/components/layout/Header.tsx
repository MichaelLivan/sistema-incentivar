import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { LogOut, User, Settings, Menu, X } from 'lucide-react';
import { ChangePasswordModal } from './ChangePasswordModal';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = React.useState(false);
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  // Verificação de responsividade
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // Fechar menu mobile quando redimensionar para desktop
      if (window.innerWidth >= 768) {
        setShowMobileMenu(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getUserTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'financeiro-ats': 'Financeiro - ATs',
      'financeiro-pct': 'Financeiro - Pacientes',
      'at-aba': 'AT - ABA',
      'at-denver': 'AT - Denver',
      'at-grupo': 'AT - Grupo',
      'at-escolar': 'AT - Escolar',
      'pais': 'Pais / Responsável',
      'adm-aba': 'Administração - ABA',
      'adm-denver': 'Administração - Denver',
      'adm-grupo': 'Administração - Grupo',
      'adm-escolar': 'Administração - Escolar',
      'adm-geral': 'Administrador Geral',
    };
    return labels[type] || type;
  };

  const handleLogout = () => {
    setShowMobileMenu(false);
    logout();
  };

  const handleChangePassword = () => {
    setShowMobileMenu(false);
    setShowChangePassword(true);
  };

  return (
    <header className="bg-purple-700 text-white shadow-2xl relative">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo e Título */}
          <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 min-w-0 flex-1">
            <img 
              src="/logo.jpg" 
              alt="Logo Clínica Incentivar" 
              className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg border-2 border-white/30 flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-lg md:text-xl font-bold tracking-wide truncate">
                Clínica Incentivar
              </h1>
              <p className="text-purple-200 text-xs sm:text-sm truncate">
                <span className="hidden sm:inline">Sistema de Gerenciamento de ATs</span>
                <span className="sm:hidden">Sistema ATs</span>
              </p>
            </div>
          </div>
          
          {user && (
            <>
              {/* Desktop Menu */}
              <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <User size={14} className="lg:w-4 lg:h-4" />
                    <span className="font-medium text-sm lg:text-base truncate max-w-32 lg:max-w-48" title={user.name}>
                      {user.name}
                    </span>
                  </div>
                  <p className="text-purple-200 text-xs lg:text-sm truncate max-w-32 lg:max-w-48" title={getUserTypeLabel(user.type)}>
                    {getUserTypeLabel(user.type)}
                  </p>
                </div>
                <Button
                  onClick={handleChangePassword}
                  variant="secondary"
                  size="sm"
                  className="flex items-center space-x-1 lg:space-x-2 text-xs lg:text-sm px-2 lg:px-3"
                >
                  <Settings size={14} className="lg:w-4 lg:h-4" />
                  <span className="hidden lg:inline">Trocar Senha</span>
                  <span className="lg:hidden">Senha</span>
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="secondary"
                  size="sm"
                  className="flex items-center space-x-1 lg:space-x-2 text-xs lg:text-sm px-2 lg:px-3"
                >
                  <LogOut size={14} className="lg:w-4 lg:h-4" />
                  <span className="hidden lg:inline">Sair</span>
                  <span className="lg:hidden">Sair</span>
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden flex items-center space-x-2">
                {/* User info compacta para mobile */}
                <div className="text-right">
                  <div className="flex items-center space-x-1">
                    <User size={12} />
                    <span className="font-medium text-xs truncate max-w-20" title={user.name}>
                      {user.name.split(' ')[0]}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  variant="secondary"
                  size="sm"
                  className="p-2"
                  aria-label="Menu"
                >
                  {showMobileMenu ? <X size={16} /> : <Menu size={16} />}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Mobile Dropdown Menu */}
        {user && showMobileMenu && (
          <div className="md:hidden mt-3 pt-3 border-t border-purple-600 space-y-3 relative z-50">
            {/* User Info Completa */}
            <div className="bg-purple-600 bg-opacity-50 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <User size={14} />
                <span className="font-medium text-sm">{user.name}</span>
              </div>
              <p className="text-purple-200 text-xs">
                {getUserTypeLabel(user.type)}
              </p>
            </div>
            
            {/* Menu Actions */}
            <div className="space-y-2">
              <Button
                onClick={handleChangePassword}
                variant="secondary"
                size="sm"
                className="w-full flex items-center justify-center space-x-2 text-sm"
              >
                <Settings size={16} />
                <span>Trocar Senha</span>
              </Button>
              <Button
                onClick={handleLogout}
                variant="secondary"
                size="sm"
                className="w-full flex items-center justify-center space-x-2 text-sm"
              >
                <LogOut size={16} />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Overlay para fechar menu mobile */}
      {showMobileMenu && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={() => setShowMobileMenu(false)}
        />
      )}
      
      {showChangePassword && (
        <ChangePasswordModal
          isOpen={showChangePassword}
          onClose={() => setShowChangePassword(false)}
        />
      )}
    </header>
  );
};
