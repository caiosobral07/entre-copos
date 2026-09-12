import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  ShoppingCart,
  Receipt,
  TrendingUp,
  Package,
  AlertTriangle,
  XCircle,
  Calendar,
  Layers,
  ArrowUpRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { formatBRL, formatDate } from '../../utils/formatters';

export const DashboardView: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [period, setPeriod] = useState<string>('hoje');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboardReport(period);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [period]);

  const metrics = data?.metrics || {};

  return (
    <div className="space-y-6">
      {/* Top Bar: Title & Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            {isAdmin ? 'Painel Gerencial da Conveniência' : `Painel Operacional • ${user?.name}`}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Acompanhe vendas, estoque e movimentações em tempo real.
          </p>
        </div>

        {/* Period Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {[
            { id: 'hoje', label: 'Hoje' },
            { id: '7d', label: '7 Dias' },
            { id: '30d', label: '30 Dias' },
            { id: 'mes', label: 'Este Mês' },
          ].map((item) => (
            <button
              key={item.id}
              id={`filter-period-${item.id}`}
              onClick={() => setPeriod(item.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                period === item.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            Carregando indicadores...
          </div>
        </div>
      ) : (
        <>
          {/* SECTION 1: VENDAS (TODAY / PERIOD) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Vendas no Período ({period === 'hoje' ? 'Hoje' : period})
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {/* Faturamento (Admin Only) */}
              {isAdmin ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Faturamento</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <DollarSign className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 text-xl font-extrabold text-slate-900">
                    {formatBRL(metrics.totalRevenue)}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-semibold flex items-center mt-1">
                    <ArrowUpRight className="h-3 w-3 mr-0.5" /> Total bruto recebido
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Minhas Vendas</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <ShoppingCart className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 text-xl font-extrabold text-slate-900">
                    {metrics.totalSalesCount || 0}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Vendas operacionais</p>
                </div>
              )}

              {/* Quantidade de Vendas */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Qtd. de Vendas</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl font-extrabold text-slate-900">
                  {metrics.totalSalesCount || 0}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {metrics.totalProductsSold || 0} itens faturados
                </p>
              </div>

              {/* Comandas Fechadas */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Comandas Fechadas</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Receipt className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl font-extrabold text-slate-900">
                  {metrics.closedComandasCount || 0}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Mesas e comandas finalizadas</p>
              </div>

              {/* Ticket Médio */}
              {isAdmin && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Ticket Médio</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 text-xl font-extrabold text-slate-900">
                    {formatBRL(metrics.ticketAverage)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Por atendimento</p>
                </div>
              )}

              {/* Lucro Bruto Estimado (Admin Only) */}
              {isAdmin && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">LUCRO BRUTO ESTIMADO</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white">
                      <Layers className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 text-xl font-black text-amber-950">
                    {formatBRL(metrics.grossProfitEstimated)}
                  </p>
                  <p className="text-[10px] text-amber-800 mt-1 font-medium">
                    Faturamento - Custo histórico
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: ESTOQUE */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Posição de Estoque
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Produtos Ativos</span>
                  <Package className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {metrics.totalRegisteredProducts || 0}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Cadastrados no sistema</p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800">Estoque Baixo</span>
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <p className="mt-2 text-xl font-bold text-amber-900">
                  {metrics.lowStockCount || 0}
                </p>
                <p className="text-[11px] text-amber-700 mt-1">Abaixo do mínimo</p>
              </div>

              <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800">Sem Estoque</span>
                  <XCircle className="h-4 w-4 text-rose-600" />
                </div>
                <p className="mt-2 text-xl font-bold text-rose-900">
                  {metrics.outOfStockCount || 0}
                </p>
                <p className="text-[11px] text-rose-700 mt-1">Zerados</p>
              </div>

              {isAdmin ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Valor em Estoque</span>
                    <DollarSign className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-2 text-xl font-bold text-slate-900">
                    {formatBRL(metrics.estimatedStockValue)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">A preço de custo</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Reposição Urgente</span>
                    <Clock className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-2 text-xl font-bold text-slate-900">
                    {(metrics.lowStockCount || 0) + (metrics.outOfStockCount || 0)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Itens a avisar gerente</p>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: FINANCEIRO (ADMIN ONLY) */}
          {isAdmin && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Contas a Pagar & Financeiro
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Vencendo Hoje</span>
                    <Calendar className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="mt-2 text-xl font-bold text-slate-900">
                    {formatBRL(metrics.accountsDueToday)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">A pagar hoje</p>
                </div>

                <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-800">Contas Vencidas</span>
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                  </div>
                  <p className="mt-2 text-xl font-bold text-rose-900">
                    {formatBRL(metrics.accountsOverdue)}
                  </p>
                  <p className="text-[11px] text-rose-700 mt-1">Em atraso</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Próximos Vencimentos</span>
                    <CheckCircle2 className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="mt-2 space-y-1">
                    {data?.nextAccountsDue && data.nextAccountsDue.length > 0 ? (
                      data.nextAccountsDue.slice(0, 2).map((acc: any) => (
                        <div key={acc.id} className="flex justify-between text-xs">
                          <span className="truncate text-slate-700 max-w-[140px]">{acc.description}</span>
                          <span className="font-bold text-slate-900">{formatBRL(acc.amount)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400">Nenhuma conta pendente</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: CHARTS */}
          {isAdmin && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Chart: Faturamento por Dia */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 mb-4">
                  Faturamento nos Últimos 7 Dias
                </h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.chartRevenueByDay || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `R$ ${v}`}
                        width={65}
                      />
                      <Tooltip
                        formatter={(val: any) => [formatBRL(Number(val)), 'Faturamento']}
                      />
                      <Bar dataKey="faturamento" fill="#0f172a" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart: Formas de Pagamento */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 mb-4">
                  Vendas por Forma de Pagamento
                </h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data?.chartPaymentMethods || []}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => `${entry.name} (${formatBRL(entry.value)})`}
                      >
                        {(data?.chartPaymentMethods || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => formatBRL(Number(val))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Table: Produtos Mais Vendidos */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 mb-4">
                  Produtos Mais Vendidos
                </h4>
                <div className="space-y-3">
                  {data?.topProducts && data.topProducts.length > 0 ? (
                    data.topProducts.map((p: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{p.name}</p>
                            <p className="text-[11px] text-slate-400">{p.quantity} unidades vendidas</p>
                          </div>
                        </div>
                        <span className="text-xs font-extrabold text-slate-900">
                          {formatBRL(p.total)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 py-6 text-center">Nenhuma venda registrada ainda no período.</p>
                  )}
                </div>
              </div>

              {/* Table: Vendas por Funcionário */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 mb-4">
                  Desempenho por Operador
                </h4>
                <div className="space-y-3">
                  {data?.salesByEmployee && data.salesByEmployee.length > 0 ? (
                    data.salesByEmployee.map((emp: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{emp.name}</p>
                          <p className="text-[11px] text-slate-400">{emp.count} atendimentos realizados</p>
                        </div>
                        <span className="text-xs font-extrabold text-slate-900">
                          {formatBRL(emp.total)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 py-6 text-center">Sem dados de atendimentos no período.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
