import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  AlertTriangle,
  History,
  Lock,
  Unlock,
  DollarSign,
  CreditCard,
  QrCode,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { CashRegister } from '../../types';
import { formatBRL, formatDateTime } from '../../utils/formatters';

export const CaixaView: React.FC<{ onCashStatusChanged?: () => void }> = ({ onCashStatusChanged }) => {
  const { user } = useAuth();
  const [currentRegister, setCurrentRegister] = useState<CashRegister | null>(null);
  const [history, setHistory] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Open Modal
  const [showOpenModal, setShowOpenModal] = useState<boolean>(false);
  const [initialAmount, setInitialAmount] = useState<string>('150.00');
  const [openNotes, setOpenNotes] = useState<string>('');

  // Movement Modal (Sangria / Suprimento)
  const [showMovementModal, setShowMovementModal] = useState<boolean>(false);
  const [movementType, setMovementType] = useState<'SANGRIA' | 'SUPRIMENTO'>('SANGRIA');
  const [movementAmount, setMovementAmount] = useState<string>('');
  const [movementReason, setMovementReason] = useState<string>('');

  // Close Modal
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [physicalCash, setPhysicalCash] = useState<string>('');
  const [closeNotes, setCloseNotes] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [current, hist] = await Promise.all([
        api.getCurrentCashRegister(),
        api.getCashHistory(),
      ]);
      setCurrentRegister(current);
      setHistory(hist);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do caixa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const amount = parseFloat(initialAmount.replace(',', '.')) || 0;
      const opened = await api.openCashRegister(amount, openNotes.trim() || undefined);
      setCurrentRegister(opened);
      setShowOpenModal(false);
      setSuccess('Caixa aberto com sucesso! Pronto para realizar vendas.');
      if (onCashStatusChanged) onCashStatusChanged();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Erro ao abrir caixa.');
    }
  };

  const handleCashMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(movementAmount.replace(',', '.'));
    if (!amount || amount <= 0 || !movementReason.trim()) {
      setError('Informe o valor e o motivo obrigatório.');
      return;
    }
    setError(null);
    try {
      const res = await api.cashMovement({
        type: movementType,
        amount,
        reason: movementReason.trim(),
      });
      setCurrentRegister(res.register);
      setShowMovementModal(false);
      setMovementAmount('');
      setMovementReason('');
      setSuccess(`${movementType === 'SANGRIA' ? 'Sangria' : 'Suprimento'} registrado com sucesso.`);
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar movimentação no caixa.');
    }
  };

  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(physicalCash.replace(',', '.'));
    if (isNaN(amount) || amount < 0) {
      setError('Informe o valor físico apurado em dinheiro.');
      return;
    }
    setError(null);
    try {
      const closed = await api.closeCashRegister(amount, closeNotes.trim() || undefined);
      setCurrentRegister(null);
      setHistory([closed, ...history]);
      setShowCloseModal(false);
      setPhysicalCash('');
      setCloseNotes('');
      setSuccess(`Caixa fechado com sucesso! Diferença apurada: ${formatBRL(closed.differenceAmount || 0)}`);
      if (onCashStatusChanged) onCashStatusChanged();
      setTimeout(() => setSuccess(null), 4500);
    } catch (err: any) {
      setError(err.message || 'Erro ao fechar caixa.');
    }
  };

  // Difference in Close Modal
  const expectedCash = currentRegister ? currentRegister.expectedAmount : 0;
  const physicalNum = parseFloat(physicalCash.replace(',', '.')) || 0;
  const diff = physicalNum - expectedCash;

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Controle de Caixa
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Gerencie o fundo de troco, sangrias, suprimentos e apuração física do fechamento.
          </p>
        </div>

        {currentRegister?.status === 'ABERTO' ? (
          <div className="flex items-center gap-2">
            <button
              id="btn-open-sangria"
              onClick={() => {
                setMovementType('SANGRIA');
                setShowMovementModal(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
            >
              <ArrowDownCircle className="h-4 w-4" />
              Sangria (Retirada)
            </button>

            <button
              id="btn-open-suprimento"
              onClick={() => {
                setMovementType('SUPRIMENTO');
                setShowMovementModal(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
            >
              <ArrowUpCircle className="h-4 w-4" />
              Suprimento (Aporte)
            </button>

            <button
              id="btn-open-fechar-caixa"
              onClick={() => {
                setPhysicalCash(expectedCash.toFixed(2));
                setShowCloseModal(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm transition"
            >
              <Lock className="h-4 w-4" />
              Fechar Caixa
            </button>
          </div>
        ) : (
          <button
            id="btn-open-caixa-modal"
            onClick={() => setShowOpenModal(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-md transition"
          >
            <Unlock className="h-4 w-4" />
            Abrir Caixa Agora
          </button>
        )}
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

      {/* STATE 1: CAIXA FECHADO */}
      {!currentRegister ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 sm:p-12 text-center shadow-sm">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-3">
            <Lock className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">O Caixa Atual Está Fechado</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1">
            Para iniciar o registro de vendas, comandas e recebimentos, informe o fundo de troco e abra o caixa.
          </p>
          <button
            id="btn-abrir-caixa-center"
            onClick={() => setShowOpenModal(true)}
            className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-sm font-extrabold text-white shadow-md transition"
          >
            <Unlock className="h-5 w-5" />
            Abrir Caixa
          </button>
        </div>
      ) : (
        /* STATE 2: CAIXA ABERTO & LIVE BREAKDOWN */
        <div className="space-y-4">
          {/* Main Card: Expected Cash in Drawer */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                    Caixa em Aberto • Turno Ativo
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Aberto por {currentRegister.userName} em {formatDateTime(currentRegister.openedAt)}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs font-semibold text-slate-500">Saldo Físico Esperado na Gaveta</span>
                <p className="text-2xl sm:text-3xl font-black text-slate-950">
                  {formatBRL(currentRegister.expectedAmount)}
                </p>
                <p className="text-[11px] text-emerald-600 font-semibold">
                  Fundo Inicial + Vendas Dinheiro + Suprimentos - Sangrias
                </p>
              </div>
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Fundo Inicial (Troco)</span>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatBRL(currentRegister.initialAmount)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Saldo de abertura</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                Vendas em Dinheiro
              </span>
              <p className="mt-2 text-xl font-bold text-emerald-700">
                {formatBRL(currentRegister.salesCash)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Entrou na gaveta</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <QrCode className="h-3.5 w-3.5 text-slate-600" />
                Vendas em Pix
              </span>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatBRL(currentRegister.salesPix)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Conta bancária</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                Cartões (Débito + Crédito)
              </span>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatBRL((currentRegister.salesDebit || 0) + (currentRegister.salesCredit || 0))}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Débito: {formatBRL(currentRegister.salesDebit)} | Crédito: {formatBRL(currentRegister.salesCredit)}
              </p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
              <span className="text-xs font-bold text-blue-800">Total Suprimentos (+)</span>
              <p className="mt-2 text-xl font-bold text-blue-900">
                {formatBRL(currentRegister.inflowAmount)}
              </p>
              <p className="text-[11px] text-blue-700 mt-1">Aportes extras de troco</p>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
              <span className="text-xs font-bold text-rose-800">Total Sangrias (-)</span>
              <p className="mt-2 text-xl font-bold text-rose-900">
                {formatBRL(currentRegister.outflowAmount)}
              </p>
              <p className="text-[11px] text-rose-700 mt-1">Retiradas de segurança</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
              <span className="text-xs font-medium text-slate-500">Total Bruto Faturado no Turno</span>
              <p className="mt-2 text-xl font-extrabold text-slate-900">
                {formatBRL(
                  (currentRegister.salesCash || 0) +
                  (currentRegister.salesPix || 0) +
                  (currentRegister.salesDebit || 0) +
                  (currentRegister.salesCredit || 0)
                )}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Todas as formas combinadas</p>
            </div>
          </div>

          {/* Movements inside this shift */}
          {currentRegister.movements && currentRegister.movements.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Movimentações Realizadas no Turno Atual
              </h4>
              <div className="space-y-2">
                {currentRegister.movements.map((mov) => (
                  <div
                    key={mov.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs border border-slate-100"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          mov.type === 'SANGRIA' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {mov.type}
                      </span>
                      <div>
                        <p className="font-bold text-slate-800">{mov.reason}</p>
                        <p className="text-[11px] text-slate-400">
                          {formatDateTime(mov.createdAt)} • Por {mov.userName}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-black text-sm ${
                        mov.type === 'SANGRIA' ? 'text-rose-600' : 'text-blue-600'
                      }`}
                    >
                      {mov.type === 'SANGRIA' ? `- ${formatBRL(mov.amount)}` : `+ ${formatBRL(mov.amount)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTORY OF CLOSED CASH REGISTERS */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <History className="h-4 w-4 text-slate-500" />
          Histórico de Caixas Fechados
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
              <tr>
                <th className="px-3 py-2">Abertura / Fechamento</th>
                <th className="px-3 py-2">Operador</th>
                <th className="px-3 py-2 text-right">Fundo Inicial</th>
                <th className="px-3 py-2 text-right">Saldo Esperado</th>
                <th className="px-3 py-2 text-right">Saldo Contado</th>
                <th className="px-3 py-2 text-center">Divergência</th>
                <th className="px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhum histórico de caixa fechado registrado.
                  </td>
                </tr>
              ) : (
                history.map((reg) => {
                  const diffVal = reg.differenceAmount ?? 0;
                  return (
                    <tr key={reg.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-800">
                          {formatDateTime(reg.closedAt)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Aberto em: {formatDateTime(reg.openedAt)}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-700">{reg.userName}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{formatBRL(reg.initialAmount)}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-700">
                        {formatBRL(reg.expectedAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                        {formatBRL(reg.finalPhysicalAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`font-black ${
                            diffVal === 0
                              ? 'text-slate-400'
                              : diffVal > 0
                              ? 'text-blue-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {diffVal === 0 ? 'Exato' : formatBRL(diffVal)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          Fechado
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ABRIR CAIXA */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Abertura de Caixa
              </h3>
              <button
                onClick={() => setShowOpenModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOpenRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor Inicial / Fundo de Troco (R$) *
                </label>
                <input
                  id="input-initial-cash"
                  type="number"
                  step="0.50"
                  required
                  placeholder="150,00"
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-base font-black text-slate-900 focus:border-amber-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Dinheiro físico disponível na gaveta para iniciar as operações de troco.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observações (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Turno da manhã"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-open-cash"
                  type="submit"
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs transition shadow-md"
                >
                  Confirmar Abertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SANGRIA OU SUPRIMENTO */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {movementType === 'SANGRIA' ? 'Sangria de Caixa (Retirada)' : 'Suprimento de Caixa (Aporte)'}
              </h3>
              <button
                onClick={() => setShowMovementModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCashMovement} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor da Movimentação (R$) *
                </label>
                <input
                  id="input-movement-amount"
                  type="number"
                  step="0.50"
                  required
                  placeholder="50,00"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-base font-black text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo Obrigatório *
                </label>
                <input
                  id="input-movement-reason"
                  type="text"
                  required
                  placeholder={
                    movementType === 'SANGRIA'
                      ? 'Ex: Sangria para cofre de segurança, pagamento de entregador'
                      : 'Ex: Aporte de moedas e cédulas miúdas'
                  }
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-movement"
                  type="submit"
                  className={`flex-1 rounded-xl py-2.5 text-xs font-bold text-white transition shadow-md ${
                    movementType === 'SANGRIA'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Confirmar {movementType === 'SANGRIA' ? 'Sangria' : 'Suprimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: FECHAR CAIXA & APURAÇÃO */}
      {showCloseModal && currentRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Fechamento do Caixa
              </h3>
              <button
                onClick={() => setShowCloseModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCloseRegister} className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Saldo Esperado em Gaveta:</span>
                  <span className="font-extrabold text-slate-900">{formatBRL(expectedCash)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Vendas em Dinheiro:</span>
                  <span>{formatBRL(currentRegister.cashSalesAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Total Sangrias:</span>
                  <span>- {formatBRL(currentRegister.outflowAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor Físico Apurado em Dinheiro (R$) *
                </label>
                <input
                  id="input-physical-cash"
                  type="number"
                  step="0.50"
                  required
                  value={physicalCash}
                  onChange={(e) => setPhysicalCash(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-base font-black text-slate-900 focus:border-amber-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Conte as notas e moedas físicas na gaveta e digite aqui.
                </p>
              </div>

              {/* Difference card */}
              <div
                className={`rounded-xl p-3 border text-xs flex items-center justify-between font-bold ${
                  diff === 0
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : diff > 0
                    ? 'border-blue-200 bg-blue-50 text-blue-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                <span>
                  {diff === 0
                    ? '✓ Caixa exato (sem divergência)'
                    : diff > 0
                    ? '▲ Sobra de Caixa:'
                    : '▼ Falta de Caixa:'}
                </span>
                <span className="text-sm font-black">{formatBRL(Math.abs(diff))}</span>
              </div>

              {diff !== 0 && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  ⚠️ <strong>Atenção:</strong> Há uma divergência entre o saldo esperado e o valor contado. Essa divergência será gravada no histórico para auditoria.
                </p>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observações do Fechamento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Turno encerrado normalmente"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-close-cash"
                  type="submit"
                  className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-xs transition shadow-md"
                >
                  Confirmar e Fechar Caixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
