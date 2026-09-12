import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Printer,
  FileText,
  Calendar,
  DollarSign,
  Receipt,
  User,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Sale } from '../../types';
import { formatBRL, formatDateTime } from '../../utils/formatters';
import { generateSalesReportPdf, generateReceiptPdf } from '../../utils/pdfGenerator';

export const VendasView: React.FC = () => {
  const { store } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [origin, setOrigin] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // View Sale Details Modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const loadSales = async () => {
    setLoading(true);
    try {
      const data = await api.getSales({
        origin: origin || undefined,
        paymentMethod: paymentMethod || undefined,
      });
      setSales(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar histórico de vendas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [origin, paymentMethod]);

  const filteredSales = sales.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.saleNumber.toLowerCase().includes(q) ||
      s.userName.toLowerCase().includes(q) ||
      (s.clientName && s.clientName.toLowerCase().includes(q))
    );
  });

  const totalFilteredRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Histórico de Vendas
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Consulte todas as operações finalizadas via PDV balcão e comandas de mesas.
          </p>
        </div>

        {store && (
          <button
            id="btn-pdf-sales-report"
            onClick={() => generateSalesReportPdf(store, filteredSales)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 text-xs sm:text-sm transition shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Gerar Relatório PDF
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            id="search-sales-input"
            type="text"
            placeholder="Buscar por número de venda, operador ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            id="filter-sales-origin"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="">Todas as Origens</option>
            <option value="PDV">Venda Balcão (PDV)</option>
            <option value="COMANDA">Comanda / Mesa</option>
          </select>

          <select
            id="filter-sales-payment"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="">Todas as Formas</option>
            <option value="DINHEIRO">Dinheiro</option>
            <option value="PIX">Pix</option>
            <option value="DEBITO">Débito</option>
            <option value="CREDITO">Crédito</option>
          </select>

          <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 border border-slate-200">
            Total: {formatBRL(totalFilteredRevenue)} ({filteredSales.length})
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3">Nº Venda</th>
                <th className="px-4 py-3">Data / Hora</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Operador</th>
                <th className="px-4 py-3">Pagamento</th>
                <th className="px-4 py-3 text-center">Itens</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                <th className="px-4 py-3 text-right">Desconto</th>
                <th className="px-4 py-3 text-right">Total Líquido</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    Nenhuma venda encontrada para os critérios selecionados.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {s.saleNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatDateTime(s.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          s.origin === 'PDV'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {s.origin === 'PDV' ? 'PDV Balcão' : `Comanda ${s.comandaNumber || ''}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{s.userName}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{s.paymentMethod}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700">
                      {s.items?.length || 0}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatBRL(s.subtotal)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {s.discount > 0 ? formatBRL(s.discount) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                      {formatBRL(s.total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedSale(s)}
                          className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          title="Visualizar itens"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {store && (
                          <button
                            onClick={() => generateReceiptPdf(store, s)}
                            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title="Reimprimir cupom não-fiscal"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: SALE DETAIL */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Detalhes da Venda {selectedSale.saleNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  {formatDateTime(selectedSale.createdAt)} • {selectedSale.userName}
                </p>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 text-xs">
              {selectedSale.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5"
                >
                  <div>
                    <p className="font-bold text-slate-800">{item.productName}</p>
                    <p className="text-[11px] text-slate-400">
                      {item.quantity} x {formatBRL(item.unitPrice)}
                    </p>
                  </div>
                  <span className="font-extrabold text-slate-900">
                    {formatBRL(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial summary */}
            <div className="rounded-xl bg-slate-50 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{formatBRL(selectedSale.subtotal)}</span>
              </div>
              {selectedSale.discount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Desconto:</span>
                  <span>- {formatBRL(selectedSale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                <span>Total Pago:</span>
                <span className="text-amber-600">{formatBRL(selectedSale.total)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>Forma de Pagamento:</span>
                <span className="font-bold text-slate-700">{selectedSale.paymentMethod}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {store && (
                <button
                  onClick={() => generateReceiptPdf(store, selectedSale)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-xs transition"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir Cupom
                </button>
              )}
              <button
                onClick={() => setSelectedSale(null)}
                className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
