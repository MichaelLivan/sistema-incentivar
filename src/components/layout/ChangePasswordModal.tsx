import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, Eye, EyeOff, Lock } from 'lucide-react';
import { apiService } from '../../services/api';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Verificação de responsividade
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(''); // Limpar erro ao digitar
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('Todos os campos são obrigatórios');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('A nova senha e confirmação não coincidem');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('A nova senha deve ser diferente da senha atual');
      return;
    }

    setLoading(true);

    try {
      await apiService.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      alert('Senha alterada com sucesso!');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      onClose();
    } catch (error: any) {
      setError(error.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 md:p-6">
      <div className="bg-white rounded-lg w-full max-w-[95vw] sm:max-w-md lg:max-w-lg max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 md:p-6 border-b bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
            <h3 className="text-base sm:text-lg md:text-xl font-semibold">
              <span className="hidden sm:inline">Alterar Senha</span>
              <span className="sm:hidden">Nova Senha</span>
            </h3>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white border-white border-opacity-30 p-1.5 sm:p-2"
          >
            <X className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5">
          {/* Senha Atual */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-purple-800 mb-1.5 sm:mb-2">
              Senha Atual *
            </label>
            <div className="relative">
              <Input
                type={showPasswords.current ? "text" : "password"}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                placeholder="Digite sua senha atual"
                required
                className="pr-10 sm:pr-12 text-gray-900 text-sm sm:text-base py-2.5 sm:py-3"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1 sm:p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Mostrar/Ocultar senha atual"
              >
                {showPasswords.current ? <EyeOff size={isMobile ? 16 : 20} /> : <Eye size={isMobile ? 16 : 20} />}
              </button>
            </div>
          </div>

          {/* Nova Senha */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-purple-800 mb-1.5 sm:mb-2">
              Nova Senha *
            </label>
            <div className="relative">
              <Input
                type={showPasswords.new ? "text" : "password"}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder={isMobile ? "Nova senha (min. 6 chars)" : "Digite a nova senha (mín. 6 caracteres)"}
                required
                className="pr-10 sm:pr-12 text-gray-900 text-sm sm:text-base py-2.5 sm:py-3"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1 sm:p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Mostrar/Ocultar nova senha"
              >
                {showPasswords.new ? <EyeOff size={isMobile ? 16 : 20} /> : <Eye size={isMobile ? 16 : 20} />}
              </button>
            </div>
            {/* Indicador de força da senha */}
            {formData.newPassword && (
              <div className="mt-1.5 sm:mt-2">
                <div className="flex space-x-1">
                  <div className={`h-1 flex-1 rounded ${formData.newPassword.length >= 6 ? 'bg-green-400' : 'bg-gray-200'}`} />
                  <div className={`h-1 flex-1 rounded ${formData.newPassword.length >= 8 ? 'bg-green-400' : 'bg-gray-200'}`} />
                  <div className={`h-1 flex-1 rounded ${formData.newPassword.length >= 10 && /[A-Z]/.test(formData.newPassword) ? 'bg-green-400' : 'bg-gray-200'}`} />
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {formData.newPassword.length < 6 ? 'Muito fraca' : 
                   formData.newPassword.length < 8 ? 'Fraca' : 
                   formData.newPassword.length >= 10 && /[A-Z]/.test(formData.newPassword) ? 'Forte' : 'Média'}
                </p>
              </div>
            )}
          </div>

          {/* Confirmar Nova Senha */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-purple-800 mb-1.5 sm:mb-2">
              Confirmar Nova Senha *
            </label>
            <div className="relative">
              <Input
                type={showPasswords.confirm ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder={isMobile ? "Confirme a nova senha" : "Digite novamente a nova senha"}
                required
                className="pr-10 sm:pr-12 text-gray-900 text-sm sm:text-base py-2.5 sm:py-3"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1 sm:p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Mostrar/Ocultar confirmação de senha"
              >
                {showPasswords.confirm ? <EyeOff size={isMobile ? 16 : 20} /> : <Eye size={isMobile ? 16 : 20} />}
              </button>
            </div>
            {/* Validação visual */}
            {formData.confirmPassword && (
              <div className="mt-1.5 sm:mt-2">
                {formData.newPassword === formData.confirmPassword ? (
                  <p className="text-xs text-green-600 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    <span>Senhas coincidem</span>
                  </p>
                ) : (
                  <p className="text-xs text-red-600 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    <span>Senhas não coincidem</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Mensagem de Erro */}
          {error && (
            <div className="text-red-600 text-xs sm:text-sm bg-red-50 p-2.5 sm:p-3 rounded-lg border border-red-200">
              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Dicas de Segurança */}
          <div className="bg-blue-50 p-2.5 sm:p-3 rounded-lg border border-blue-200">
            <h4 className="text-xs sm:text-sm font-medium text-blue-800 mb-1.5">Dicas de Segurança:</h4>
            <ul className="text-xs text-blue-700 space-y-0.5">
              <li>• Use pelo menos 6 caracteres</li>
              <li>• Combine letras maiúsculas e minúsculas</li>
              <li>• Inclua números e símbolos</li>
              <li>• Não use informações pessoais</li>
            </ul>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-2 sm:pt-4">
            <Button
              type="submit"
              disabled={loading || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword || formData.newPassword !== formData.confirmPassword}
              className="flex-1 text-sm sm:text-base py-2.5 sm:py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Alterando...</span>
                </div>
              ) : (
                'Alterar Senha'
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="flex-1 text-sm sm:text-base py-2.5 sm:py-3"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};