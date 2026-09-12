import {
  AuthSession,
  Category,
  Supplier,
  Product,
  StockMovement,
  CashRegister,
  CashMovement,
  Sale,
  Comanda,
  AccountPayable,
  AuditLog,
  Store,
  User,
  SuperAdminStoreInfo,
} from '../types';

const API_BASE = '/api';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      // If unauthorized, clear token and notify
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_store');
      window.dispatchEvent(new Event('auth_logout'));
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Sessão expirada. Por favor, faça login novamente.');
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro na requisição (${res.status})`);
    }

    return res.json();
  }

  // Auth
  async login(email: string, password: string, storeId?: string): Promise<AuthSession> {
    return this.request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, storeId }),
    });
  }

  async register(data: {
    storeName: string;
    cnpj?: string;
    adminName: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<AuthSession> {
    return this.request<AuthSession>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<{ user: User; store: Store }> {
    return this.request<{ user: User; store: Store }>('/auth/me');
  }

  async recoverPassword(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/recover-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Stores
  async getStores(): Promise<{ id: string; name: string; fantasyName: string; cnpj: string }[]> {
    return this.request('/stores');
  }

  async getCurrentStore(): Promise<Store> {
    return this.request('/store/current');
  }

  async updateStore(data: Partial<Store>): Promise<Store> {
    return this.request('/store/current', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Super Admin Methods (Exclusivo entrecoposadm@gmail.com)
  async getSuperAdminStores(): Promise<SuperAdminStoreInfo[]> {
    return this.request<SuperAdminStoreInfo[]>('/superadmin/stores');
  }

  async createSuperAdminStore(data: {
    storeName: string;
    fantasyName?: string;
    corporateReason?: string;
    cnpj?: string;
    phone?: string;
    email?: string;
    address?: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    adminPhone?: string;
  }): Promise<{ store: Store; adminUser: User }> {
    return this.request<{ store: Store; adminUser: User }>('/superadmin/stores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async toggleSuperAdminStoreStatus(storeId: string): Promise<Store> {
    return this.request<Store>(`/superadmin/stores/${storeId}/toggle-status`, {
      method: 'PATCH',
    });
  }

  async switchSuperAdminStore(storeId: string): Promise<{ token: string; store: Store }> {
    return this.request<{ token: string; store: Store }>(`/superadmin/switch-store/${storeId}`, {
      method: 'POST',
    });
  }

  // Users
  async getUsers(): Promise<User[]> {
    return this.request('/users');
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: string;
    phone?: string;
  }): Promise<User> {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: Partial<User & { password?: string }>): Promise<User> {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return this.request('/categories');
  }

  async createCategory(data: { name: string; description?: string; color?: string }): Promise<Category> {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    return this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    return this.request('/suppliers');
  }

  async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    return this.request('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
    return this.request(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSupplier(id: string): Promise<{ success: boolean }> {
    return this.request(`/suppliers/${id}`, {
      method: 'DELETE',
    });
  }

  // Products
  async getProducts(params?: {
    search?: string;
    categoryId?: string;
    supplierId?: string;
    lowStock?: boolean;
    outOfStock?: boolean;
    active?: boolean;
  }): Promise<Product[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params?.supplierId) searchParams.set('supplierId', params.supplierId);
    if (params?.lowStock) searchParams.set('lowStock', 'true');
    if (params?.outOfStock) searchParams.set('outOfStock', 'true');
    if (params?.active !== undefined) searchParams.set('active', String(params.active));

    return this.request(`/products?${searchParams.toString()}`);
  }

  async createProduct(data: Partial<Product>): Promise<Product> {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Stock
  async getStockSummary(): Promise<{
    totalRegistered: number;
    lowStockCount: number;
    outOfStockCount: number;
    nearExpirationCount: number;
    totalStockValue?: number;
  }> {
    return this.request('/stock/summary');
  }

  async getStockMovements(): Promise<StockMovement[]> {
    return this.request('/stock/movements');
  }

  async stockEntry(data: {
    productId: string;
    quantity: number;
    costPrice?: number;
    supplierId?: string;
    reason?: string;
  }): Promise<StockMovement> {
    return this.request('/stock/entry', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async stockAdjust(data: {
    productId: string;
    quantity: number;
    type: 'ENTRADA' | 'SAIDA';
    reason: string;
  }): Promise<{ product: Product; movement: StockMovement }> {
    return this.request('/stock/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Cash Register
  async getCurrentCashRegister(): Promise<CashRegister | null> {
    return this.request('/cash/current');
  }

  async getCashHistory(): Promise<CashRegister[]> {
    return this.request('/cash/history');
  }

  async openCashRegister(initialAmount: number, notes?: string): Promise<CashRegister> {
    return this.request('/cash/open', {
      method: 'POST',
      body: JSON.stringify({ initialAmount, notes }),
    });
  }

  async cashMovement(data: {
    type: 'SUPRIMENTO' | 'SANGRIA';
    amount: number;
    reason: string;
  }): Promise<{ register: CashRegister; movement: CashMovement }> {
    return this.request('/cash/movement', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async closeCashRegister(finalPhysicalAmount: number, notes?: string): Promise<CashRegister> {
    return this.request('/cash/close', {
      method: 'POST',
      body: JSON.stringify({ finalPhysicalAmount, notes }),
    });
  }

  // Sales (PDV)
  async createSale(data: {
    items: { productId: string; quantity: number }[];
    paymentMethod: string;
    amountPaid?: number;
    discount?: number;
  }): Promise<Sale> {
    return this.request('/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSales(params?: {
    origin?: string;
    paymentMethod?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Sale[]> {
    const searchParams = new URLSearchParams();
    if (params?.origin) searchParams.set('origin', params.origin);
    if (params?.paymentMethod) searchParams.set('paymentMethod', params.paymentMethod);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);

    return this.request(`/sales?${searchParams.toString()}`);
  }

  async getSaleById(id: string): Promise<Sale> {
    return this.request(`/sales/${id}`);
  }

  // Comandas
  async getOpenComandas(): Promise<Comanda[]> {
    return this.request('/comandas/open');
  }

  async getComandasHistory(): Promise<Comanda[]> {
    return this.request('/comandas/history');
  }

  async openComanda(data: { tableNumber?: string; clientName?: string; notes?: string }): Promise<Comanda> {
    return this.request('/comandas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getComandaById(id: string): Promise<Comanda> {
    return this.request(`/comandas/${id}`);
  }

  async addComandaItem(comandaId: string, productId: string, quantity: number): Promise<Comanda> {
    return this.request(`/comandas/${comandaId}/items`, {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });
  }

  async updateComandaItem(comandaId: string, itemId: string, quantity: number): Promise<Comanda> {
    return this.request(`/comandas/${comandaId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  }

  async removeComandaItem(comandaId: string, itemId: string): Promise<Comanda> {
    return this.request(`/comandas/${comandaId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  async closeComanda(
    comandaId: string,
    data: { paymentMethod: string; amountPaid?: number; discount?: number }
  ): Promise<{ comanda: Comanda; sale: Sale }> {
    return this.request(`/comandas/${comandaId}/close`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Accounts Payable
  async getAccountsPayable(params?: { status?: string; filter?: string }): Promise<AccountPayable[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.filter) searchParams.set('filter', params.filter);
    return this.request(`/accounts-payable?${searchParams.toString()}`);
  }

  async createAccountPayable(data: {
    supplierId?: string;
    supplierName: string;
    description: string;
    amount: number;
    dueDate: string;
    paymentMethod?: string;
    notes?: string;
  }): Promise<AccountPayable> {
    return this.request('/accounts-payable', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async payAccountPayable(id: string, data: { paymentMethod?: string; notes?: string }): Promise<AccountPayable> {
    return this.request(`/accounts-payable/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Reports
  async getDashboardReport(period: string = 'hoje'): Promise<{
    metrics: {
      totalRevenue: number;
      totalSalesCount: number;
      closedComandasCount: number;
      ticketAverage: number;
      totalProductsSold: number;
      totalRegisteredProducts: number;
      lowStockCount: number;
      outOfStockCount: number;
      estimatedStockValue?: number;
      accountsDueToday?: number;
      accountsOverdue?: number;
      grossProfitEstimated?: number;
    };
    nextAccountsDue?: AccountPayable[];
    chartRevenueByDay: { date: string; faturamento: number }[];
    chartPaymentMethods: { name: string; value: number; color: string }[];
    topProducts: { name: string; quantity: number; total: number }[];
    salesByEmployee: { name: string; count: number; total: number }[];
  }> {
    return this.request(`/reports/dashboard?period=${period}`);
  }

  async getProductsProfitReport(): Promise<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
    cost: number;
    estimatedGrossProfit: number;
  }[]> {
    return this.request('/reports/products-profit');
  }

  // Audit
  async getAuditLogs(): Promise<AuditLog[]> {
    return this.request('/audit-logs');
  }
}

export const api = new ApiClient();
