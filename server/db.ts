import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  Store,
  User,
  Category,
  Supplier,
  Product,
  StockMovement,
  Sale,
  SaleItem,
  Comanda,
  ComandaItem,
  CashRegister,
  CashMovement,
  AccountPayable,
  AuditLog,
} from '../src/types.js';

interface DatabaseSchema {
  stores: Store[];
  users: (User & { passwordHash: string })[];
  categories: Category[];
  suppliers: Supplier[];
  products: Product[];
  stockMovements: StockMovement[];
  sales: Sale[];
  saleItems: SaleItem[];
  comandas: Comanda[];
  comandaItems: ComandaItem[];
  cashRegisters: CashRegister[];
  cashMovements: CashMovement[];
  accountsPayable: AccountPayable[];
  auditLogs: AuditLog[];
}

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_DIR = isServerless ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');
const ROOT_DB_FILE = path.join(process.cwd(), 'data', 'db.json');

class DatabaseService {
  private data: DatabaseSchema;
  private writeLock: Promise<void> = Promise.resolve();

  constructor() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
    } catch (err) {
      console.warn('Could not create DB_DIR:', err);
    }
    this.data = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    let schema: DatabaseSchema | null = null;
    
    // 1. Try reading from DB_FILE (e.g. /tmp/data/db.json in serverless)
    if (fs.existsSync(DB_FILE)) {
      try {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        schema = JSON.parse(content);
      } catch (err) {
        console.error('Error reading db.json, fallback to seed:', err);
      }
    }
    
    // 2. If not found in DB_FILE, try reading bundled root data/db.json
    if (!schema && DB_FILE !== ROOT_DB_FILE && fs.existsSync(ROOT_DB_FILE)) {
      try {
        const content = fs.readFileSync(ROOT_DB_FILE, 'utf-8');
        schema = JSON.parse(content);
      } catch (err) {
        console.error('Error reading ROOT_DB_FILE, fallback to seed:', err);
      }
    }

    // 3. Fallback to seed data
    if (!schema) {
      schema = this.generateSeedData();
    }

    // Ensure Super Admin exists with required credentials:
    // Email: entrecoposadm@gmail.com, Senha: Adm@123, Role: SUPER_ADMIN
    const superAdminEmail = 'entrecoposadm@gmail.com';
    const superAdminHash = bcrypt.hashSync('Adm@123', bcrypt.genSaltSync(10));
    const existingSuperAdmin = schema.users.find((u) => u.email.toLowerCase() === superAdminEmail);

    if (!existingSuperAdmin) {
      schema.users.unshift({
        id: 'user-superadmin-master',
        storeId: schema.stores[0]?.id || 'store-convenience-01',
        name: 'Administrador Geral (Entre Copos)',
        email: superAdminEmail,
        passwordHash: superAdminHash,
        role: 'SUPER_ADMIN' as any,
        active: true,
        phone: '(11) 99999-0000',
        createdAt: new Date().toISOString(),
      });
      this.saveDatabaseSync(schema);
    } else {
      if (
        !bcrypt.compareSync('Adm@123', existingSuperAdmin.passwordHash) ||
        (existingSuperAdmin.role as string) !== 'SUPER_ADMIN' ||
        !existingSuperAdmin.active
      ) {
        existingSuperAdmin.passwordHash = superAdminHash;
        existingSuperAdmin.role = 'SUPER_ADMIN' as any;
        existingSuperAdmin.active = true;
        this.saveDatabaseSync(schema);
      }
    }

    return schema;
  }

  private generateSeedData(): DatabaseSchema {
    const store1Id = 'store-convenience-01';
    const store2Id = 'store-posto-02';
    const salt = bcrypt.genSaltSync(10);

    const store1: Store = {
      id: store1Id,
      name: 'Entre Copos Gestão',
      fantasyName: 'Entre Copos Gestão',
      corporateReason: 'Entre Copos Comércio de Alimentos e Bebidas LTDA',
      cnpj: '24.112.334/0001-88',
      phone: '(11) 98765-4321',
      email: 'contato@entrecopos.com.br',
      address: 'Av. Paulista, 1500 - Bela Vista, São Paulo - SP',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const store2: Store = {
      id: store2Id,
      name: 'Posto Estrela Conveniência',
      fantasyName: 'Stop Conveniência Posto',
      corporateReason: 'Estrela Auto Posto & Conveniência LTDA',
      cnpj: '33.998.776/0001-12',
      phone: '(11) 97777-8888',
      email: 'gerencia@postoestrela.com.br',
      address: 'Rodovia Anchieta, KM 18 - São Bernardo do Campo - SP',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const users = [
      {
        id: 'user-superadmin-master',
        storeId: store1Id,
        name: 'Administrador Geral (Entre Copos)',
        email: 'entrecoposadm@gmail.com',
        passwordHash: bcrypt.hashSync('Adm@123', salt),
        role: 'SUPER_ADMIN' as const,
        active: true,
        phone: '(11) 99999-0000',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'user-admin-01',
        storeId: store1Id,
        name: 'Carlos Oliveira (Administrador)',
        email: 'admin@conveniencia.com',
        passwordHash: bcrypt.hashSync('admin123', salt),
        role: 'ADMINISTRADOR' as const,
        active: true,
        phone: '(11) 99111-2233',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'user-func-01',
        storeId: store1Id,
        name: 'Lucas Ferreira (Atendente)',
        email: 'funcionario@conveniencia.com',
        passwordHash: bcrypt.hashSync('func123', salt),
        role: 'FUNCIONARIO' as const,
        active: true,
        phone: '(11) 99444-5566',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'user-admin-02',
        storeId: store2Id,
        name: 'Renata Souza (Loja 2 Admin)',
        email: 'admin2@posto.com',
        passwordHash: bcrypt.hashSync('admin123', salt),
        role: 'ADMINISTRADOR' as const,
        active: true,
        phone: '(11) 99888-7766',
        createdAt: new Date().toISOString(),
      },
    ];

    const categories: Category[] = [
      { id: 'cat-01', storeId: store1Id, name: 'Cervejas', description: 'Latas, garrafas e long necks', color: '#f59e0b', active: true, createdAt: new Date().toISOString() },
      { id: 'cat-02', storeId: store1Id, name: 'Bebidas Não Alcoólicas', description: 'Refrigerantes, sucos e águas', color: '#06b6d4', active: true, createdAt: new Date().toISOString() },
      { id: 'cat-03', storeId: store1Id, name: 'Energéticos', description: 'Red Bull, Monster e outros', color: '#8b5cf6', active: true, createdAt: new Date().toISOString() },
      { id: 'cat-04', storeId: store1Id, name: 'Destilados & Vinhos', description: 'Whiskies, vodkas, gins e vinhos', color: '#ec4899', active: true, createdAt: new Date().toISOString() },
      { id: 'cat-05', storeId: store1Id, name: 'Tabacaria & Narguilé', description: 'Cigarros, essências, sedas e carvão', color: '#64748b', active: true, createdAt: new Date().toISOString() },
      { id: 'cat-06', storeId: store1Id, name: 'Snacks & Petiscos', description: 'Salgadinhos, amendoins e biscoitos', color: '#10b981', active: true, createdAt: new Date().toISOString() },
      { id: 'cat-07', storeId: store1Id, name: 'Bomboniere & Doces', description: 'Chocolates, balas e chicletes', color: '#f43f5e', active: true, createdAt: new Date().toISOString() },
      { id: 'cat-08', storeId: store1Id, name: 'Gelo & Carvão', description: 'Sacos de gelo filtrado e carvão vegetal', color: '#3b82f6', active: true, createdAt: new Date().toISOString() },
    ];

    const suppliers: Supplier[] = [
      {
        id: 'sup-01',
        storeId: store1Id,
        name: 'Ambev Brasil Distribuidora',
        cpfCnpj: '02.808.708/0001-07',
        phone: '(11) 3003-8888',
        whatsapp: '11988887777',
        email: 'pedidos@ambev.com.br',
        address: 'Av. Paulista, 1000 - SP',
        notes: 'Entregas às terças e sextas',
        active: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sup-02',
        storeId: store1Id,
        name: 'Coca-Cola FEMSA Brasil',
        cpfCnpj: '43.118.897/0001-50',
        phone: '(11) 4004-2020',
        whatsapp: '11977776666',
        email: 'comercial@femsa.com.br',
        address: 'Rodovia Raposo Tavares - SP',
        notes: 'Pedido mínimo R$ 500,00',
        active: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sup-03',
        storeId: store1Id,
        name: 'Distribuidora Tabacaria Imperial',
        cpfCnpj: '18.345.987/0001-22',
        phone: '(11) 3222-1100',
        whatsapp: '11966665555',
        email: 'vendas@tabacariaimperial.com.br',
        address: 'Rua 25 de Março, 400 - SP',
        notes: 'Fornece Zomo, Nay, carvões e sedas',
        active: true,
        createdAt: new Date().toISOString(),
      },
    ];

    const now = new Date().toISOString();
    const products: Product[] = [
      {
        id: 'prod-01',
        storeId: store1Id,
        name: 'Cerveja Heineken Lata 350ml',
        barcode: '7891991010856',
        sku: 'CER-HEI-350',
        categoryId: 'cat-01',
        categoryName: 'Cervejas',
        brand: 'Heineken',
        supplierId: 'sup-01',
        supplierName: 'Ambev Brasil Distribuidora',
        unit: 'UN',
        costPrice: 4.80,
        sellPrice: 7.99,
        currentStock: 120,
        minStock: 24,
        expirationDate: '2027-02-15',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-02',
        storeId: store1Id,
        name: 'Cerveja Corona Extra Long Neck 330ml',
        barcode: '7501064191456',
        sku: 'CER-COR-330',
        categoryId: 'cat-01',
        categoryName: 'Cervejas',
        brand: 'Corona',
        supplierId: 'sup-01',
        supplierName: 'Ambev Brasil Distribuidora',
        unit: 'UN',
        costPrice: 5.50,
        sellPrice: 9.50,
        currentStock: 85,
        minStock: 18,
        expirationDate: '2027-01-20',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-03',
        storeId: store1Id,
        name: 'Energético Red Bull Energy Drink 250ml',
        barcode: '9002490100070',
        sku: 'ENE-RED-250',
        categoryId: 'cat-03',
        categoryName: 'Energéticos',
        brand: 'Red Bull',
        supplierId: 'sup-02',
        supplierName: 'Coca-Cola FEMSA Brasil',
        unit: 'UN',
        costPrice: 6.90,
        sellPrice: 11.90,
        currentStock: 70,
        minStock: 15,
        expirationDate: '2027-06-30',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-04',
        storeId: store1Id,
        name: 'Energético Monster Energy 473ml',
        barcode: '70847012475',
        sku: 'ENE-MON-473',
        categoryId: 'cat-03',
        categoryName: 'Energéticos',
        brand: 'Monster',
        supplierId: 'sup-02',
        supplierName: 'Coca-Cola FEMSA Brasil',
        unit: 'UN',
        costPrice: 6.80,
        sellPrice: 11.50,
        currentStock: 64,
        minStock: 15,
        expirationDate: '2027-08-10',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-05',
        storeId: store1Id,
        name: 'Whisky Johnnie Walker Red Label 1L',
        barcode: '5000267014005',
        sku: 'DES-RED-1L',
        categoryId: 'cat-04',
        categoryName: 'Destilados & Vinhos',
        brand: 'Johnnie Walker',
        supplierId: 'sup-01',
        supplierName: 'Ambev Brasil Distribuidora',
        unit: 'UN',
        costPrice: 78.00,
        sellPrice: 119.90,
        currentStock: 16,
        minStock: 5,
        expirationDate: '2029-12-31',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-06',
        storeId: store1Id,
        name: 'Refrigerante Coca-Cola Pet 2L',
        barcode: '7894900011517',
        sku: 'REF-COC-2L',
        categoryId: 'cat-02',
        categoryName: 'Bebidas Não Alcoólicas',
        brand: 'Coca-Cola',
        supplierId: 'sup-02',
        supplierName: 'Coca-Cola FEMSA Brasil',
        unit: 'UN',
        costPrice: 6.50,
        sellPrice: 11.00,
        currentStock: 48,
        minStock: 12,
        expirationDate: '2026-11-20',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-07',
        storeId: store1Id,
        name: 'Água Mineral Crystal Sem Gás 500ml',
        barcode: '7894900530018',
        sku: 'AGU-CRY-500',
        categoryId: 'cat-02',
        categoryName: 'Bebidas Não Alcoólicas',
        brand: 'Crystal',
        supplierId: 'sup-02',
        supplierName: 'Coca-Cola FEMSA Brasil',
        unit: 'UN',
        costPrice: 1.20,
        sellPrice: 3.50,
        currentStock: 95,
        minStock: 20,
        expirationDate: '2027-04-15',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-08',
        storeId: store1Id,
        name: 'Salgadinho Doritos Queijo Nacho 75g',
        barcode: '7892840816827',
        sku: 'SNA-DOR-75',
        categoryId: 'cat-06',
        categoryName: 'Snacks & Petiscos',
        brand: 'Elma Chips',
        unit: 'UN',
        costPrice: 4.20,
        sellPrice: 7.50,
        currentStock: 40,
        minStock: 10,
        expirationDate: '2026-12-10',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-09',
        storeId: store1Id,
        name: 'Essência Zomo Strong Mint 50g',
        barcode: '7898956420101',
        sku: 'TAB-ZOM-MNT',
        categoryId: 'cat-05',
        categoryName: 'Tabacaria & Narguilé',
        brand: 'Zomo',
        supplierId: 'sup-03',
        supplierName: 'Distribuidora Tabacaria Imperial',
        unit: 'UN',
        costPrice: 8.50,
        sellPrice: 15.00,
        currentStock: 35,
        minStock: 8,
        expirationDate: '2028-05-30',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-10',
        storeId: store1Id,
        name: 'Gelo Filtrado Pacote 5kg',
        barcode: '7898901234567',
        sku: 'GEL-FIL-5KG',
        categoryId: 'cat-08',
        categoryName: 'Gelo & Carvão',
        brand: 'Gelo Polar',
        unit: 'PCT',
        costPrice: 7.00,
        sellPrice: 15.00,
        currentStock: 22,
        minStock: 5,
        expirationDate: '2027-12-31',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-11',
        storeId: store1Id,
        name: 'Chocolate Kit Kat 41,5g',
        barcode: '7891000248882',
        sku: 'DOC-KIT-41',
        categoryId: 'cat-07',
        categoryName: 'Bomboniere & Doces',
        brand: 'Nestlé',
        unit: 'UN',
        costPrice: 2.80,
        sellPrice: 5.00,
        currentStock: 3, // Low stock test
        minStock: 10,
        expirationDate: '2026-10-10',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-12',
        storeId: store1Id,
        name: 'Vodka Absolut Regular 1L',
        barcode: '7312040017034',
        sku: 'DES-ABS-1L',
        categoryId: 'cat-04',
        categoryName: 'Destilados & Vinhos',
        brand: 'Absolut',
        supplierId: 'sup-01',
        supplierName: 'Ambev Brasil Distribuidora',
        unit: 'UN',
        costPrice: 72.00,
        sellPrice: 109.90,
        currentStock: 0, // Out of stock test
        minStock: 4,
        expirationDate: '2029-12-31',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const initialCashRegister: CashRegister = {
      id: 'cash-reg-01',
      storeId: store1Id,
      userId: 'user-admin-01',
      userName: 'Carlos Oliveira (Administrador)',
      openedAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
      initialAmount: 200.00,
      status: 'ABERTO',
      salesCash: 0,
      salesPix: 0,
      salesDebit: 0,
      salesCredit: 0,
      inflowAmount: 0,
      outflowAmount: 0,
      expectedAmount: 200.00,
      notes: 'Caixa de abertura do turno',
    };

    const initialAccountsPayable: AccountPayable[] = [
      {
        id: 'ap-01',
        storeId: store1Id,
        supplierId: 'sup-01',
        supplierName: 'Ambev Brasil Distribuidora',
        description: 'Reposição Cervejas Lote 442',
        amount: 1450.00,
        dueDate: new Date().toISOString().split('T')[0], // Today
        paymentMethod: 'PIX',
        status: 'PENDENTE',
        createdAt: now,
      },
      {
        id: 'ap-02',
        storeId: store1Id,
        supplierId: 'sup-02',
        supplierName: 'Coca-Cola FEMSA Brasil',
        description: 'Refrigerantes e Energéticos',
        amount: 880.00,
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], // in 3 days
        paymentMethod: 'PIX',
        status: 'PENDENTE',
        createdAt: now,
      },
      {
        id: 'ap-03',
        storeId: store1Id,
        supplierId: 'sup-03',
        supplierName: 'Distribuidora Tabacaria Imperial',
        description: 'Essências e Carvão de Narguilé',
        amount: 520.00,
        dueDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], // Overdue (2 days ago)
        paymentMethod: 'DEBITO',
        status: 'ATRASADO',
        createdAt: now,
      },
    ];

    const initialAudit: AuditLog = {
      id: 'audit-01',
      storeId: store1Id,
      userId: 'user-admin-01',
      userName: 'Carlos Oliveira',
      userRole: 'ADMINISTRADOR',
      action: 'Abertura de Caixa',
      entity: 'Caixa',
      entityId: 'cash-reg-01',
      details: 'Caixa aberto com R$ 200,00 de fundo de troco.',
      createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    };

    return {
      stores: [store1, store2],
      users,
      categories,
      suppliers,
      products,
      stockMovements: [],
      sales: [],
      saleItems: [],
      comandas: [],
      comandaItems: [],
      cashRegisters: [initialCashRegister],
      cashMovements: [],
      accountsPayable: initialAccountsPayable,
      auditLogs: [initialAudit],
    };
  }

  private saveDatabaseSync(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.warn('Warning: Could not persist database to disk (likely serverless/read-only filesystem):', err);
    }
  }

  public async withLock<T>(fn: (data: DatabaseSchema) => Promise<T> | T): Promise<T> {
    const prevLock = this.writeLock;
    let resolveLock!: () => void;
    this.writeLock = new Promise<void>((res) => {
      resolveLock = res;
    });

    try {
      await prevLock;
      const result = await fn(this.data);
      this.saveDatabaseSync(this.data);
      return result;
    } finally {
      resolveLock();
    }
  }

  public getRawData(): DatabaseSchema {
    return this.data;
  }
}

export const db = new DatabaseService();
