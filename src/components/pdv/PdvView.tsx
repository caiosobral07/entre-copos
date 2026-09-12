import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  CreditCard,
  QrCode,
  CheckCircle2,
  Printer,
  AlertCircle,
  ShoppingBag,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Product, Category, Sale, PaymentMethod, CashRegister } from '../../types';
import { formatBRL } from '../../utils/formatters';
import { generateReceiptPdf } from '../../utils/pdfGenerator';

interface CartItem {
  product: Product;
  quantity: number;
}

export const PdvView: React.FC<{ onNavigateToCaixa?: () => void }> = ({ onNavigateToCaixa }) => {
  const { store } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [finalizing, setFinalizing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('DINHEIRO');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats, reg] = await Promise.all([
        api.getProducts({ active: true }),
        api.getCategories(),
        api.getCurrentCashRegister(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setCashRegister(reg);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar produtos do PDV.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Barcode scanner trigger
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const query = barcodeInput.trim().toLowerCase();
    const found = products.find(
      (p) =>
        p.barcode.toLowerCase() === query ||
        p.sku.toLowerCase() === query
    );

    if (found) {
      addToCart(found);
      setBarcodeInput('');
    } else {
      setError(`Nenhum produto encontrado com o código "${barcodeInput}".`);
      setTimeout(() => setError(null), 3000);
    }
  };

  const addToCart = (product: Product) => {
    if (product.currentStock <= 0) {
      setError(`Produto "${product.name}" sem estoque disponível.`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity + 1 > product.currentStock) {
          setError(`Estoque máximo atingido para "${product.name}" (${product.currentStock} un).`);
          setTimeout(() => setError(null), 3000);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.currentStock) {
              setError(`Estoque insuficiente (${item.product.currentStock} un).`);
              setTimeout(() => setError(null), 3000);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.product.sellPrice * item.quantity, 0);
  const total = Math.max(0, subtotal - discount);
  const paidVal = Number(amountPaid.replace(',', '.')) || total;
  const change = paymentMethod === 'DINHEIRO' ? Math.max(0, paidVal - total) : 0;

  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    if (!cashRegister) {
      setError('ATENÇÃO: O caixa está fechado! É obrigatório abrir o caixa para realizar vendas.');
      return;
    }
    setAmountPaid(total.toFixed(2));
    setShowPaymentModal(true);
  };

  const handleFinalizeSale = async () => {
    setFinalizing(true);
    setError(null);
    try {
      const itemsPayload = cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      }));

      const sale = await api.createSale({
        items: itemsPayload,
        paymentMethod,
        amountPaid: paymentMethod === 'DINHEIRO' ? paidVal : total,
        discount,
      });

      setCompletedSale(sale);
      setShowPaymentModal(false);
      clearCart();
      // Reload products to update stock numbers
      loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao finalizar venda.');
    } finally {
      setFinalizing(false);
    }
  };

  // Filter products by category and search
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Cash register warning if closed */}
      {!cashRegister && !loading && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-800 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-rose-600 shrink-0" />
            <div>
              <p className="text-sm font-bold">O Caixa está Fechado</p>
              <p className="text-xs text-rose-600">
                Para registrar vendas no PDV e atualizar os saldos financeiros, você deve abrir o caixa primeiro.
              </p>
            </div>
          </div>
          {onNavigateToCaixa && (
            <button
              onClick={onNavigateToCaixa}
              className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white transition shadow-sm"
            >
              <Wallet className="h-4 w-4" />
              Abrir Caixa Agora
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Left Products Catalog, Right Shopping Cart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* LEFT COLUMN: PRODUCT SEARCH & GRID (7 COLS) */}
        <div className="space-y-3 lg:col-span-7">
          {/* Top Barcode Scanner & Search input */}
          <div className="flex flex-col gap-2 sm:flex-row">
            {/* Barcode scanner quick input */}
            <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
              <Barcode className="absolute left-3 top-3 h-4 w-4 text-amber-600" />
              <input
                ref={barcodeInputRef}
                id="input-pdv-barcode"
                type="text"
                placeholder="Bipar código de barras ou SKU + Enter..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full rounded-xl border border-amber-300 bg-amber-50/40 pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </form>

            {/* Name search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                id="input-pdv-search"
                type="text"
                placeholder="Buscar por nome do produto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              id="cat-pill-all"
              onClick={() => setSelectedCategory('all')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Todos os Itens ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                id={`cat-pill-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filteredProducts.map((prod) => {
              const inStock = prod.currentStock > 0;
              return (
                <button
                  key={prod.id}
                  id={`btn-add-prod-${prod.id}`}
                  disabled={!inStock}
                  onClick={() => addToCart(prod)}
                  className={`flex flex-col justify-between rounded-2xl border p-3 text-left transition ${
                    inStock
                      ? 'border-slate-200 bg-white hover:border-amber-400 hover:shadow-md'
                      : 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="truncate">{prod.brand}</span>
                      <span
                        className={`font-bold ${
                          prod.currentStock <= prod.minStock ? 'text-rose-600' : 'text-slate-600'
                        }`}
                      >
                        Est: {prod.currentStock} {prod.unit}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-tight">
                      {prod.name}
                    </p>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs sm:text-sm font-black text-amber-600">
                      {formatBRL(prod.sellPrice)}
                    </span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 text-white group-hover:bg-amber-500 text-xs">
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: SHOPPING CART & PAYMENT (5 COLS) */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-5 min-h-[500px]">
          <div>
            {/* Cart Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  Carrinho de Venda
                </h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                  {cart.reduce((acc, i) => acc + i.quantity, 0)} itens
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                  <ShoppingBag className="h-10 w-10 mb-2 opacity-40" />
                  <p className="text-xs font-semibold">Carrinho Vazio</p>
                  <p className="text-[11px] text-slate-400">Bipe o código de barras ou selecione produtos ao lado.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-xs"
                  >
                    <div className="max-w-[140px] sm:max-w-[170px]">
                      <p className="font-bold text-slate-800 truncate">{item.product.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {formatBRL(item.product.sellPrice)} / {item.product.unit}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Quantity controls */}
                      <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="px-1.5 py-1 text-slate-600 hover:bg-slate-100 rounded-l-lg"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2 font-bold text-slate-800 text-xs">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="px-1.5 py-1 text-slate-600 hover:bg-slate-100 rounded-r-lg"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <span className="w-16 text-right font-extrabold text-slate-900">
                        {formatBRL(item.product.sellPrice * item.quantity)}
                      </span>

                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cart Footer: Discount, Subtotal, Total, Action */}
          <div className="pt-3 border-t border-slate-200 space-y-3 mt-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-bold">{formatBRL(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Desconto (R$):</span>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  step="0.50"
                  value={discount === 0 ? '' : discount}
                  placeholder="0,00"
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-20 text-right rounded-lg border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-sm sm:text-base font-black text-slate-950">
                <span>TOTAL A PAGAR:</span>
                <span className="text-xl text-amber-600">{formatBRL(total)}</span>
              </div>
            </div>

            <button
              id="btn-open-finalize-sale"
              disabled={cart.length === 0 || !cashRegister}
              onClick={handleOpenPayment}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 text-sm transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              <DollarSign className="h-4 w-4" />
              Finalizar Venda ({formatBRL(total)})
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: PAYMENT SELECTION & CHANGE */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Pagamento da Venda
              </h3>
              <span className="text-lg font-black text-amber-600">{formatBRL(total)}</span>
            </div>

            {/* Payment Methods Tabs */}
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
                    id={`pay-method-${item.id}`}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(item.id as PaymentMethod);
                      if (item.id !== 'DINHEIRO') setAmountPaid(total.toFixed(2));
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

            {/* Cash Input & Change calculation */}
            {paymentMethod === 'DINHEIRO' && (
              <div className="space-y-3 rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">Valor Recebido (R$):</label>
                  <input
                    id="input-amount-paid"
                    type="number"
                    step="0.50"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 text-right font-black text-slate-900 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Quick cash pills */}
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {[total, 10, 20, 50, 100].map((v, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAmountPaid(v.toFixed(2))}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                    >
                      {i === 0 ? 'Exato' : `R$ ${v}`}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm">
                  <span className="font-bold text-slate-700">Troco a Devolver:</span>
                  <span
                    className={`font-black text-base ${
                      change > 0 ? 'text-emerald-600' : 'text-slate-900'
                    }`}
                  >
                    {formatBRL(change)}
                  </span>
                </div>
              </div>
            )}

            {/* Pix representation */}
            {paymentMethod === 'PIX' && (
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <QrCode className="h-24 w-24 text-slate-800 mb-2" />
                <p className="text-xs font-bold text-slate-800">Chave Pix da Loja (CNPJ)</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{store?.cnpj || 'contato@conveniencia.com'}</p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-2">
                  Aguardando confirmação do pagamento no valor de {formatBRL(total)}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                Voltar
              </button>
              <button
                id="btn-confirm-payment"
                type="button"
                disabled={finalizing || (paymentMethod === 'DINHEIRO' && paidVal < total)}
                onClick={handleFinalizeSale}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white transition shadow-md disabled:opacity-50"
              >
                {finalizing ? 'Processando...' : 'Confirmar e Concluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SALE COMPLETED & RECEIPT */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-1">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">Venda Realizada com Sucesso!</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{completedSale.saleNumber}</p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-left space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Pago:</span>
                <span className="font-extrabold text-slate-900">{formatBRL(completedSale.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Forma:</span>
                <span className="font-bold text-slate-900">{completedSale.paymentMethod}</span>
              </div>
              {completedSale.changeAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Troco Entregue:</span>
                  <span>{formatBRL(completedSale.changeAmount)}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {store && (
                <button
                  id="btn-print-receipt"
                  onClick={() => generateReceiptPdf(store, completedSale)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-xs transition shadow-sm"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir / Baixar Cupom Não Fiscal
                </button>
              )}

              <button
                id="btn-next-sale"
                onClick={() => setCompletedSale(null)}
                className="rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                Próxima Venda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
