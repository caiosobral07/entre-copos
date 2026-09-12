import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  Percent,
  Barcode,
  FolderPlus,
  X,
  Printer,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Product, Category, Supplier } from '../../types';
import { formatBRL, formatDate } from '../../utils/formatters';
import { generateInventoryReportPdf } from '../../utils/pdfGenerator';

export const ProdutosView: React.FC = () => {
  const { isAdmin, store } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [filterLowStock, setFilterLowStock] = useState<boolean>(false);
  const [filterActive, setFilterActive] = useState<string>('all');

  // Product Modal (Create/Edit)
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    categoryId: '',
    costPrice: '',
    sellPrice: '',
    minStock: '5',
    currentStock: '0',
    unit: 'UN',
    supplierId: '',
    expirationDate: '',
    active: true,
  });

  // Category Manager Modal
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDesc, setNewCatDesc] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);

      if (isAdmin) {
        const sups = await api.getSuppliers();
        setSuppliers(sups);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewProduct = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      barcode: '',
      categoryId: categories[0]?.id || '',
      costPrice: '',
      sellPrice: '',
      minStock: '5',
      currentStock: '0',
      unit: 'UN',
      supplierId: '',
      expirationDate: '',
      active: true,
    });
    setShowProductModal(true);
  };

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      barcode: prod.barcode,
      categoryId: prod.categoryId,
      costPrice: prod.costPrice !== undefined ? String(prod.costPrice) : '',
      sellPrice: String(prod.sellPrice),
      minStock: String(prod.minStock),
      currentStock: String(prod.currentStock),
      unit: prod.unit,
      supplierId: prod.supplierId || '',
      expirationDate: prod.expirationDate ? prod.expirationDate.split('T')[0] : '',
      active: prod.active,
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const payload: Partial<Product> = {
        name: formData.name.trim(),
        barcode: formData.barcode.trim(),
        categoryId: formData.categoryId,
        sellPrice: parseFloat(formData.sellPrice.replace(',', '.')),
        minStock: parseInt(formData.minStock) || 0,
        unit: formData.unit,
        supplierId: formData.supplierId || undefined,
        expirationDate: formData.expirationDate || undefined,
        active: formData.active,
      };

      if (isAdmin && formData.costPrice) {
        payload.costPrice = parseFloat(formData.costPrice.replace(',', '.'));
      }

      if (editingProduct) {
        const updated = await api.updateProduct(editingProduct.id, payload);
        setProducts(products.map((p) => (p.id === updated.id ? updated : p)));
        setSuccess(`Produto "${updated.name}" atualizado com sucesso.`);
      } else {
        payload.currentStock = parseInt(formData.currentStock) || 0;
        const created = await api.createProduct(payload);
        setProducts([created, ...products]);
        setSuccess(`Produto "${created.name}" cadastrado com sucesso.`);
      }

      setShowProductModal(false);
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar produto.');
    }
  };

  const handleToggleProductStatus = async (prod: Product) => {
    try {
      const updated = await api.updateProduct(prod.id, { active: !prod.active });
      setProducts(products.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar status.');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const created = await api.createCategory({
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined,
      });
      setCategories([...categories, created]);
      setNewCatName('');
      setNewCatDesc('');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar categoria.');
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    try {
      await api.deleteCategory(catId);
      setCategories(categories.filter((c) => c.id !== catId));
    } catch (err: any) {
      setError(err.message || 'Não foi possível excluir a categoria.');
    }
  };

  // Calculated margin
  const cost = parseFloat(formData.costPrice.replace(',', '.')) || 0;
  const sell = parseFloat(formData.sellPrice.replace(',', '.')) || 0;
  const margin = sell > 0 && cost > 0 ? (((sell - cost) / sell) * 100).toFixed(1) : '0.0';

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search) ||
      p.sku.toLowerCase().includes(search.toLowerCase());

    const matchesCat = !selectedCategory || p.categoryId === selectedCategory;
    const matchesLowStock = !filterLowStock || p.currentStock <= p.minStock;
    const matchesActive =
      filterActive === 'all' ||
      (filterActive === 'active' && p.active) ||
      (filterActive === 'inactive' && !p.active);

    return matchesSearch && matchesCat && matchesLowStock && matchesActive;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Produtos & Categorias
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Cadastre os itens da conveniência, controle preços de venda e gerencie categorias.
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

          <button
            id="btn-manage-categories"
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <FolderPlus className="h-4 w-4 text-slate-600" />
            Categorias ({categories.length})
          </button>

          <button
            id="btn-new-product"
            onClick={openNewProduct}
            className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 text-xs sm:text-sm transition shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Novo Produto
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

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            id="filter-search-products"
            type="text"
            placeholder="Buscar por nome, código ou código de barras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            id="filter-category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="">Todas as Categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            id="filter-low-stock-btn"
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
              filterLowStock
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Estoque Baixo
          </button>

          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Somente Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3">Cód. Barras</th>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3 text-center">Estoque</th>
                {isAdmin && <th className="px-4 py-3 text-right">Custo</th>}
                <th className="px-4 py-3 text-right">Venda</th>
                {isAdmin && <th className="px-4 py-3 text-center">Margem</th>}
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 7} className="px-4 py-12 text-center text-slate-400">
                    Nenhum produto encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.currentStock <= p.minStock && p.currentStock > 0;
                  const isOut = p.currentStock <= 0;
                  const itemMargin =
                    p.costPrice && p.costPrice > 0 && p.sellPrice > 0
                      ? (((p.sellPrice - p.costPrice) / p.sellPrice) * 100).toFixed(0)
                      : null;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 font-mono text-slate-500 font-semibold text-[11px]">
                        {p.barcode}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                        <div className="text-[10px] text-slate-400">{p.brand} • SKU: {p.sku}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-600">
                        {p.categoryName || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            isOut
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {p.currentStock} {p.unit}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">mín: {p.minStock}</span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right font-medium text-slate-500">
                          {p.costPrice ? formatBRL(p.costPrice) : '-'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                        {formatBRL(p.sellPrice)}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-center">
                          {itemMargin !== null ? (
                            <span className="inline-flex items-center text-xs font-extrabold text-emerald-600">
                              {itemMargin}%
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleProductStatus(p)}
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            p.active
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          title="Clique para alternar ativo/inativo"
                        >
                          {p.active ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openEditProduct(p)}
                          className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          title="Editar produto"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CREATE / EDIT PRODUCT */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Produto *
                </label>
                <input
                  id="input-prod-name"
                  type="text"
                  required
                  placeholder="Ex: Cerveja Heineken Long Neck 330ml"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código de Barras (EAN) *
                  </label>
                  <input
                    id="input-prod-barcode"
                    type="text"
                    required
                    placeholder="Ex: 7891991000858"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    id="input-prod-category"
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">Selecione a categoria...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing Grid */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {isAdmin && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Preço de Custo (R$)
                      </label>
                      <input
                        id="input-prod-cost"
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={formData.costPrice}
                        onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Preço de Venda (R$) *
                    </label>
                    <input
                      id="input-prod-sell"
                      type="number"
                      step="0.01"
                      required
                      placeholder="0,00"
                      value={formData.sellPrice}
                      onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {isAdmin && sell > 0 && cost > 0 && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Margem de Lucro Estimada:</span>
                    <span className="font-extrabold text-emerald-600">{margin}%</span>
                  </div>
                )}
              </div>

              {/* Stock controls */}
              <div className="grid grid-cols-3 gap-3">
                {!editingProduct && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Estoque Inicial
                    </label>
                    <input
                      type="number"
                      value={formData.currentStock}
                      onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Estoque Mínimo
                  </label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unidade
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="UN">UN (Unidade)</option>
                    <option value="KG">KG (Quilo)</option>
                    <option value="LT">LT (Litro)</option>
                    <option value="PC">PC (Pacote)</option>
                  </select>
                </div>
              </div>

              {/* Expiration date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data de Validade (opcional)
                </label>
                <input
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  id="btn-submit-product"
                  type="submit"
                  className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-xs transition shadow-md"
                >
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CATEGORY MANAGER */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Gerenciar Categorias
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* New Category Form */}
            <form onSubmit={handleCreateCategory} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nome da nova categoria..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 text-xs font-bold transition"
                >
                  Adicionar
                </button>
              </div>
            </form>

            {/* Categories List */}
            <div className="flex-1 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs"
                >
                  <span className="font-bold text-slate-800">{cat.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    title="Excluir categoria"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowCategoryModal(false)}
              className="w-full rounded-xl border border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
