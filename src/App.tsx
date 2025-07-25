import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/auth/LoginForm';
import { Header } from './components/layout/Header';
import { DashboardRouter } from './components/DashboardRouter';

const AppContent = () => {
  const { user, isLoading, error } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-700 via-pink-600 to-teal-500 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-pink-600 to-teal-500 bg-fixed">
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          {error}
        </div>
      )}
      {!user ? (
        <LoginForm />
      ) : (
        <>
          <Header />
          <main className="min-h-screen">
            <DashboardRouter />
          </main>
        </>
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;