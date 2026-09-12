import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  DollarSign,
  Printer,
  AlertCircle,
  Clock,
  User,
  CreditCard,
  QrCode,
  ArrowRight,
  History,
  Tag,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Comanda, Product, PaymentMethod, CashRegister, Sale } from '../../types';
import { formatBRL, formatDateTime } from '../../utils/formatters';
import { generateReceiptPdf, generateComandasReportPdf } from '../../utils/pdfGenerator';

export const ComandasView: React.FC<{ onNavigateToCaixa?: () => void }> = ({ onNavigateToCaixa }) => {
  const { store } = useAuth();
  const [openComandas, setOpenComandas] = useState<Comanda[]>([]);
  const [historyComandas, setHistoryComandas] = useState<Comanda[]>([]);
  const [activeTab, setActiveTab] = useState<'open' | 'history'>('open');
  const [products, setProducts] = useState<Product[]>([]);
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New Comanda Modal
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [tableNumber, setTableNumber] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Manage Comanda Detail Modal
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);
  const [productToAddId, setProductToAddId] = useState<string>('');
  const [quantityToAdd, setQuantityToAdd] = useState<number>(1);

  // Close Comanda & Payment Modal
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('DINHEIRO');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [closing, setClosing] = useState<boolean>(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [opens, hist, prods, reg] = await Promise.all([
        api.getOpenComandas(),
        api.getComandasHistory(),
        api.getProducts({ active: true }),
        api.getCurrentCashRegister(),
      ]);
      setOpenComandas(opens);
      setHistoryComandas(hist);
      setProducts(prods);
      setCashRegister(reg);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar comandas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateComanda = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const created = await api.openComanda({
        tableNumber: tableNumber.trim() || undefined,
        clientName: clientName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setOpenComandas([created, ...openComandas]);
      setShowNewModal(false);
      setTableNumber('');
      setClientName('');
      setNotes('');
      // Open detail view right away
      setSelectedComanda(created);
    } catch (err: any) {
      setError(err.message || 'Erro ao abrir comanda.');
    }
  };

  const handleAddItem = async () => {
    if (!selectedComanda || !productToAddId || quantityToAdd <= 0) return;
    setError(null);
    try {
      const updated = await api.addComandaItem(selectedComanda.id, productToAddId, quantityToAdd);
      setSelectedComanda(updated);
      setOpenComandas(openComandas.map((c) => (c.id === updated.id ? updated : c)));
      setProductToAddId('');
      setQuantityToAdd(1);
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar item na comanda.');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!selectedComanda) return;
    setError(null);
    try {
      const updated = await api.removeComandaItem(selectedComanda.id, itemId);
      setSelectedComanda(updated);
      setOpenComandas(openComandas.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err: any) {
      setError(err.message || 'Erro ao remover item da comanda.');
    }
  };

  const handleOpenCloseModal = () => {
    if (!selectedComanda) return;
    if (selectedComanda.items.length === 0) {
      setError('A comanda está vazia. Adicione itens antes de fechá-la.');
      return;
    }
    if (!cashRegister) {
      setError('O caixa está fechado! Abra o caixa para finalizar pagamentos de comandas.');
      return;
    }
    setAmountPaid(selectedComanda.total.toFixed(2));
    setShowCloseModal(true);
  };

  const handleConfirmClose = async () => {
    if (!selectedComanda) return;
    setClosing(true);
    setError(null);
    try {
      const res = await api.closeComanda(selectedComanda.id, {
        paymentMethod,
        amountPaid: Number(amountPaid.replace(',', '.')) || selectedComanda.total,
        discount,
      });

      // Update state
      setOpenComandas(openComandas.filter((c) => c.id !== selectedComanda.id));
      setHistoryComandas([res.comanda, ...historyComandas]);
      setCompletedSale(res.sale);
      setShowCloseModal(false);
      setSelectedComanda(null);
      // Reload products because stock was decremented!
      loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao fechar comanda.');
    } finally {
      setClosing(false);
    }
  };

  const finalAmount = selectedComanda ? Math.max(0, selectedComanda.total - discount) : 0;
  const paidVal = Number(amountPaid.replace(',', '.')) || finalAmount;
  const change = paymentMethod === 'DINHEIRO' ? Math.max(0, paidVal - finalAmount) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Comandas & Mesas
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Gerencie o consumo de mesas e clientes em tempo real sem baixar estoque até o fechamento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {store && (
            <button
              onClick={() => generateComandasReportPdf(store, [...openComandas, ...historyComandas])}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              <span className="hidden sm:inline">Relatório PDF</span>
            </button>
          )}

          <button
            id="btn-new-comanda"
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-4 py-2 text-xs sm:text-sm transition shadow-sm shadow-amber-500/20"
          >
            <Plus className="h-4 w-4" />
            Nova Comanda
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs: Open vs History */}
      <div className="flex border-b border-slate-200">
        <button
          id="tab-comandas-open"
          onClick={() => setActiveTab('open')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold border-b-2 transition ${
            activeTab === 'open'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="h-4 w-4" />
          Comandas em Aberto ({openComandas.length})
        </button>
        <button
          id="tab-comandas-history"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold border-b-2 transition ${
            activeTab === 'history'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="h-4 w-4" />
          Histórico de Fechadas ({historyComandas.length})
        </button>
      </div>

      {/* VIEW 1: OPEN COMANDAS GRID */}
      {activeTab === 'open' && (
        <>
          {openComandas.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <Receipt className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700">Nenhuma comanda aberta no momento</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Clique no botão "Nova Comanda" para abrir o consumo de uma mesa ou cliente.
              </p>
              <button
                onClick={() => setShowNewModal(true)}
                className="mt-4 flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Abrir Comanda
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {openComandas.map((c) => (
                <div
                  key={c.id}
                  id={`card-comanda-${c.id}`}
                  onClick={() => setSelectedComanda(c)}
                  className="cursor-pointer flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-amber-400 hover:shadow-md transition"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        {c.comandaNumber}
                      </span>
                      {c.tableNumber ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-800">
                          Mesa {c.tableNumber}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          Balcão
                        </span>
                      )}
                    </div>

                    <h4 className="mt-2 text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <User className="h-4 w-4 text-slate-400" />
                      {c.clientName || 'Cliente não identificado'}
                    </h4>

                    <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      <span>Aberta em: {formatDateTime(c.openedAt)}</span>
                    </div>

                    <div className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-600">
                      <span className="font-semibold">{c.items.length} itens lançados</span>
                      {c.items.length > 0 && (
                        <p className="truncate text-[11px] text-slate-400 mt-0.5">
                          {c.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Subtotal</span>
                      <p className="text-base font-black text-amber-600">{formatBRL(c.total)}</p>
                    </div>
                    <button className="flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800">
                      Gerenciar <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* VIEW 2: HISTORY COMANDAS */}
      {activeTab === 'history' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3">Comanda</th>
                <th className="px-4 py-3">Mesa / Cliente</th>
                <th className="px-4 py-3">Abertura</th>
                <th className="px-4 py-3">Fechamento</th>
                <th className="px-4 py-3">Atendente</th>
                <th className="px-4 py-3 text-right">Valor Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyComandas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma comanda fechada encontrada no histórico.
                  </td>
                </tr>
              ) : (
                historyComandas.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">
                      {c.comandaNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">
                        {c.tableNumber ? `Mesa ${c.tableNumber}` : 'Balcão'}
                      </div>
                      <div className="text-[11px] text-slate-400">{c.clientName || 'Cliente sem nome'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(c.openedAt)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(c.closedAt)}</td>
                    <td className="px-4 py-3 text-slate-600">{c.openedByUserName}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                      {formatBRL(c.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: NOVA COMANDA */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Abertura de Nova Comanda
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateComanda} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número da Mesa (opcional)
                </label>
                <input
                  id="input-comanda-mesa"
                  type="text"
                  placeholder="Ex: 01, 12, Varanda"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Cliente (opcional)
                </label>
                <input
                  id="input-comanda-cliente"
                  type="text"
                  placeholder="Ex: Carlos, Ana Silva"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observações
                </label>
                <textarea
                  placeholder="Ex: Comanda do deck externo"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
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
                  id="btn-submit-comanda"
                  type="submit"
                  className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-2.5 text-xs transition shadow-md"
                >
                  Abrir Comanda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MANAGE COMANDA ITEMS & DETAIL */}
      {selectedComanda && !showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Comanda {selectedComanda.comandaNumber}
                  </h3>
                  {selectedComanda.tableNumber && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                      Mesa {selectedComanda.tableNumber}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cliente: {selectedComanda.clientName || 'Balcão'} • Atendente: {selectedComanda.openedByUserName}
                </p>
              </div>

              <button
                onClick={() => setSelectedComanda(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Notice about stock */}
            <div className="rounded-xl bg-blue-50/80 border border-blue-200 p-2.5 text-[11px] text-blue-700">
              💡 <strong>Consumo em aberto:</strong> Os itens adicionados aqui calculam o subtotal em tempo real, mas o estoque <strong>NÃO é baixado</strong> até o fechamento e pagamento da comanda.
            </div>

            {/* Add Product Section */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col sm:flex-row gap-2 items-center">
              <div className="flex-1 w-full">
                <select
                  id="select-comanda-produto"
                  value={productToAddId}
                  onChange={(e) => setProductToAddId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Selecione um produto para lançar...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.currentStock <= 0}>
                      {p.name} - {formatBRL(p.sellPrice)} (Estoque: {p.currentStock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="number"
                  min="1"
                  value={quantityToAdd}
                  onChange={(e) => setQuantityToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs text-center font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                />
                <button
                  id="btn-add-item-comanda"
                  onClick={handleAddItem}
                  disabled={!productToAddId}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                  Lançar Item
                </button>
              </div>
            </div>

            {/* Items Table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="px-3 py-2">Produto</th>
                    <th className="px-3 py-2 text-center">Qtd</th>
                    <th className="px-3 py-2 text-right">Unitário</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                    <th className="px-3 py-2 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedComanda.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Nenhum item lançado ainda nesta comanda.
                      </td>
                    </tr>
                  ) : (
                    selectedComanda.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2.5 font-semibold text-slate-800">
                          {item.productName}
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-600">
                          {formatBRL(item.unitPrice)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-extrabold text-slate-900">
                          {formatBRL(item.subtotal)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Remover item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer with Subtotal & Close Comanda Button */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <div>
                <span className="text-xs text-slate-500 font-medium">Total da Comanda:</span>
                <p className="text-xl font-black text-amber-600">{formatBRL(selectedComanda.total)}</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedComanda(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Salvar e Fechar Janela
                </button>
                <button
                  id="btn-open-close-comanda"
                  disabled={selectedComanda.items.length === 0}
                  onClick={handleOpenCloseModal}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-md disabled:opacity-40"
                >
                  <DollarSign className="h-4 w-4" />
                  Fechar Comanda e Receber
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: FECHAR COMANDA & RECEBIMENTO */}
      {showCloseModal && selectedComanda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Fechar Comanda {selectedComanda.comandaNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedComanda.tableNumber ? `Mesa ${selectedComanda.tableNumber}` : 'Balcão'} • {selectedComanda.items.length} itens
                </p>
              </div>
              <span className="text-xl font-black text-amber-600">{formatBRL(finalAmount)}</span>
            </div>

            {/* Payment Method Select */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'DINHEIRO', label: 'Dinheiro', icon: DollarSign },
                { id: 'PIX', label: 'Pix', icon: QrCode },
                { id: 'DEBITO', label: 'Débito', icon: CreditCard },
                { id: 'CREDITO', label: 'Crédito', icon: CreditCard },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = paymentMethod === item.id;
                return (
                  <button
                    key={item.id}
                    id={`comanda-pay-${item.id}`}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(item.id as PaymentMethod);
                      if (item.id !== 'DINHEIRO') setAmountPaid(finalAmount.toFixed(2));
                    }}
                    className={`flex flex-col items-center justify-center rounded-xl p-3 border text-xs font-bold transition ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-5 w-5 mb-1 text-slate-700" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Discount input */}
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span className="font-semibold">Desconto (R$):</span>
              <input
                type="number"
                min="0"
                max={selectedComanda.total}
                step="0.50"
                value={discount === 0 ? '' : discount}
                placeholder="0,00"
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                className="w-24 text-right rounded-lg border border-slate-300 px-2 py-1 font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Cash details */}
            {paymentMethod === 'DINHEIRO' && (
              <div className="space-y-2 rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">Valor Recebido (R$):</span>
                  <input
                    id="input-comanda-paid"
                    type="number"
                    step="0.50"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-28 text-right rounded-lg border border-slate-300 px-2 py-1 font-black text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-700">Troco:</span>
                  <span className="font-black text-emerald-600 text-sm">{formatBRL(change)}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                Voltar
              </button>
              <button
                id="btn-confirm-close-comanda"
                type="button"
                disabled={closing || (paymentMethod === 'DINHEIRO' && paidVal < finalAmount)}
                onClick={handleConfirmClose}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white transition shadow-md disabled:opacity-50"
              >
                {closing ? 'Fechando...' : 'Confirmar Fechamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: COMANDA CLOSED & RECEIPT DOWNLOAD */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-1">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">Comanda Fechada com Sucesso!</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Venda gerada: {completedSale.saleNumber} • Estoque baixado
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-left space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Valor Final:</span>
                <span className="font-extrabold text-slate-900">{formatBRL(completedSale.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pagamento:</span>
                <span className="font-bold text-slate-900">{completedSale.paymentMethod}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {store && (
                <button
                  id="btn-comanda-print-receipt"
                  onClick={() => generateReceiptPdf(store, completedSale)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-xs transition shadow-sm"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir / Baixar Cupom
                </button>
              )}

              <button
                onClick={() => setCompletedSale(null)}
                className="rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
