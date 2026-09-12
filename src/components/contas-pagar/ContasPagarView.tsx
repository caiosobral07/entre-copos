import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Check,
  Building,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import { AccountPayable, Supplier } from '../../types';
import { formatBRL, formatDate, formatDateTime } from '../../utils/formatters';

export const ContasPagarView: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountPayable[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New modal
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    supplierName: '',
    supplierId: '',
    description: '',
    amount: '',
    dueDate: '',
    notes: '',
  });

  // Pay modal
  const [showPayModal, setShowPayModal] = useState<boolean>(false);
  const [payingAccount, setPayingAccount] = useState<AccountPayable | null>(null);
  const [payMethod, setPayMethod] = useState<string>('PIX');
  const [payNotes, setPayNotes] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [accs, sups] = await Promise.all([
        api.getAccountsPayable({ filter }),
        api.getSuppliers(),
      ]);
      setAccounts(accs);
      setSuppliers(sups);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar contas a pagar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter]);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount.replace(',', '.'));
    if (!amount || amount <= 0 || !formData.description.trim() || !formData.dueDate) {
      setError('Preencha os campos obrigatórios (descrição, valor e vencimento).');
      return;
    }
    setError(null);
    try {
      const selectedSup = suppliers.find((s) => s.id === formData.supplierId);
      const created = await api.createAccountPayable({
        supplierName: selectedSup?.name || formData.supplierName.trim() || 'Despesa Geral',
        supplierId: formData.supplierId || undefined,
        description: formData.description.trim(),
        amount,
        dueDate: formData.dueDate,
        notes: formData.notes.trim() || undefined,
      });

      setAccounts([created, ...accounts]);
      setShowNewModal(false);
      setFormData({
        supplierName: '',
        supplierId: '',
        description: '',
        amount: '',
        dueDate: '',
        notes: '',
      });
      setSuccess('Conta a pagar cadastrada com sucesso.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar conta.');
    }
  };

  const handlePayAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingAccount) return;
    setError(null);
    try {
      const updated = await api.payAccountPayable(payingAccount.id, {
        paymentMethod: payMethod,
        notes: payNotes.trim() || undefined,
      });

      setAccounts(accounts.map((a) => (a.id === updated.id ? updated : a)));
      setShowPayModal(false);
      setPayingAccount(null);
      setSuccess(`Conta "${updated.description}" marcada como PAGA!`);
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Erro ao liquidar conta.');
    }
  };

  // Metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const pendingAccounts = accounts.filter((a) => a.status === 'PENDENTE' || a.status === 'VENCIDO');
  const overdueAccounts = accounts.filter(
    (a) => (a.status === 'PENDENTE' || a.status === 'VENCIDO') && a.dueDate < todayStr
  );
  const dueTodayAccounts = accounts.filter(
    (a) => (a.status === 'PENDENTE' || a.status === 'VENCIDO') && a.dueDate.startsWith(todayStr)
  );
  const paidAccounts = accounts.filter((a) => a.status === 'PAGO');

  const totalPending = pendingAccounts.reduce((acc, a) => acc + a.amount, 0);
  const totalOverdue = overdueAccounts.reduce((acc, a) => acc + a.amount, 0);
  const totalDueToday = dueTodayAccounts.reduce((acc, a) => acc + a.amount, 0);
  const totalPaid = paidAccounts.reduce((acc, a) => acc + a.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Contas a Pagar & Despesas
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Gestão de compromissos financeiros e faturas de fornecedores (Acesso Restrito ao Administrador).
          </p>
        </div>

        <button
          id="btn-new-account-payable"
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 text-xs sm:text-sm transition shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nova Conta a Pagar
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

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Vencendo Hoje</span>
          <p className="mt-2 text-xl font-bold text-slate-900">
            {formatBRL(totalDueToday)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{dueTodayAccounts.length} faturas</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
          <span className="text-xs font-bold text-rose-800">Contas Vencidas</span>
          <p className="mt-2 text-xl font-bold text-rose-900">
            {formatBRL(totalOverdue)}
          </p>
          <p className="text-[11px] text-rose-700 mt-1">{overdueAccounts.length} em atraso</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <span className="text-xs font-bold text-amber-800">Total a Pagar (Pendente)</span>
          <p className="mt-2 text-xl font-bold text-amber-900">
            {formatBRL(totalPending)}
          </p>
          <p className="text-[11px] text-amber-700 mt-1">{pendingAccounts.length} títulos</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <span className="text-xs font-bold text-emerald-800">Total Pago Liquidado</span>
          <p className="mt-2 text-xl font-bold text-emerald-900">
            {formatBRL(totalPaid)}
          </p>
          <p className="text-[11px] text-emerald-700 mt-1">{paidAccounts.length} pagamentos</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {[
          { id: 'all', label: 'Todas as Contas' },
          { id: 'hoje', label: 'Vencendo Hoje' },
          { id: 'proximos7dias', label: 'Próximos 7 Dias' },
          { id: 'vencidas', label: 'Em Atraso (Vencidas)' },
          { id: 'pagas', label: 'Liquidadas (Pagas)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              filter === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3">Fornecedor / Favorecido</th>
                <th className="px-4 py-3">Descrição da Despesa</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Pagamento</th>
                <th className="px-4 py-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    Nenhuma conta a pagar encontrada para este filtro.
                  </td>
                </tr>
              ) : (
                accounts.map((a) => {
                  const isOverdue =
                    (a.status === 'PENDENTE' || a.status === 'VENCIDO') && a.dueDate < todayStr;
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {a.supplierName}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {a.description}
                        {a.notes && <div className="text-[10px] text-slate-400">{a.notes}</div>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'
                          }`}
                        >
                          {formatDate(a.dueDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                        {formatBRL(a.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                            a.status === 'PAGO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : isOverdue
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {a.status === 'PAGO' ? 'PAGO' : isOverdue ? 'VENCIDO' : 'PENDENTE'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {a.paidAt ? (
                          <div>
                            <div>{formatDate(a.paidAt)}</div>
                            <div className="font-semibold text-slate-700">{a.paymentMethod}</div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.status !== 'PAGO' && (
                          <button
                            id={`btn-pay-account-${a.id}`}
                            onClick={() => {
                              setPayingAccount(a);
                              setShowPayModal(true);
                            }}
                            className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 text-[11px] transition"
                          >
                            <Check className="h-3 w-3" />
                            Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: NOVA CONTA */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Lançar Conta a Pagar
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fornecedor Cadastrado
                </label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Selecione ou digite abaixo...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {!formData.supplierId && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome do Favorecido / Empresa
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Enel Energia Elétrica, Sabesp, Aluguel"
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descrição da Despesa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fatura Cervejas Ambev NF 4589"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valor a Pagar (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observações
                </label>
                <input
                  type="text"
                  placeholder="Ex: Boleto com código de barras enviado por email"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-xs transition shadow-md"
                >
                  Gravar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LIQUIDAR / PAGAR CONTA */}
      {showPayModal && payingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Confirmar Pagamento
              </h3>
              <button
                onClick={() => setShowPayModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePayAccount} className="space-y-3.5">
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs space-y-1">
                <p className="font-bold text-slate-800">{payingAccount.description}</p>
                <p className="text-slate-500">Favorecido: {payingAccount.supplierName}</p>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-600">Valor a Liquidar:</span>
                  <span className="text-base font-black text-emerald-600">
                    {formatBRL(payingAccount.amount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Forma de Pagamento Utilizada *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                >
                  <option value="PIX">Pix (Transferência Instantânea)</option>
                  <option value="BOLETO">Boleto Bancário</option>
                  <option value="TRANSFERENCIA">Transferência Bancária / TED</option>
                  <option value="DINHEIRO">Dinheiro da Gaveta</option>
                  <option value="CARTAO">Cartão Corporativo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Comprovante / Observações do Pagamento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pago via app Nubank / Cód. Aut: 884729"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs transition shadow-md"
                >
                  Confirmar Quitação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
