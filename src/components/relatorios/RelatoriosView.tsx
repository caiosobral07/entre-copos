import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Download,
  DollarSign,
  TrendingUp,
  Package,
  Calendar,
  Layers,
  Receipt,
  Boxes,
  Percent,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Product, Sale, Comanda, AccountPayable } from '../../types';
import { formatBRL } from '../../utils/formatters';
import {
  generateSalesReportPdf,
  generateComandasReportPdf,
  generateInventoryReportPdf,
  generateProductsProfitReportPdf,
} from '../../utils/pdfGenerator';

export const RelatoriosView: React.FC = () => {
  const { isAdmin, store } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [profitData, setProfitData] = useState<any[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [comandas, setComandas] = useState<Comanda[]>([]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [prods, sls, coms] = await Promise.all([
        api.getProducts(),
        api.getSales(),
        api.getComandasHistory(),
      ]);
      setProducts(prods);
      setSales(sls);
      setComandas(coms);

      if (isAdmin) {
        const pReport = await api.getProductsProfitReport();
        setProfitData(pReport);
      }
    } catch (err) {
      console.error('Erro ao carregar dados de relatórios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const totalRevenue = profitData.reduce((acc, i) => acc + i.revenue, 0);
  const totalCost = profitData.reduce((acc, i) => acc + i.cost, 0);
  const totalProfit = profitData.reduce((acc, i) => acc + i.estimatedGrossProfit, 0);
  const grossMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900">
          Central de Relatórios Gerenciais & PDF
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Gere relatórios profissionais em formato PDF padronizado A4 com cabeçalho, CNPJ, paginação e formatação brasileira.
        </p>
      </div>

      {/* Quick Action PDF Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Relatório de Vendas */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-3">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Relatório de Vendas</h3>
            <p className="text-xs text-slate-500 mt-1">
              Listagem consolidada de todas as vendas, formas de pagamento, operadores e totais líquidos.
            </p>
          </div>
          <button
            id="btn-pdf-rel-vendas"
            onClick={() => store && generateSalesReportPdf(store, sales, 'Histórico Geral')}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-xs transition shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Baixar PDF Vendas
          </button>
        </div>

        {/* Card 2: Relatório de Estoque */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mb-3">
              <Boxes className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Relatório de Estoque</h3>
            <p className="text-xs text-slate-500 mt-1">
              Posição de estoque de todos os produtos, unidades, status de estoque mínimo e reposição.
            </p>
          </div>
          <button
            id="btn-pdf-rel-estoque"
            onClick={() => store && generateInventoryReportPdf(store, products)}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-xs transition shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Baixar PDF Estoque
          </button>
        </div>

        {/* Card 3: Relatório de Comandas */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 mb-3">
              <Receipt className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Relatório de Comandas</h3>
            <p className="text-xs text-slate-500 mt-1">
              Detalhamento de mesas, comandas abertas, fechamentos e faturamento de consumo.
            </p>
          </div>
          <button
            id="btn-pdf-rel-comandas"
            onClick={() => store && generateComandasReportPdf(store, comandas)}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-xs transition shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Baixar PDF Comandas
          </button>
        </div>

        {/* Card 4: Lucro Bruto Estimado (Admin Only) */}
        {isAdmin && (
          <div className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm hover:shadow-md transition">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white mb-3 shadow-sm">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Lucro Bruto Estimado</h3>
              <p className="text-xs text-slate-600 mt-1">
                Demonstrativo por produto: faturamento, custo histórico das vendas e margens estimadas.
              </p>
            </div>
            <button
              id="btn-pdf-rel-lucro"
              onClick={() => store && generateProductsProfitReportPdf(store, profitData)}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-2.5 text-xs transition shadow-sm"
            >
              <Printer className="h-4 w-4" />
              Baixar PDF Lucro Bruto
            </button>
          </div>
        )}
      </div>

      {/* SECTION: LUCRO BRUTO ESTIMADO DETAILED REPORT (ADMIN ONLY) */}
      {isAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Demonstrativo de LUCRO BRUTO ESTIMADO
              </h3>
              <p className="text-xs text-slate-500">
                Faturamento Bruto (-) Custo das Mercadorias Vendidas (=) Lucro Bruto Estimado
              </p>
            </div>
            <button
              onClick={() => store && generateProductsProfitReportPdf(store, profitData)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              Exportar em PDF
            </button>
          </div>

          {/* KPI Summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <span className="text-[11px] font-semibold text-slate-500">Faturamento Bruto</span>
              <p className="text-lg font-black text-slate-900 mt-1">{formatBRL(totalRevenue)}</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <span className="text-[11px] font-semibold text-slate-500">Custo Mercadorias</span>
              <p className="text-lg font-bold text-slate-700 mt-1">{formatBRL(totalCost)}</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <span className="text-[11px] font-bold text-amber-900">LUCRO BRUTO ESTIMADO</span>
              <p className="text-lg font-black text-amber-900 mt-1">{formatBRL(totalProfit)}</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <span className="text-[11px] font-bold text-emerald-800">Margem Bruta Média</span>
              <p className="text-lg font-black text-emerald-700 mt-1">{grossMargin}%</p>
            </div>
          </div>

          {/* Table per product */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                <tr>
                  <th className="px-3 py-2.5">Produto</th>
                  <th className="px-3 py-2.5 text-center">Qtd Vendida</th>
                  <th className="px-3 py-2.5 text-right">Faturamento</th>
                  <th className="px-3 py-2.5 text-right">Custo Histórico</th>
                  <th className="px-3 py-2.5 text-right">Lucro Bruto Estimado</th>
                  <th className="px-3 py-2.5 text-center">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profitData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Nenhuma venda registrada para calcular lucros ainda.
                    </td>
                  </tr>
                ) : (
                  profitData.map((item) => {
                    const itemMargin =
                      item.revenue > 0
                        ? ((item.estimatedGrossProfit / item.revenue) * 100).toFixed(1)
                        : '0.0';
                    return (
                      <tr key={item.productId} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2.5 font-bold text-slate-800">
                          {item.productName}
                        </td>
                        <td className="px-3 py-2.5 text-center font-semibold text-slate-700">
                          {item.quantity} un
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-slate-700">
                          {formatBRL(item.revenue)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-500">
                          {formatBRL(item.cost)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-black text-slate-900">
                          {formatBRL(item.estimatedGrossProfit)}
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-emerald-600">
                          {itemMargin}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 border border-slate-200">
            * <strong>Nota de Esclarecimento Contábil:</strong> Exibido estritamente como "LUCRO BRUTO ESTIMADO" conforme boas práticas, pois custos fixos e despesas operacionais (aluguel, energia, salários) não foram deduzidos deste cálculo comercial.
          </div>
        </div>
      )}
    </div>
  );
};
