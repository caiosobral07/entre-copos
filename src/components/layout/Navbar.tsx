import React from 'react';
import {
  Store as StoreIcon,
  User as UserIcon,
  LogOut,
  Wallet,
  Menu,
  Building2,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CashRegister } from '../../types';

interface NavbarProps {
  currentCashRegister: CashRegister | null;
  onOpenMobileMenu: () => void;
  onNavigate: (view: string) => void;
  onToggleDesktopSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCashRegister,
  onOpenMobileMenu,
  onNavigate,
  onToggleDesktopSidebar,
}) => {
  const { user, store, logout, isAdmin, isSuperAdmin } = useAuth();

  const handleMenuClick = () => {
    // If on smaller screen (< 1024px) or if toggle desktop is requested
    onOpenMobileMenu();
    if (onToggleDesktopSidebar) {
      onToggleDesktopSidebar();
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Mobile/Desktop trigger & Store branding */}
      <div className="flex items-center gap-3">
        <button
          id="btn-open-mobile-menu"
          onClick={handleMenuClick}
          className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          aria-label="Abrir ou fechar menu de navegação"
          title="Alternar menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm shadow-amber-500/20">
            <StoreIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 sm:text-base leading-tight">
                {store?.fantasyName || store?.name || 'Entre Copos Gestão'}
              </h1>
              <span className="hidden sm:inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                <Building2 className="mr-1 h-3 w-3" />
                {store?.name}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Sistema Integrado de Gestão Comercial
            </p>
          </div>
        </div>
      </div>

      {/* Right: Cash status badge, user profile & logout */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Cash Register status badge */}
        <button
          id="btn-quick-caixa-status"
          onClick={() => onNavigate('caixa')}
          className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
            currentCashRegister?.status === 'ABERTO'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
          }`}
          title="Clique para ir ao módulo do Caixa"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              currentCashRegister?.status === 'ABERTO' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <Wallet className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            Caixa: {currentCashRegister?.status === 'ABERTO' ? 'Aberto' : 'Fechado'}
          </span>
        </button>

        {/* Super Admin Quick Link Button */}
        {isSuperAdmin && (
          <button
            id="btn-navbar-superadmin"
            onClick={() => onNavigate('superadmin')}
            className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition shadow-sm"
            title="Ir para o Painel Geral de Lojas"
          >
            <ShieldCheck className="h-4 w-4 text-amber-600" />
            <span className="hidden lg:inline">Painel de Lojas</span>
          </button>
        )}

        {/* User profile tag */}
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
            <UserIcon className="h-4 w-4" />
          </div>
          <div className="hidden text-left md:block">
            <p className="text-xs font-bold text-slate-800 leading-none">{user?.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {isSuperAdmin ? (
                <span className="inline-flex items-center text-[10px] font-bold text-amber-700">
                  <ShieldCheck className="mr-0.5 h-3 w-3 text-amber-600" /> Administrador Geral
                </span>
              ) : isAdmin ? (
                <span className="inline-flex items-center text-[10px] font-semibold text-purple-700">
                  <ShieldCheck className="mr-0.5 h-3 w-3" /> Admin Loja
                </span>
              ) : (
                <span className="inline-flex items-center text-[10px] font-semibold text-blue-700">
                  <UserCheck className="mr-0.5 h-3 w-3" /> Funcionário
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          id="btn-logout"
          onClick={logout}
          className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-colors"
          title="Sair do sistema"
          aria-label="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
