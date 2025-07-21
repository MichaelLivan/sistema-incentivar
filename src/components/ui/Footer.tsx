import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-12 py-6 border-t border-gray-200 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Desenvolvido por <span className="font-semibold text-purple-700">Michael Livan</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            © {new Date().getFullYear()} Sistema de Gestão Incentivar
          </p>
        </div>
      </div>
    </footer>
  );
};