import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { AuthView } from './components/auth/AuthView';
import { DashboardView } from './components/dashboard/DashboardView';
import { PdvView } from './components/pdv/PdvView';
import { ComandasView } from './components/comandas/ComandasView';
import { ProdutosView } from './components/produtos/ProdutosView';
import { EstoqueView } from './components/estoque/EstoqueView';
import { CaixaView } from './components/caixa/CaixaView';
import { VendasView } from './components/vendas/VendasView';
import { FornecedoresView } from './components/fornecedores/FornecedoresView';
import { ContasPagarView } from './components/contas-pagar/ContasPagarView';
import { FuncionariosView } from './components/funcionarios/FuncionariosView';
import { RelatoriosView } from './components/relatorios/RelatoriosView';
import { AuditoriaView } from './components/auditoria/AuditoriaView';
import { ConfiguracoesView } from './components/configuracoes/ConfiguracoesView';
import { SuperAdminView } from './components/superadmin/SuperAdminView';
import { CashRegister } from './types';
import { api } from './services/api';
import { Loader2 } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, token, loading, isAdmin, isSuperAdmin } = useAuth();
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState<boolean>(true);
  const [currentCashRegister, setCurrentCashRegister] = useState<CashRegister | null>(null);

  const fetchCashStatus = useCallback(async () => {
    if (!token) return;
    try {
      const reg = await api.getCurrentCashRegister();
      setCurrentCashRegister(reg);
    } catch {
      setCurrentCashRegister(null);
    }
  }, [token]);

  useEffect(() => {
    if (token && user) {
      fetchCashStatus();
    }
  }, [token, user, fetchCashStatus]);

  // Admin access guard for views restricted to administrators
  useEffect(() => {
    const adminViews = ['fornecedores', 'contas-pagar', 'funcionarios', 'auditoria'];
    if (!isAdmin && adminViews.includes(activeView)) {
      setActiveView('dashboard');
    }
  }, [activeView, isAdmin]);

  // Set default view for Super Admin to the Super Admin stores panel
  useEffect(() => {
    if (isSuperAdmin && activeView === 'dashboard') {
      setActiveView('superadmin');
    }
  }, [isSuperAdmin]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-sm font-semibold tracking-wide text-slate-300">
            Carregando Entre Copos Gestão...
          </p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        currentCashRegister={currentCashRegister}
        onOpenMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        onToggleDesktopSidebar={() => setIsDesktopSidebarOpen((prev) => !prev)}
        onNavigate={(view) => setActiveView(view)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          activeView={activeView}
          currentView={activeView}
          onNavigate={(view) => setActiveView(view)}
          mobileOpen={isMobileMenuOpen}
          isMobileOpen={isMobileMenuOpen}
          desktopOpen={isDesktopSidebarOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-100/90">
          <div className="mx-auto max-w-7xl">
            {activeView === 'dashboard' && (
              <DashboardView onNavigate={(view) => setActiveView(view)} />
            )}

            {activeView === 'superadmin' && isSuperAdmin && (
              <SuperAdminView onNavigateToView={(view) => setActiveView(view)} />
            )}

            {activeView === 'pdv' && <PdvView />}

            {activeView === 'comandas' && <ComandasView />}

            {activeView === 'caixa' && (
              <CaixaView onCashStatusChanged={fetchCashStatus} />
            )}

            {activeView === 'vendas' && <VendasView />}

            {activeView === 'produtos' && <ProdutosView />}

            {activeView === 'estoque' && <EstoqueView />}

            {activeView === 'fornecedores' && isAdmin && <FornecedoresView />}

            {activeView === 'contas-pagar' && isAdmin && <ContasPagarView />}

            {activeView === 'funcionarios' && isAdmin && <FuncionariosView />}

            {activeView === 'relatorios' && <RelatoriosView />}

            {activeView === 'auditoria' && isAdmin && <AuditoriaView />}

            {activeView === 'configuracoes' && <ConfiguracoesView />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
