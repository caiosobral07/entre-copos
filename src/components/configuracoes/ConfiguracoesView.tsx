import React, { useState, useEffect } from 'react';
import {
  Store,
  Building,
  Save,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
  ArrowRightLeft,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { formatCNPJ, formatPhone } from '../../utils/formatters';

export const ConfiguracoesView: React.FC = () => {
  const { store, updateStoreProfile } = useAuth();
  const [storesList, setStoresList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form
  const [formData, setFormData] = useState({
    name: '',
    corporateReason: '',
    cnpj: '',
    phone: '',
    address: '',
  });

  // New Store Modal
  const [showNewStoreModal, setShowNewStoreModal] = useState<boolean>(false);
  const [newStoreName, setNewStoreName] = useState<string>('');
  const [newStoreCnpj, setNewStoreCnpj] = useState<string>('');
  const [newStoreEmail, setNewStoreEmail] = useState<string>('');
  const [newStorePass, setNewStorePass] = useState<string>('');

  const loadStores = async () => {
    try {
      const data = await api.getStores();
      setStoresList(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || '',
        corporateReason: store.corporateReason || '',
        cnpj: store.cnpj || '',
        phone: store.phone || '',
        address: store.address || '',
      });
    }
  }, [store]);

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    setLoading(true);
    setError(null);
    try {
      await updateStoreProfile(formData);
      await loadStores();
      setSuccess('Dados da conveniência atualizados com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar dados da loja.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim() || !newStoreEmail.trim() || !newStorePass.trim()) {
      setError('Preencha nome da nova loja, e-mail do admin e senha.');
      return;
    }
    setError(null);
    try {
      await api.register({
        storeName: newStoreName.trim(),
        cnpj: newStoreCnpj.trim() || undefined,
        adminName: `Admin ${newStoreName.trim()}`,
        email: newStoreEmail.trim(),
        password: newStorePass.trim(),
      });

      await loadStores();
      setShowNewStoreModal(false);
      setNewStoreName('');
      setNewStoreCnpj('');
      setNewStoreEmail('');
      setNewStorePass('');
      setSuccess(`Nova loja/filial "${newStoreName}" cadastrada com sucesso!`);
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar nova loja.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Configurações da Empresa & Multi-Lojas
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Parâmetros cadastrais da sua conveniência e gestão multi-tenant com isolamento total de dados.
          </p>
        </div>

        <button
          id="btn-modal-new-store"
          onClick={() => setShowNewStoreModal(true)}
          className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 text-xs sm:text-sm transition shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Cadastrar Nova Filial / Loja
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Multi-store Switcher Card */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-600" />
              Ambiente Multi-Lojas Ativo (Isolamento por Loja)
            </h3>
            <p className="text-xs text-slate-600">
              Cada loja possui seu próprio banco de dados isolado de produtos, estoque, vendas e contas a pagar.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Loja em Operação:</span>
            <div className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{store?.name || 'Loja Principal'}</span>
            </div>
          </div>
        </div>

        {storesList.length > 1 && (
          <div className="pt-2 border-t border-amber-200/60">
            <span className="text-[11px] font-bold text-slate-700">Todas as lojas ativas no sistema:</span>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {storesList.map((s) => (
                <span
                  key={s.id}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold border ${
                    s.id === store?.id
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {s.name} {s.cnpj ? `(${s.cnpj})` : ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Store Data Form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3 mb-4 flex items-center gap-2">
          <Store className="h-4 w-4 text-slate-500" />
          Dados Cadastrais da Loja Selecionada
        </h3>

        <form onSubmit={handleSaveStore} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome Fantasia da Conveniência *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Razão Social
              </label>
              <input
                type="text"
                value={formData.corporateReason}
                onChange={(e) => setFormData({ ...formData, corporateReason: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                CNPJ (Exibido nos Cupons e Relatórios)
              </label>
              <input
                type="text"
                placeholder="12.345.678/0001-90"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Telefone / WhatsApp Comercial
              </label>
              <input
                type="text"
                placeholder="(11) 98765-4321"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Endereço Completo
              </label>
              <input
                type="text"
                placeholder="Av. Paulista, 1000 - Bela Vista"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cidade
              </label>
              <input
                type="text"
                placeholder="São Paulo"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Estado (UF)
              </label>
              <input
                type="text"
                maxLength={2}
                placeholder="SP"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none uppercase font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mensagem do Rodapé do Cupom de Venda Não-Fiscal
              </label>
              <input
                type="text"
                placeholder="Ex: Obrigado pela preferência! Volte sempre!"
                value={formData.receiptFooterMessage}
                onChange={(e) => setFormData({ ...formData, receiptFooterMessage: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              id="btn-save-store-settings"
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-6 py-2.5 text-xs sm:text-sm transition shadow-sm"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>

      {/* Architecture & Security Info */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Database className="h-4 w-4 text-slate-500" />
          Arquitetura e Segurança do Banco de Dados
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
            <span className="font-bold text-slate-800 block">Persistência Concorrente</span>
            <p className="text-[11px] text-slate-500 mt-1">
              Operações atômicas com bloqueio (mutex) para proteção contra concorrência e race condition nas vendas e estoque.
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
            <span className="font-bold text-slate-800 block">Isolamento Multi-Tenant</span>
            <p className="text-[11px] text-slate-500 mt-1">
              Cada requisição valida o identificador da loja (storeId) no cabeçalho e no token JWT para blindagem total.
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
            <span className="font-bold text-slate-800 block">Criptografia de Acesso</span>
            <p className="text-[11px] text-slate-500 mt-1">
              Senhas criptografadas com hash PBKDF2/SHA512 e 100.000 iterações com salt único por usuário.
            </p>
          </div>
        </div>
      </div>

      {/* MODAL: NOVA LOJA */}
      {showNewStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Cadastrar Nova Filial / Loja
              </h3>
              <button
                onClick={() => setShowNewStoreModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewStore} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome da Nova Loja / Filial *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Conveniência Posto Jardins - Filial 02"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  CNPJ da Filial
                </label>
                <input
                  type="text"
                  placeholder="00.000.000/0002-00"
                  value={newStoreCnpj}
                  onChange={(e) => setNewStoreCnpj(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail do Administrador da Filial *
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@filial.com"
                  value={newStoreEmail}
                  onChange={(e) => setNewStoreEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Senha do Administrador *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newStorePass}
                  onChange={(e) => setNewStorePass(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewStoreModal(false)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-xs transition shadow-md"
                >
                  Cadastrar Loja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
