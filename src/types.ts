export type UserRole = 'SUPER_ADMIN' | 'ADMINISTRADOR' | 'FUNCIONARIO';

export interface SuperAdminStoreInfo extends Store {
  adminUser?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    active: boolean;
  };
  employeeCount: number;
  salesCount: number;
  totalRevenue: number;
  productsCount: number;
}

export interface Store {
  id: string;
  name: string;
  fantasyName: string;
  corporateReason: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
  logoUrl?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  storeId: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  phone?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  color?: string;
  active: boolean;
  createdAt: string;
}

export interface Supplier {
  id: string;
  storeId: string;
  name: string;
  corporateReason?: string;
  cpfCnpj: string;
  cnpj?: string;
  contactName?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  barcode: string;
  sku: string;
  categoryId: string;
  categoryName?: string;
  brand: string;
  supplierId?: string;
  supplierName?: string;
  unit: string; // UN, KG, L, PCT, CX
  costPrice?: number; // Only returned if role is ADMINISTRADOR
  sellPrice: number;
  currentStock: number;
  minStock: number;
  expirationDate?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType = 'ENTRADA' | 'VENDA' | 'AJUSTE' | 'CANCELAMENTO' | 'DEVOLUCAO';

export interface StockMovement {
  id: string;
  storeId: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantity: number;
  costPrice?: number;
  reason?: string;
  supplierId?: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export type PaymentMethod = 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO';

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
  costSubtotal: number;
  createdAt: string;
}

export interface Sale {
  id: string;
  saleNumber: string;
  storeId: string;
  origin: 'PDV' | 'COMANDA';
  comandaId?: string;
  comandaNumber?: string;
  tableNumber?: string;
  clientName?: string;
  userId: string;
  userName: string;
  subtotal: number;
  discount: number;
  total: number;
  costTotal: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeAmount: number;
  status: 'FINALIZADA' | 'CANCELADA';
  cashRegisterId?: string;
  createdAt: string;
  items?: SaleItem[];
}

export interface ComandaItem {
  id: string;
  comandaId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt: string;
}

export interface Comanda {
  id: string;
  comandaNumber: string;
  storeId: string;
  tableNumber?: string;
  clientName?: string;
  notes?: string;
  status: 'ABERTA' | 'FECHADA' | 'CANCELADA';
  openedByUserId: string;
  openedByUserName: string;
  closedByUserId?: string;
  closedByUserName?: string;
  openedAt: string;
  closedAt?: string;
  saleId?: string;
  total: number;
  itemCount: number;
  items?: ComandaItem[];
}

export interface CashRegister {
  id: string;
  storeId: string;
  userId: string;
  userName: string;
  openedAt: string;
  closedAt?: string;
  initialAmount: number;
  finalPhysicalAmount?: number;
  status: 'ABERTO' | 'FECHADO';
  salesCash: number;
  salesPix: number;
  salesDebit: number;
  salesCredit: number;
  inflowAmount: number;
  outflowAmount: number;
  expectedAmount: number;
  differenceAmount?: number;
  closedByUserId?: string;
  closedByUserName?: string;
  notes?: string;
}

export interface CashMovement {
  id: string;
  storeId: string;
  cashRegisterId: string;
  type: 'SUPRIMENTO' | 'SANGRIA';
  amount: number;
  reason: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export type AccountPayableStatus = 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'CANCELADO';

export interface AccountPayable {
  id: string;
  storeId: string;
  supplierId?: string;
  supplierName: string;
  description: string;
  amount: number;
  dueDate: string;
  paymentMethod?: PaymentMethod;
  status: AccountPayableStatus;
  paidAt?: string;
  paidByUserId?: string;
  paidByUserName?: string;
  notes?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  storeId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: User;
  store: Store;
}
