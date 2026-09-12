import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  SlidersHorizontal,
  AlertTriangle,
  XCircle,
  Clock,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Search,
  Filter,
  Printer,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Product, StockMovement, Supplier } from '../../types';
import { formatBRL, formatDateTime } from '../../utils/formatters';
import { generateInventoryReportPdf } from '../../utils/pdfGenerator';

export const EstoqueView: React.FC = () => {
  const { isAdmin, store } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals
  const [showEntryModal, setShowEntryModal] = useState<boolean>(false);
  const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false);

  // Form Entry
  const [entryProductId, setEntryProductId] = useState<string>('');
  const [entryQuantity, setEntryQuantity] = useState<number>(10);
  const [entryCost, setEntryCost] = useState<string>('');
  const [entrySupplier, setEntrySupplier] = useState<string>('');
  const [entryReason, setEntryReason] = useState<string>('Compra de Fornecedor');

  // Form Adjust
  const [adjustProductId, setAdjustProductId] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'ENTRADA' | 'SAIDA'>('SAIDA');
  const [adjustQuantity, setAdjustQuantity] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Filter
  const [movementSearch, setMovementSearch] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, moves, sum] = await Promise.all([
        api.getProducts(),
        api.getStockMovements(),
        api.getStockSummary(),
      ]);
      setProducts(prods);
      setMovements(moves);
      setSummary(sum);

      if (isAdmin) {
        const sups = await api.getSuppliers();
        setSuppliers(sups);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do estoque.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStockEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryProductId || entryQuantity <= 0) return;
    setError(null);
    try {
      await api.stockEntry({
        productId: entryProductId,
        quantity: entryQuantity,
        costPrice: entryCost ? parseFloat(entryCost.replace(',', '.')) : undefined,
        supplierId: entrySupplier || undefined,
        reason: entryReason,
      });

      setSuccess(`Entrada de estoque realizada com sucesso!`);
      setShowEntryModal(false);
      setEntryProductId('');
      setEntryQuantity(10);
      setEntryCost('');
      loadData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar entrada de estoque.');
    }
  };

  const handleStockAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProductId || adjustQuantity <= 0 || !adjustReason.trim()) {
      setError('Informe o produto, quantidade e o motivo obrigatório do ajuste.');
      return;
    }
    setError(null);
    try {
      await api.stockAdjust({
        productId: adjustProductId,
        type: adjustType,
        quantity: adjustQuantity,
        reason: adjustReason.trim(),
      });

      setSuccess(`Ajuste manual de estoque registrado.`);
      setShowAdjustModal(false);
      setAdjustProductId('');
      setAdjustQuantity(1);
      setAdjustReason('');
      loadData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar ajuste de estoque.');
    }
  };

  const filteredMovements = movements.filter((m) => {
    if (!movementSearch) return true;
    const q = movementSearch.toLowerCase();
    return (
      m.productName.toLowerCase().includes(q) ||
      m.type.toLowerCase().includes(q) ||
      m.userName.toLowerCase().includes(q) ||
      (m.reason && m.reason.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Controle de Estoque & Reposição
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Gerencie entradas de notas, ajustes manuais com motivo e histórico de movimentações.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {store && (
            <button
              onClick={() => generateInventoryReportPdf(store, products)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              <span className="hidden sm:inline">Relatório PDF</span>
            </button>
          )}

          {isAdmin && (
            <button
              id="btn-stock-adjust"
              onClick={() => setShowAdjustModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              <SlidersHorizontal className="h-4 w-4 text-slate-600" />
              Ajuste Manual
            </button>
          )}

          <button
            id="btn-stock-entry"
            onClick={() => setShowEntryModal(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 text-xs sm:text-sm transition shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Entrada de Mercadorias
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Produtos Cadastrados</span>
            <Boxes className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900">
            {summary?.totalRegistered || products.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Total no catálogo</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">Estoque Baixo</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-xl font-bold text-amber-900">
            {summary?.lowStockCount || 0}
          </p>
          <p className="text-[11px] text-amber-700 mt-1">Abaixo do estoque mínimo</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800">Estoque Zerado</span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-xl font-bold text-rose-900">
            {summary?.outOfStockCount || 0}
          </p>
          <p className="text-[11px] text-rose-700 mt-1">Sem nenhuma unidade</p>
        </div>

        {isAdmin ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Valor em Estoque</span>
              <DollarSign className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatBRL(summary?.totalStockValue)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">A preço de custo</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Itens Críticos</span>
              <Clock className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {(summary?.lowStockCount || 0) + (summary?.outOfStockCount || 0)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Necessitam reposição</p>
          </div>
        )}
      </div>

      {/* Movements Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold text-slate-900">
            Histórico de Movimentações de Estoque
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar histórico..."
              value={movementSearch}
              onChange={(e) => setMovementSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
              <tr>
                <th className="px-3 py-2.5">Data/Hora</th>
                <th className="px-3 py-2.5">Produto</th>
                <th className="px-3 py-2.5 text-center">Tipo</th>
                <th className="px-3 py-2.5 text-center">Qtd</th>
                <th className="px-3 py-2.5 text-center">Saldo Ant.</th>
                <th className="px-3 py-2.5 text-center">Novo Saldo</th>
                <th className="px-3 py-2.5">Responsável</th>
                <th className="px-3 py-2.5">Motivo / Origem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Nenhuma movimentação registrada.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => {
                  const isPositive = m.type === 'ENTRADA' || (m.type === 'AJUSTE' && m.quantity > 0);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                        {formatDateTime(m.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-slate-800">
                        {m.productName}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            m.type === 'ENTRADA'
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.type === 'VENDA'
                              ? 'bg-blue-100 text-blue-800'
                              : m.type === 'AJUSTE'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold">
                        <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                          {isPositive ? `+${m.quantity}` : `-${m.quantity}`}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-500">
                        {m.previousStock}
                      </td>
                      <td className="px-3 py-2.5 text-center font-extrabold text-slate-900">
                        {m.currentStock}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {m.userName}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {m.reason || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ENTRADA DE ESTOQUE */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Entrada de Mercadoria no Estoque
              </h3>
              <button
                onClick={() => setShowEntryModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStockEntry} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Produto *
                </label>
                <select
                  id="select-entry-product"
                  required
                  value={entryProductId}
                  onChange={(e) => setEntryProductId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Selecione o produto...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Atual: {p.currentStock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Quantidade Entrada *
                  </label>
                  <input
                    id="input-entry-qty"
                    type="number"
                    min="1"
                    required
                    value={entryQuantity}
                    onChange={(e) => setEntryQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {isAdmin && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Custo Unitário (R$)
                    </label>
                    <input
                      id="input-entry-cost"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={entryCost}
                      onChange={(e) => setEntryCost(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {isAdmin && suppliers.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fornecedor
                  </label>
                  <select
                    value={entrySupplier}
                    onChange={(e) => setEntrySupplier(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">Nenhum / Não informado</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo / Observação
                </label>
                <input
                  type="text"
                  value={entryReason}
                  onChange={(e) => setEntryReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-stock-entry"
                  type="submit"
                  className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-xs transition shadow-md"
                >
                  Confirmar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AJUSTE MANUAL DE ESTOQUE (ADMIN ONLY) */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Ajuste Manual de Estoque (Auditoria)
              </h3>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStockAdjust} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Produto *
                </label>
                <select
                  id="select-adjust-product"
                  required
                  value={adjustProductId}
                  onChange={(e) => setAdjustProductId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Selecione o produto a ajustar...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Saldo Atual: {p.currentStock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Ajuste *
                  </label>
                  <select
                    id="select-adjust-type"
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="SAIDA">Saída / Perda / Avaria</option>
                    <option value="ENTRADA">Entrada / Contagem Sobra</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Quantidade *
                  </label>
                  <input
                    id="input-adjust-qty"
                    type="number"
                    min="1"
                    required
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo Obrigatório *
                </label>
                <input
                  id="input-adjust-reason"
                  type="text"
                  required
                  placeholder="Ex: Produto quebrado no transporte, contagem de inventário, etc."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-adjust"
                  type="submit"
                  className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 text-xs transition shadow-md"
                >
                  Gravar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
