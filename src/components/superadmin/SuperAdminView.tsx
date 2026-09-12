import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Users,
  DollarSign,
  TrendingUp,
  Store as StoreIcon,
  ShieldCheck,
  UserCheck,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Power,
  RotateCw,
  Copy,
  Check,
  FileText,
  KeyRound,
} from 'lucide-react';
import { api } from '../../services/api';
import { SuperAdminStoreInfo } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

export const SuperAdminView: React.FC<{ onNavigateToView?: (view: string) => void }> = ({ onNavigateToView }) => {
  const { user, store: currentActiveStore, switchStoreContext } = useAuth();
  const [stores, setStores] = useState<SuperAdminStoreInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal Cadastrar Loja
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    storeName: '',
    fantasyName: '',
    corporateReason: '',
    cnpj: '',
    phone: '',
    email: '',
    address: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPhone: '',
  });

  // Success Created Details Modal
  const [createdSummary, setCreatedSummary] = useState<{
    storeName: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchStores = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSuperAdminStores();
      setStores(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar lojas cadastradas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleToggleStoreStatus = async (storeId: string, currentName: string) => {
    try {
      const updated = await api.toggleSuperAdminStoreStatus(storeId);
      setStores((prev) =>
        prev.map((s) => (s.id === storeId ? { ...s, active: updated.active } : s))
      );
      setSuccess(`Status da loja "${currentName}" atualizado para ${updated.active ? 'Ativa' : 'Inativa'}.`);
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar status da loja.');
    }
  };

  const handleSwitchStore = async (storeId: string, storeName: string) => {
    try {
      await switchStoreContext(storeId);
      setSuccess(`Você agora está visualizando a loja "${storeName}".`);
      if (onNavigateToView) {
        onNavigateToView('dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao alternar para a loja.');
    }
  };

  const handleCreateStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.storeName.trim() || !formData.adminName.trim() || !formData.adminEmail.trim() || !formData.adminPassword.trim()) {
      setError('Preencha os campos obrigatórios da loja e do administrador.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createSuperAdminStore({
        storeName: formData.storeName.trim(),
        fantasyName: formData.fantasyName.trim() || formData.storeName.trim(),
        corporateReason: formData.corporateReason.trim() || formData.storeName.trim(),
        cnpj: formData.cnpj.trim() || '00.000.000/0001-00',
        phone: formData.phone.trim(),
        email: formData.email.trim() || formData.adminEmail.trim(),
        address: formData.address.trim() || 'Endereço Comercial',
        adminName: formData.adminName.trim(),
        adminEmail: formData.adminEmail.trim().toLowerCase(),
        adminPassword: formData.adminPassword,
        adminPhone: formData.adminPhone.trim() || formData.phone.trim(),
      });

      // Save summary for confirmation
      setCreatedSummary({
        storeName: res.store.name,
        adminName: res.adminUser.name,
        adminEmail: res.adminUser.email,
        adminPassword: formData.adminPassword,
      });

      setShowCreateModal(false);
      setFormData({
        storeName: '',
        fantasyName: '',
        corporateReason: '',
        cnpj: '',
        phone: '',
        email: '',
        address: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        adminPhone: '',
      });

      await fetchStores();
      setSuccess(`Loja "${res.store.name}" cadastrada com sucesso! Administrador da loja ativado.`);
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar loja.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyText = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalStores = stores.length;
    const activeStores = stores.filter((s) => s.active).length;
    const inactiveStores = totalStores - activeStores;
    const totalEmployees = stores.reduce((acc, s) => acc + (s.employeeCount || 0), 0);
    const totalSales = stores.reduce((acc, s) => acc + (s.salesCount || 0), 0);
    const totalRevenue = stores.reduce((acc, s) => acc + (s.totalRevenue || 0), 0);
    return {
      totalStores,
      activeStores,
      inactiveStores,
      totalEmployees,
      totalSales,
      totalRevenue,
    };
  }, [stores]);

  // Filtered list
  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const matchesSearch =
        store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.fantasyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.cnpj.includes(searchTerm) ||
        (store.adminUser?.name.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (store.adminUser?.email.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      if (!matchesSearch) return false;
      if (statusFilter === 'active') return store.active;
      if (statusFilter === 'inactive') return !store.active;
      return true;
    });
  }, [stores, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                  Super Admin
                </span>
                <span className="text-xs text-slate-400">Acesso Exclusivo</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-white">
                Painel Geral de Lojas
              </h1>
              <p className="text-sm text-slate-300 mt-0.5">
                Controle master da rede Entre Copos Gestão • Visualização de todas as unidades e credenciamento exclusivo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-refresh-stores"
              onClick={fetchStores}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 px-3.5 py-2.5 text-sm font-semibold text-slate-200 border border-slate-700 transition"
              title="Atualizar lista de lojas"
            >
              <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button
              id="btn-open-create-store-modal"
              onClick={() => {
                setError(null);
                setSuccess(null);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition transform active:scale-95"
            >
              <Plus className="h-5 w-5" />
              <span>Cadastrar Nova Loja</span>
            </button>
          </div>
        </div>

        {/* Current user badge */}
        <div className="mt-5 pt-4 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Administrador Geral Logado:</span>
            <span className="font-bold text-amber-300">{user?.email}</span>
            <span className="text-slate-400">({user?.name})</span>
          </div>
          {currentActiveStore && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Loja em Visualização Operacional:</span>
              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {currentActiveStore.fantasyName || currentActiveStore.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center justify-between rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 text-xs font-bold">
            Fechar
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-700 text-xs font-bold">
            Fechar
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Lojas Cadastradas</span>
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
              <StoreIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{metrics.totalStores}</span>
            <span className="text-xs font-semibold text-emerald-600">
              {metrics.activeStores} ativas
            </span>
            {metrics.inactiveStores > 0 && (
              <span className="text-xs font-semibold text-slate-400">
                • {metrics.inactiveStores} inativas
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Funcionários da Rede</span>
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{metrics.totalEmployees}</span>
            <span className="text-xs text-slate-500">operadores / atendentes</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total de Vendas</span>
            <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{metrics.totalSales}</span>
            <span className="text-xs text-slate-500">pedidos concluídos</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Faturamento Global</span>
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {formatCurrency(metrics.totalRevenue)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            id="input-search-stores"
            type="text"
            placeholder="Buscar por nome da loja, CNPJ, nome ou e-mail do administrador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Status:</span>
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas ({stores.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                statusFilter === 'active' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ativas ({metrics.activeStores})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                statusFilter === 'inactive' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inativas ({metrics.inactiveStores})
            </button>
          </div>
        </div>
      </div>

      {/* Stores Grid / Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            <RotateCw className="mx-auto h-8 w-8 animate-spin text-amber-500 mb-3" />
            <p className="text-sm font-semibold">Carregando lojas da rede...</p>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-700">Nenhuma loja encontrada</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm ? 'Tente ajustar os termos da sua pesquisa.' : 'Comece cadastrando a primeira loja da rede Entre Copos.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow hover:bg-amber-400 transition"
              >
                <Plus className="h-4 w-4" />
                Cadastrar Loja Agora
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {filteredStores.map((store) => {
              const isCurrent = currentActiveStore?.id === store.id;
              return (
                <div
                  key={store.id}
                  id={`card-store-${store.id}`}
                  className={`rounded-2xl border bg-white p-5 sm:p-6 shadow-sm transition hover:shadow-md ${
                    isCurrent ? 'border-amber-500/80 ring-2 ring-amber-500/20' : 'border-slate-200'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-black text-base shadow-sm ${
                          store.active
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                      >
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-extrabold text-slate-900">
                            {store.fantasyName || store.name}
                          </h3>
                          {isCurrent && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                              Loja Ativa no Momento
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              store.active
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {store.active ? 'Ativa' : 'Desativada'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Razão Social: <span className="font-medium text-slate-700">{store.corporateReason || store.name}</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">
                          CNPJ: {store.cnpj || 'Não informado'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="my-4 border-t border-slate-100" />

                  {/* Admin da Loja Info Box */}
                  <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-amber-600" />
                        Administrador da Loja (Gestor & Equipe)
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Pode incluir funcionários
                      </span>
                    </div>

                    {store.adminUser ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <span className="font-semibold">{store.adminUser.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono text-[11px] truncate">{store.adminUser.email}</span>
                        </div>
                        {store.adminUser.phone && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{store.adminUser.phone}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-700 italic">Nenhum administrador vinculado a esta unidade.</p>
                    )}
                  </div>

                  {/* Store Operational Stats */}
                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                      <div className="text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1">
                        <Users className="h-3 w-3 text-slate-400" /> Funcionários
                      </div>
                      <div className="text-base font-extrabold text-slate-900 mt-0.5">
                        {store.employeeCount}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                      <div className="text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1">
                        <TrendingUp className="h-3 w-3 text-slate-400" /> Vendas
                      </div>
                      <div className="text-base font-extrabold text-slate-900 mt-0.5">
                        {store.salesCount}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                      <div className="text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1">
                        <DollarSign className="h-3 w-3 text-slate-400" /> Receita
                      </div>
                      <div className="text-sm font-extrabold text-emerald-700 mt-0.5">
                        {formatCurrency(store.totalRevenue || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      Cadastrada em: {formatDate(store.createdAt)}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStoreStatus(store.id, store.fantasyName || store.name)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition ${
                          store.active
                            ? 'border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                            : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                        title={store.active ? 'Desativar loja' : 'Reativar loja'}
                      >
                        <Power className="h-3.5 w-3.5" />
                        <span>{store.active ? 'Desativar' : 'Reativar'}</span>
                      </button>

                      <button
                        onClick={() => handleSwitchStore(store.id, store.fantasyName || store.name)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
                        title="Acessar o módulo operacional desta loja (PDV, Estoque, Vendas)"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Acessar Loja</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Cadastrar Nova Loja */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 my-8 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Cadastrar Nova Loja na Rede</h2>
                  <p className="text-xs text-slate-300">
                    Exclusivo do Administrador Geral • Define a unidade e o administrador da loja
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateStoreSubmit} className="p-6 space-y-6">
              {/* Seção 1: Dados da Loja */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-2 mb-3">
                  <StoreIcon className="h-4 w-4" />
                  1. Dados da Unidade Comercial
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome da Loja / Razão Social *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Entre Copos Conveniência - Unidade Jardins"
                      value={formData.storeName}
                      onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome Fantasia (exibição no PDV)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Entre Copos Jardins"
                      value={formData.fantasyName}
                      onChange={(e) => setFormData({ ...formData, fantasyName: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      CNPJ da Unidade
                    </label>
                    <input
                      type="text"
                      placeholder="00.000.000/0001-00"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Telefone da Loja
                    </label>
                    <input
                      type="text"
                      placeholder="(11) 98888-7777"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Endereço Completo
                    </label>
                    <input
                      type="text"
                      placeholder="Rua, Número, Bairro, Cidade - UF"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Administrador da Loja */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    2. Administrador da Loja (Login & Gestão de Equipe)
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Poderá incluir novos funcionários
                  </span>
                </div>

                <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3 text-xs text-amber-900 mb-3.5">
                  Este usuário será o administrador exclusivo da loja. Com este e-mail e senha, ele acessará a unidade e poderá <strong>incluir funcionários</strong> (operadores de PDV e atendentes).
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome do Administrador da Loja *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: João Silva (Gerente)"
                      value={formData.adminName}
                      onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      E-mail de Login do Administrador *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="admin.jardins@entrecopos.com"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Senha Inicial do Administrador *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Loja@123"
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 font-mono focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Telefone / WhatsApp do Administrador
                    </label>
                    <input
                      type="text"
                      placeholder="(11) 97777-6666"
                      value={formData.adminPhone}
                      onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>

                <button
                  id="btn-submit-create-store"
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-6 py-2.5 text-sm font-bold text-slate-950 shadow-md transition disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RotateCw className="h-4 w-4 animate-spin" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Cadastrar Loja e Administrador</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation of Created Store & Credentials Modal */}
      {createdSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-900">
            <div className="flex items-center gap-3 text-emerald-600 mb-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Loja Cadastrada com Sucesso!</h3>
                <p className="text-xs text-slate-500">Envie as credenciais abaixo para o administrador da nova loja</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3 my-4 text-xs">
              <div>
                <span className="text-slate-500">Unidade:</span>
                <p className="text-sm font-bold text-slate-900">{createdSummary.storeName}</p>
              </div>

              <div>
                <span className="text-slate-500">Nome do Administrador da Loja:</span>
                <p className="font-semibold text-slate-800">{createdSummary.adminName}</p>
              </div>

              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">E-mail de Acesso (Login):</span>
                  <span className="font-mono font-bold text-slate-900">{createdSummary.adminEmail}</span>
                </div>
                <button
                  onClick={() => handleCopyText(createdSummary.adminEmail, 'email')}
                  className="p-1.5 text-slate-500 hover:text-slate-900 transition"
                  title="Copiar e-mail"
                >
                  {copiedField === 'email' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Senha Inicial:</span>
                  <span className="font-mono font-bold text-amber-700">{createdSummary.adminPassword}</span>
                </div>
                <button
                  onClick={() => handleCopyText(createdSummary.adminPassword, 'password')}
                  className="p-1.5 text-slate-500 hover:text-slate-900 transition"
                  title="Copiar senha"
                >
                  {copiedField === 'password' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 mb-5">
              Ao efetuar o login, este administrador terá acesso total à loja e poderá cadastrar funcionários na aba <strong>Funcionários & Permissões</strong>.
            </div>

            <button
              onClick={() => setCreatedSummary(null)}
              className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition"
            >
              Entendido e Concluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
