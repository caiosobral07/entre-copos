import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Boxes,
  Wallet,
  Truck,
  DollarSign,
  FileText,
  Shield,
  Settings,
  History,
  X,
  Store as StoreIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  activeView?: string;
  currentView?: string;
  onNavigate: (view: string) => void;
  mobileOpen?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile: () => void;
  openComandasCount?: number;
  desktopOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  currentView,
  onNavigate,
  mobileOpen,
  isMobileOpen,
  onCloseMobile,
  openComandasCount = 0,
  desktopOpen = true,
}) => {
  const { isAdmin, isSuperAdmin } = useAuth();
  const effectiveView = activeView || currentView || 'dashboard';
  const isDrawerOpen = Boolean(mobileOpen ?? isMobileOpen);

  const navItems = [
    ...(isSuperAdmin
      ? [
          {
            section: 'Administração Geral',
            items: [
              {
                id: 'superadmin',
                label: 'Painel Geral de Lojas',
                icon: StoreIcon,
                highlight: true,
              },
            ],
          },
        ]
      : []),
    {
      section: 'Operacional',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'pdv', label: 'PDV / Venda Rápida', icon: ShoppingCart, highlight: true },
        {
          id: 'comandas',
          label: 'Comandas & Mesas',
          icon: Receipt,
          badge: openComandasCount > 0 ? `${openComandasCount}` : undefined,
          badgeColor: 'bg-amber-500 text-white',
        },
        { id: 'caixa', label: 'Caixa', icon: Wallet },
        { id: 'vendas', label: 'Histórico de Vendas', icon: History },
      ],
    },
    {
      section: 'Cadastros & Estoque',
      items: [
        { id: 'produtos', label: 'Produtos & Categorias', icon: Package },
        { id: 'estoque', label: 'Controle de Estoque', icon: Boxes },
        ...(isAdmin ? [{ id: 'fornecedores', label: 'Fornecedores', icon: Truck }] : []),
      ],
    },
    {
      section: 'Gestão & Relatórios',
      items: [
        ...(isAdmin ? [{ id: 'contas-pagar', label: 'Contas a Pagar', icon: DollarSign }] : []),
        ...(isAdmin ? [{ id: 'funcionarios', label: 'Funcionários & Permissões', icon: Shield }] : []),
        { id: 'relatorios', label: 'Relatórios & PDF', icon: FileText },
        ...(isAdmin ? [{ id: 'auditoria', label: 'Auditoria', icon: History }] : []),
        { id: 'configuracoes', label: 'Configurações', icon: Settings },
      ],
    },
  ];

  const handleSelect = (id: string) => {
    onNavigate(id);
    onCloseMobile();
  };

  const content = (
    <div className="flex h-full flex-col justify-between overflow-y-auto p-4">
      <div className="space-y-6">
        {/* Brand in sidebar for mobile */}
        <div className="flex items-center justify-between lg:hidden pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white">
              <StoreIcon className="h-5 w-5" />
            </div>
            <span className="font-bold text-slate-800 text-sm">Entre Copos Gestão</span>
          </div>
          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {navItems.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {section.section}
            </h3>
            <div className="space-y-1 pt-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = effectiveView === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    onClick={() => handleSelect(item.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : item.highlight
                        ? 'text-amber-700 bg-amber-50/70 hover:bg-amber-100/80 font-bold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? 'text-amber-400' : item.highlight ? 'text-amber-600' : 'text-slate-500'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isActive ? 'bg-amber-400 text-slate-900' : item.badgeColor || 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-slate-200 mt-4 text-center">
        <p className="text-[11px] text-slate-400 font-medium">
          Entre Copos Gestão v1.0.0
        </p>
        <p className="text-[10px] text-slate-400">
          Multi-loja • BRL • DD/MM/AAAA
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      {desktopOpen && (
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white min-h-[calc(100vh-4rem)]">
          {content}
        </aside>
      )}

      {/* Mobile Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" id="mobile-sidebar-drawer">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl transition-transform z-10 flex flex-col">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
