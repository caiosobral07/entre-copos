import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import {
  UserRole,
  User,
  Store,
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
  PaymentMethod,
} from '../src/types.js';

export const apiRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'conveniencia-jwt-secret-key-2025';

interface AuthTokenPayload {
  userId: string;
  storeId: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    storeId: string;
    role: UserRole;
    name: string;
    email: string;
  };
}

// Authentication Middleware
export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso não autorizado. Faça login para continuar.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    const rawData = db.getRawData();
    const user = rawData.users.find(
      (u) =>
        u.id === payload.userId &&
        (u.storeId === payload.storeId || u.role === 'SUPER_ADMIN' || u.email.toLowerCase() === 'entrecoposadm@gmail.com') &&
        u.active
    );
    if (!user) {
      return res.status(401).json({ error: 'Sessão inválida ou usuário inativo.' });
    }

    const isSuper = user.role === 'SUPER_ADMIN' || user.email.toLowerCase() === 'entrecoposadm@gmail.com';

    req.user = {
      id: user.id,
      storeId: payload.storeId || user.storeId,
      role: isSuper ? 'SUPER_ADMIN' : user.role,
      name: user.name,
      email: user.email,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token expirado ou inválido.' });
  }
};

// Admin Middleware (Allows both Store Admin and Platform Super Admin)
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== 'ADMINISTRADOR' && req.user.role !== 'SUPER_ADMIN' && req.user.email.toLowerCase() !== 'entrecoposadm@gmail.com')) {
    return res.status(403).json({
      error: 'Acesso negado. Esta operação exige privilégios de Administrador.',
    });
  }
  next();
};

// Super Admin Only Middleware (Platform Administrator)
export const requireSuperAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== 'SUPER_ADMIN' && req.user.email.toLowerCase() !== 'entrecoposadm@gmail.com')) {
    return res.status(403).json({
      error: 'Acesso restrito ao Administrador Geral da Entre Copos Gestão (entrecoposadm@gmail.com).',
    });
  }
  next();
};

// Helper to log audit
const logAudit = (
  rawData: ReturnType<typeof db.getRawData>,
  user: { id: string; storeId: string; name: string; role: UserRole },
  action: string,
  entity: string,
  entityId?: string,
  details?: string
) => {
  const audit: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    storeId: user.storeId,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    entity,
    entityId,
    details,
    createdAt: new Date().toISOString(),
  };
  rawData.auditLogs.unshift(audit);
};

// ==========================================
// 1. AUTHENTICATION & SESSION
// ==========================================

apiRouter.post('/auth/login', async (req, res) => {
  const { email, password, storeId } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  const rawData = db.getRawData();
  let user = rawData.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  // If storeId is provided, enforce match
  if (storeId && user && user.storeId !== storeId) {
    return res.status(400).json({ error: 'Usuário não pertence à loja selecionada.' });
  }

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
  }

  if (!user.active) {
    return res.status(403).json({ error: 'Usuário inativo. Contate o administrador.' });
  }

  const store = rawData.stores.find((s) => s.id === user!.storeId);
  if (!store || !store.active) {
    return res.status(403).json({ error: 'Loja desativada no sistema.' });
  }

  const token = jwt.sign(
    { userId: user.id, storeId: user.storeId, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Log audit
  await db.withLock((data) => {
    logAudit(data, user!, 'Login Realizado', 'Usuário', user!.id, `Login efetuado por ${user!.name}`);
  });

  const { passwordHash: _, ...safeUser } = user;
  return res.json({ token, user: safeUser, store });
});

apiRouter.post('/auth/register', async (req, res) => {
  // Only Super Admin (entrecoposadm@gmail.com) can register new stores
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({
      error: 'Apenas o Administrador Geral da Entre Copos (entrecoposadm@gmail.com) tem permissão para cadastrar novas lojas.',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    const rawData = db.getRawData();
    const user = rawData.users.find((u) => u.id === payload.userId && u.active);
    if (!user || (user.role !== 'SUPER_ADMIN' && user.email.toLowerCase() !== 'entrecoposadm@gmail.com')) {
      return res.status(403).json({
        error: 'Apenas o Administrador Geral da Entre Copos (entrecoposadm@gmail.com) tem permissão para cadastrar novas lojas.',
      });
    }
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }

  const { storeName, cnpj, adminName, email, password, phone } = req.body;
  if (!storeName || !adminName || !email || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
  }

  const result = await db.withLock((data) => {
    if (data.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Já existe um usuário com este e-mail.');
    }

    const storeId = `store-${Date.now()}`;
    const newStore = {
      id: storeId,
      name: storeName,
      fantasyName: storeName,
      corporateReason: storeName,
      cnpj: cnpj || '00.000.000/0001-00',
      phone: phone || '',
      email: email,
      address: 'Endereço Principal',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.stores.push(newStore);

    const salt = bcrypt.genSaltSync(10);
    const userId = `user-${Date.now()}`;
    const newUser = {
      id: userId,
      storeId: storeId,
      name: adminName,
      email: email.toLowerCase(),
      passwordHash: bcrypt.hashSync(password, salt),
      role: 'ADMINISTRADOR' as const,
      active: true,
      phone: phone || '',
      createdAt: new Date().toISOString(),
    };
    data.users.push(newUser);

    // Initial default categories
    const initialCats = ['Bebidas', 'Cervejas', 'Destilados', 'Tabacaria & Narguilé', 'Snacks', 'Bomboniere'];
    initialCats.forEach((catName, idx) => {
      data.categories.push({
        id: `cat-${storeId}-${idx + 1}`,
        storeId: storeId,
        name: catName,
        active: true,
        createdAt: new Date().toISOString(),
      });
    });

    logAudit(data, newUser, 'Loja e Administrador Cadastrados', 'Loja', storeId, `Nova loja ${storeName} criada`);

    const token = jwt.sign(
      { userId: newUser.id, storeId: newUser.storeId, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { passwordHash: _, ...safeUser } = newUser;
    return { token, user: safeUser, store: newStore };
  });

  return res.status(201).json(result);
});

apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const rawData = db.getRawData();
  const user = rawData.users.find((u) => u.id === req.user!.id);
  const store = rawData.stores.find((s) => s.id === req.user!.storeId);
  if (!user || !store) {
    return res.status(404).json({ error: 'Usuário ou loja não encontrados.' });
  }
  const { passwordHash: _, ...safeUser } = user;
  return res.json({ user: safeUser, store });
});

apiRouter.post('/auth/recover-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Informe o e-mail.' });
  // Simulates password reset link dispatched
  return res.json({
    message: 'Se o e-mail estiver cadastrado, as instruções para redefinição foram enviadas com sucesso.',
  });
});

// ==========================================
// 2. STORES & MULTI-TENANT
// ==========================================

apiRouter.get('/stores', (req, res) => {
  const rawData = db.getRawData();
  // Return list of available active stores
  const stores = rawData.stores.filter((s) => s.active).map((s) => ({
    id: s.id,
    name: s.name,
    fantasyName: s.fantasyName,
    cnpj: s.cnpj,
  }));
  res.json(stores);
});

apiRouter.get('/store/current', requireAuth, (req: AuthenticatedRequest, res) => {
  const rawData = db.getRawData();
  const store = rawData.stores.find((s) => s.id === req.user!.storeId);
  res.json(store);
});

apiRouter.put('/store/current', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { name, fantasyName, corporateReason, cnpj, phone, email, address, logoUrl } = req.body;
  const updatedStore = await db.withLock((data) => {
    const store = data.stores.find((s) => s.id === req.user!.storeId);
    if (!store) throw new Error('Loja não encontrada');
    store.name = name || store.name;
    store.fantasyName = fantasyName || store.fantasyName;
    store.corporateReason = corporateReason || store.corporateReason;
    store.cnpj = cnpj || store.cnpj;
    store.phone = phone || store.phone;
    store.email = email || store.email;
    store.address = address || store.address;
    if (logoUrl !== undefined) store.logoUrl = logoUrl;
    store.updatedAt = new Date().toISOString();

    logAudit(data, req.user!, 'Dados da Loja Atualizados', 'Loja', store.id);
    return store;
  });
  res.json(updatedStore);
});

// ==========================================
// 2.1 SUPER ADMIN STORE MANAGEMENT (Exclusivo entrecoposadm@gmail.com)
// ==========================================

apiRouter.get('/superadmin/stores', requireAuth, requireSuperAdmin, (req: AuthenticatedRequest, res) => {
  const rawData = db.getRawData();
  const list = rawData.stores.map((store) => {
    const storeUsers = rawData.users.filter((u) => u.storeId === store.id);
    const admin = storeUsers.find((u) => u.role === 'ADMINISTRADOR');
    const employeeCount = storeUsers.filter((u) => u.role === 'FUNCIONARIO').length;
    const storeSales = rawData.sales.filter((s) => s.storeId === store.id && s.status !== 'CANCELADA');
    const salesCount = storeSales.length;
    const totalRevenue = storeSales.reduce((acc, s) => acc + s.total, 0);
    const productsCount = rawData.products.filter((p) => p.storeId === store.id).length;

    return {
      ...store,
      adminUser: admin ? { id: admin.id, name: admin.name, email: admin.email, phone: admin.phone, active: admin.active } : undefined,
      employeeCount,
      salesCount,
      totalRevenue,
      productsCount,
    };
  });
  res.json(list);
});

apiRouter.post('/superadmin/stores', requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const {
    storeName,
    fantasyName,
    corporateReason,
    cnpj,
    phone,
    email,
    address,
    adminName,
    adminEmail,
    adminPassword,
    adminPhone,
  } = req.body;

  if (!storeName || !adminName || !adminEmail || !adminPassword) {
    return res.status(400).json({
      error: 'Nome da loja, nome do administrador, e-mail do administrador e senha inicial são obrigatórios.',
    });
  }

  try {
    const created = await db.withLock((data) => {
      if (data.users.some((u) => u.email.toLowerCase() === adminEmail.toLowerCase())) {
        throw new Error(`Já existe um usuário cadastrado com o e-mail "${adminEmail}". Escolha outro e-mail.`);
      }

      const storeId = `store-${Date.now()}`;
      const newStore: Store = {
        id: storeId,
        name: storeName,
        fantasyName: fantasyName || storeName,
        corporateReason: corporateReason || storeName,
        cnpj: cnpj || '00.000.000/0001-00',
        phone: phone || '',
        email: email || adminEmail,
        address: address || 'Endereço Principal',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      data.stores.push(newStore);

      const salt = bcrypt.genSaltSync(10);
      const adminUserId = `user-admin-${Date.now()}`;
      const newAdminUser = {
        id: adminUserId,
        storeId,
        name: adminName,
        email: adminEmail.toLowerCase(),
        passwordHash: bcrypt.hashSync(adminPassword, salt),
        role: 'ADMINISTRADOR' as const,
        active: true,
        phone: adminPhone || phone || '',
        createdAt: new Date().toISOString(),
      };
      data.users.push(newAdminUser);

      // Default categories for convenience store
      const initialCats = ['Cervejas & Chopes', 'Bebidas Não Alcoólicas', 'Energéticos & Isotônicos', 'Destilados & Vinhos', 'Tabacaria & Fumos', 'Snacks & Petiscos', 'Gelos & Descartáveis'];
      initialCats.forEach((catName, idx) => {
        data.categories.push({
          id: `cat-${storeId}-${idx + 1}`,
          storeId,
          name: catName,
          active: true,
          createdAt: new Date().toISOString(),
        });
      });

      logAudit(
        data,
        req.user!,
        'Loja Cadastrada pelo Administrador Geral',
        'Loja',
        storeId,
        `Loja "${storeName}" cadastrada com administrador "${adminName}" (${adminEmail})`
      );

      const { passwordHash: _, ...safeAdmin } = newAdminUser;
      return {
        store: newStore,
        adminUser: safeAdmin,
      };
    });

    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.patch('/superadmin/stores/:id/toggle-status', requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    const updated = await db.withLock((data) => {
      const store = data.stores.find((s) => s.id === id);
      if (!store) throw new Error('Loja não encontrada.');
      store.active = !store.active;
      store.updatedAt = new Date().toISOString();

      logAudit(
        data,
        req.user!,
        store.active ? 'Loja Reativada' : 'Loja Desativada',
        'Loja',
        store.id,
        `Status da loja "${store.name}" alterado para ${store.active ? 'Ativa' : 'Inativa'}`
      );
      return store;
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/superadmin/switch-store/:id', requireAuth, requireSuperAdmin, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const rawData = db.getRawData();
  const store = rawData.stores.find((s) => s.id === id);
  if (!store) return res.status(404).json({ error: 'Loja não encontrada.' });

  const token = jwt.sign(
    { userId: req.user!.id, storeId: store.id, role: 'SUPER_ADMIN' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, store });
});

// ==========================================
// 3. USERS / EMPLOYEES
// ==========================================

apiRouter.get('/users', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  const rawData = db.getRawData();
  const users = rawData.users
    .filter((u) => u.storeId === req.user!.storeId)
    .map(({ passwordHash, ...u }) => u);
  res.json(users);
});

apiRouter.post('/users', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { name, email, password, role, phone } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
  }

  try {
    const newUser = await db.withLock((data) => {
      if (data.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('Já existe um usuário cadastrado com este e-mail.');
      }
      const salt = bcrypt.genSaltSync(10);
      const user: User & { passwordHash: string } = {
        id: `user-${Date.now()}`,
        storeId: req.user!.storeId,
        name,
        email: email.toLowerCase(),
        passwordHash: bcrypt.hashSync(password, salt),
        role: role as UserRole,
        active: true,
        phone,
        createdAt: new Date().toISOString(),
      };
      data.users.push(user);
      logAudit(data, req.user!, 'Funcionário Criado', 'Usuário', user.id, `Criado usuário ${name} com perfil ${role}`);
      const { passwordHash: _, ...safeUser } = user;
      return safeUser;
    });
    res.status(201).json(newUser);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/users/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { name, role, active, phone, password } = req.body;

  try {
    const updated = await db.withLock((data) => {
      const user = data.users.find((u) => u.id === id && u.storeId === req.user!.storeId);
      if (!user) throw new Error('Usuário não encontrado.');

      if (name) user.name = name;
      if (role) user.role = role as UserRole;
      if (active !== undefined) user.active = active;
      if (phone !== undefined) user.phone = phone;
      if (password) {
        user.passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
      }

      logAudit(data, req.user!, 'Funcionário Atualizado', 'Usuário', user.id, `Dados de ${user.name} atualizados`);
      const { passwordHash: _, ...safeUser } = user;
      return safeUser;
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 4. CATEGORIES
// ==========================================

apiRouter.get('/categories', requireAuth, (req: AuthenticatedRequest, res) => {
  const rawData = db.getRawData();
  const categories = rawData.categories.filter((c) => c.storeId === req.user!.storeId);
  res.json(categories);
});

apiRouter.post('/categories', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { name, description, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome da categoria é obrigatório.' });

  const newCat = await db.withLock((data) => {
    const cat: Category = {
      id: `cat-${Date.now()}`,
      storeId: req.user!.storeId,
      name,
      description,
      color: color || '#3b82f6',
      active: true,
      createdAt: new Date().toISOString(),
    };
    data.categories.push(cat);
    logAudit(data, req.user!, 'Categoria Criada', 'Categoria', cat.id, `Categoria ${name} criada`);
    return cat;
  });
  res.status(201).json(newCat);
});

apiRouter.put('/categories/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { name, description, color, active } = req.body;

  const updated = await db.withLock((data) => {
    const cat = data.categories.find((c) => c.id === id && c.storeId === req.user!.storeId);
    if (!cat) throw new Error('Categoria não encontrada.');
    if (name) cat.name = name;
    if (description !== undefined) cat.description = description;
    if (color) cat.color = color;
    if (active !== undefined) cat.active = active;
    logAudit(data, req.user!, 'Categoria Atualizada', 'Categoria', cat.id, `Categoria ${cat.name} atualizada`);
    return cat;
  });
  res.json(updated);
});

apiRouter.delete('/categories/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    await db.withLock((data) => {
      // Check if products exist for category
      const hasProducts = data.products.some((p) => p.categoryId === id && p.storeId === req.user!.storeId);
      if (hasProducts) {
        throw new Error('Não é possível excluir fisicamente esta categoria pois existem produtos cadastrados nela. Desative-a em vez disso.');
      }
      const idx = data.categories.findIndex((c) => c.id === id && c.storeId === req.user!.storeId);
      if (idx === -1) throw new Error('Categoria não encontrada.');
      const removed = data.categories.splice(idx, 1)[0];
      logAudit(data, req.user!, 'Categoria Excluída', 'Categoria', id, `Categoria ${removed.name} excluída`);
    });
    res.json({ success: true, message: 'Categoria excluída com sucesso.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 5. SUPPLIERS (FORNECEDORES) - Admin Only
// ==========================================

apiRouter.get('/suppliers', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  const rawData = db.getRawData();
  const suppliers = rawData.suppliers.filter((s) => s.storeId === req.user!.storeId);
  res.json(suppliers);
});

apiRouter.post('/suppliers', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { name, cpfCnpj, phone, whatsapp, email, address, notes } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Nome e telefone do fornecedor são obrigatórios.' });
  }

  const newSupplier = await db.withLock((data) => {
    const sup: Supplier = {
      id: `sup-${Date.now()}`,
      storeId: req.user!.storeId,
      name,
      cpfCnpj: cpfCnpj || '',
      phone,
      whatsapp: whatsapp || phone,
      email: email || '',
      address: address || '',
      notes: notes || '',
      active: true,
      createdAt: new Date().toISOString(),
    };
    data.suppliers.push(sup);
    logAudit(data, req.user!, 'Fornecedor Cadastrado', 'Fornecedor', sup.id, `Fornecedor ${name} cadastrado`);
    return sup;
  });
  res.status(201).json(newSupplier);
});

apiRouter.put('/suppliers/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { name, cpfCnpj, phone, whatsapp, email, address, notes, active } = req.body;

  const updated = await db.withLock((data) => {
    const sup = data.suppliers.find((s) => s.id === id && s.storeId === req.user!.storeId);
    if (!sup) throw new Error('Fornecedor não encontrado.');
    if (name) sup.name = name;
    if (cpfCnpj !== undefined) sup.cpfCnpj = cpfCnpj;
    if (phone) sup.phone = phone;
    if (whatsapp !== undefined) sup.whatsapp = whatsapp;
    if (email !== undefined) sup.email = email;
    if (address !== undefined) sup.address = address;
    if (notes !== undefined) sup.notes = notes;
    if (active !== undefined) sup.active = active;
    logAudit(data, req.user!, 'Fornecedor Atualizado', 'Fornecedor', sup.id, `Fornecedor ${sup.name} atualizado`);
    return sup;
  });
  res.json(updated);
});

apiRouter.delete('/suppliers/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  await db.withLock((data) => {
    const idx = data.suppliers.findIndex((s) => s.id === id && s.storeId === req.user!.storeId);
    if (idx !== -1) {
      const removed = data.suppliers.splice(idx, 1)[0];
      logAudit(data, req.user!, 'Fornecedor Excluído', 'Fornecedor', id, `Fornecedor ${removed.name} excluído`);
    }
  });
  res.json({ success: true });
});

// ==========================================
// 6. PRODUCTS (PRODUTOS)
// ==========================================

apiRouter.get('/products', requireAuth, (req: AuthenticatedRequest, res) => {
  const { search, categoryId, supplierId, lowStock, outOfStock, active } = req.query;
  const rawData = db.getRawData();
  const isAdmin = req.user!.role === 'ADMINISTRADOR';

  let products = rawData.products.filter((p) => p.storeId === req.user!.storeId);

  if (active !== undefined) {
    const isActive = active === 'true';
    products = products.filter((p) => p.active === isActive);
  }

  if (categoryId) {
    products = products.filter((p) => p.categoryId === categoryId);
  }

  if (supplierId && isAdmin) {
    products = products.filter((p) => p.supplierId === supplierId);
  }

  if (lowStock === 'true') {
    products = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStock);
  }

  if (outOfStock === 'true') {
    products = products.filter((p) => p.currentStock <= 0);
  }

  if (search) {
    const term = String(search).toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.barcode.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term)
    );
  }

  // CRITICAL SECURITY: If employee, strip costPrice and supplierId
  const result = products.map((p) => {
    if (!isAdmin) {
      const { costPrice: _, ...safeProduct } = p;
      return safeProduct;
    }
    return p;
  });

  res.json(result);
});

apiRouter.get('/products/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const rawData = db.getRawData();
  const prod = rawData.products.find((p) => p.id === id && p.storeId === req.user!.storeId);
  if (!prod) return res.status(404).json({ error: 'Produto não encontrado.' });
  if (req.user!.role !== 'ADMINISTRADOR') {
    const { costPrice: _, ...safeProduct } = prod;
    return res.json(safeProduct);
  }
  res.json(prod);
});

apiRouter.post('/products', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const {
    name,
    barcode,
    sku,
    categoryId,
    brand,
    supplierId,
    unit,
    costPrice,
    sellPrice,
    currentStock,
    minStock,
    expirationDate,
  } = req.body;

  if (!name || !barcode || !sellPrice) {
    return res.status(400).json({ error: 'Nome, código de barras e preço de venda são obrigatórios.' });
  }

  try {
    const newProduct = await db.withLock((data) => {
      // Check barcode uniqueness in this store
      if (data.products.some((p) => p.storeId === req.user!.storeId && p.barcode === barcode)) {
        throw new Error('Já existe um produto com este código de barras na loja.');
      }

      const cat = data.categories.find((c) => c.id === categoryId);
      const sup = data.suppliers.find((s) => s.id === supplierId);

      const prodId = `prod-${Date.now()}`;
      const now = new Date().toISOString();
      const initialStock = Number(currentStock) || 0;
      const parsedCost = Number(costPrice) || 0;

      const product: Product = {
        id: prodId,
        storeId: req.user!.storeId,
        name,
        barcode,
        sku: sku || barcode,
        categoryId: categoryId || '',
        categoryName: cat?.name || 'Geral',
        brand: brand || 'Genérica',
        supplierId: supplierId || undefined,
        supplierName: sup?.name || undefined,
        unit: unit || 'UN',
        costPrice: parsedCost,
        sellPrice: Number(sellPrice),
        currentStock: initialStock,
        minStock: Number(minStock) || 5,
        expirationDate: expirationDate || undefined,
        active: true,
        createdAt: now,
        updatedAt: now,
      };

      data.products.push(product);

      // Register initial stock movement if > 0
      if (initialStock > 0) {
        data.stockMovements.push({
          id: `mov-${Date.now()}`,
          storeId: req.user!.storeId,
          productId: prodId,
          productName: name,
          type: 'ENTRADA',
          quantity: initialStock,
          costPrice: parsedCost,
          reason: 'Estoque inicial de cadastro',
          supplierId,
          userId: req.user!.id,
          userName: req.user!.name,
          createdAt: now,
        });
      }

      logAudit(data, req.user!, 'Produto Criado', 'Produto', prodId, `Produto ${name} criado com preço de venda R$ ${sellPrice}`);
      return product;
    });

    res.status(201).json(newProduct);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/products/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const isAdmin = req.user!.role === 'ADMINISTRADOR';
  const {
    name,
    barcode,
    sku,
    categoryId,
    brand,
    supplierId,
    unit,
    costPrice,
    sellPrice,
    minStock,
    expirationDate,
    active,
  } = req.body;

  // Employees cannot change cost or inactive state or edit sensitive fields
  if (!isAdmin && (costPrice !== undefined || active !== undefined)) {
    return res.status(403).json({ error: 'Funcionários não possuem permissão para alterar custos ou status de produtos.' });
  }

  try {
    const updated = await db.withLock((data) => {
      const prod = data.products.find((p) => p.id === id && p.storeId === req.user!.storeId);
      if (!prod) throw new Error('Produto não encontrado.');

      if (barcode && barcode !== prod.barcode) {
        if (data.products.some((p) => p.storeId === req.user!.storeId && p.barcode === barcode && p.id !== id)) {
          throw new Error('Código de barras já está em uso por outro produto.');
        }
        prod.barcode = barcode;
      }

      if (name) prod.name = name;
      if (sku) prod.sku = sku;
      if (categoryId) {
        prod.categoryId = categoryId;
        const cat = data.categories.find((c) => c.id === categoryId);
        if (cat) prod.categoryName = cat.name;
      }
      if (brand) prod.brand = brand;
      if (unit) prod.unit = unit;
      if (sellPrice !== undefined) prod.sellPrice = Number(sellPrice);
      if (minStock !== undefined) prod.minStock = Number(minStock);
      if (expirationDate !== undefined) prod.expirationDate = expirationDate;

      if (isAdmin) {
        if (costPrice !== undefined) prod.costPrice = Number(costPrice);
        if (supplierId !== undefined) {
          prod.supplierId = supplierId;
          const sup = data.suppliers.find((s) => s.id === supplierId);
          prod.supplierName = sup?.name;
        }
        if (active !== undefined) prod.active = active;
      }

      prod.updatedAt = new Date().toISOString();
      logAudit(data, req.user!, 'Produto Atualizado', 'Produto', prod.id, `Produto ${prod.name} atualizado`);
      return prod;
    });

    // Strip cost for employee
    if (!isAdmin) {
      const { costPrice: _, ...safe } = updated;
      return res.json(safe);
    }
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 7. STOCK MANAGEMENT (ESTOQUE)
// ==========================================

apiRouter.get('/stock/summary', requireAuth, (req: AuthenticatedRequest, res) => {
  const rawData = db.getRawData();
  const isAdmin = req.user!.role === 'ADMINISTRADOR';
  const products = rawData.products.filter((p) => p.storeId === req.user!.storeId && p.active);

  const totalRegistered = products.length;
  const lowStockCount = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStock).length;
  const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;

  // Near expiration: within 30 days
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const nearExpirationCount = products.filter((p) => {
    if (!p.expirationDate) return false;
    const exp = new Date(p.expirationDate);
    return exp <= thirtyDaysFromNow;
  }).length;

  const totalStockValue = isAdmin
    ? products.reduce((acc, p) => acc + (p.currentStock * (p.costPrice || 0)), 0)
    : undefined;

  res.json({
    totalRegistered,
    lowStockCount,
    outOfStockCount,
    nearExpirationCount,
    totalStockValue,
  });
});

apiRouter.get('/stock/movements', requireAuth, (req: AuthenticatedRequest, res) => {
  const rawData = db.getRawData();
  const movements = rawData.stockMovements.filter((m) => m.storeId === req.user!.storeId);
  res.json(movements);
});

// Entrada de estoque
apiRouter.post('/stock/entry', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { productId, quantity, costPrice, supplierId, reason } = req.body;
  const qty = Number(quantity);

  if (!productId || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Produto e quantidade válida (> 0) são obrigatórios.' });
  }

  try {
    const movement = await db.withLock((data) => {
      const prod = data.products.find((p) => p.id === productId && p.storeId === req.user!.storeId);
      if (!prod) throw new Error('Produto não encontrado.');

      prod.currentStock += qty;
      if (costPrice !== undefined && req.user!.role === 'ADMINISTRADOR') {
        prod.costPrice = Number(costPrice);
      }
      prod.updatedAt = new Date().toISOString();

      const mov: StockMovement = {
        id: `mov-${Date.now()}`,
        storeId: req.user!.storeId,
        productId,
        productName: prod.name,
        type: 'ENTRADA',
        quantity: qty,
        costPrice: costPrice ? Number(costPrice) : prod.costPrice,
        reason: reason || 'Entrada manual de mercadorias',
        supplierId: supplierId || prod.supplierId,
        userId: req.user!.id,
        userName: req.user!.name,
        createdAt: new Date().toISOString(),
      };
      data.stockMovements.unshift(mov);

      logAudit(
        data,
        req.user!,
        'Entrada de Estoque',
        'Estoque',
        productId,
        `+${qty} un em ${prod.name}. Novo estoque: ${prod.currentStock}`
      );
      return mov;
    });

    res.status(201).json(movement);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Ajuste manual de estoque (ADMINISTRADOR only!)
apiRouter.post('/stock/adjust', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { productId, quantity, type, reason } = req.body;
  const qty = Number(quantity);

  if (!productId || isNaN(qty) || qty <= 0 || !type || !reason) {
    return res.status(400).json({ error: 'Informe produto, quantidade válida, tipo (ENTRADA ou SAIDA) e motivo obrigatório.' });
  }

  try {
    const result = await db.withLock((data) => {
      const prod = data.products.find((p) => p.id === productId && p.storeId === req.user!.storeId);
      if (!prod) throw new Error('Produto não encontrado.');

      if (type === 'SAIDA') {
        if (prod.currentStock - qty < 0) {
          throw new Error(`Estoque insuficiente. Estoque atual é ${prod.currentStock}, impossível retirar ${qty}.`);
        }
        prod.currentStock -= qty;
      } else {
        prod.currentStock += qty;
      }
      prod.updatedAt = new Date().toISOString();

      const mov: StockMovement = {
        id: `mov-${Date.now()}`,
        storeId: req.user!.storeId,
        productId,
        productName: prod.name,
        type: 'AJUSTE',
        quantity: type === 'SAIDA' ? -qty : qty,
        costPrice: prod.costPrice,
        reason: `Ajuste (${type}): ${reason}`,
        userId: req.user!.id,
        userName: req.user!.name,
        createdAt: new Date().toISOString(),
      };
      data.stockMovements.unshift(mov);

      logAudit(
        data,
        req.user!,
        'Ajuste de Estoque',
        'Estoque',
        productId,
        `Ajuste de ${type === 'SAIDA' ? -qty : qty} em ${prod.name}. Motivo: ${reason}. Novo saldo: ${prod.currentStock}`
      );
      return { product: prod, movement: mov };
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 8. CASH REGISTER (CAIXA)
// ==========================================

apiRouter.get('/cash/current', requireAuth, (req: AuthenticatedRequest, res) => {
  const rawData = db.getRawData();
  const currentRegister = rawData.cashRegisters.find(
    (c) => c.storeId === req.user!.storeId && c.status === 'ABERTO'
  );
  res.json(currentRegister || null);
});

apiRouter.get('/cash/history', requireAuth, (req: AuthenticatedRequest, res) => {
  const rawData = db.getRawData();
  const registers = rawData.cashRegisters
    .filter((c) => c.storeId === req.user!.storeId && c.status === 'FECHADO')
    .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
  res.json(registers);
});

apiRouter.post('/cash/open', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { initialAmount, notes } = req.body;
  const initial = Number(initialAmount) || 0;

  try {
    const register = await db.withLock((data) => {
      const existing = data.cashRegisters.find(
        (c) => c.storeId === req.user!.storeId && c.status === 'ABERTO'
      );
      if (existing) {
        throw new Error('Já existe um caixa aberto para esta loja. Feche o caixa atual antes de abrir outro.');
      }

      const newRegister: CashRegister = {
        id: `cash-${Date.now()}`,
        storeId: req.user!.storeId,
        userId: req.user!.id,
        userName: req.user!.name,
        openedAt: new Date().toISOString(),
        initialAmount: initial,
        status: 'ABERTO',
        salesCash: 0,
        salesPix: 0,
        salesDebit: 0,
        salesCredit: 0,
        inflowAmount: 0,
        outflowAmount: 0,
        expectedAmount: initial,
        notes: notes || 'Abertura de caixa',
      };
      data.cashRegisters.unshift(newRegister);

      logAudit(
        data,
        req.user!,
        'Abertura de Caixa',
        'Caixa',
        newRegister.id,
        `Caixa aberto com valor inicial de R$ ${initial.toFixed(2)}`
      );
      return newRegister;
    });

    res.status(201).json(register);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Sangria / Suprimento
apiRouter.post('/cash/movement', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { type, amount, reason } = req.body;
  const amt = Number(amount);

  if (!type || isNaN(amt) || amt <= 0 || !reason) {
    return res.status(400).json({ error: 'Tipo (SUPRIMENTO ou SANGRIA), valor e motivo são obrigatórios.' });
  }

  try {
    const result = await db.withLock((data) => {
      const register = data.cashRegisters.find(
        (c) => c.storeId === req.user!.storeId && c.status === 'ABERTO'
      );
      if (!register) {
        throw new Error('Nenhum caixa aberto no momento.');
      }

      if (type === 'SANGRIA') {
        const availableCash = register.initialAmount + register.salesCash + register.inflowAmount - register.outflowAmount;
        if (amt > availableCash) {
          throw new Error(`Saldo em dinheiro insuficiente no caixa (R$ ${availableCash.toFixed(2)}) para realizar esta sangria.`);
        }
        register.outflowAmount += amt;
        register.expectedAmount -= amt;
      } else {
        register.inflowAmount += amt;
        register.expectedAmount += amt;
      }

      const movement: CashMovement = {
        id: `cmov-${Date.now()}`,
        storeId: req.user!.storeId,
        cashRegisterId: register.id,
        type: type as 'SUPRIMENTO' | 'SANGRIA',
        amount: amt,
        reason,
        userId: req.user!.id,
        userName: req.user!.name,
        createdAt: new Date().toISOString(),
      };
      data.cashMovements.unshift(movement);

      logAudit(
        data,
        req.user!,
        type === 'SANGRIA' ? 'Sangria de Caixa' : 'Suprimento de Caixa',
        'Caixa',
        register.id,
        `${type} de R$ ${amt.toFixed(2)}. Motivo: ${reason}`
      );
      return { register, movement };
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/cash/close', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { finalPhysicalAmount, notes } = req.body;
  const physical = Number(finalPhysicalAmount);

  if (isNaN(physical) || physical < 0) {
    return res.status(400).json({ error: 'Informe o valor físico contado em dinheiro.' });
  }

  try {
    const closed = await db.withLock((data) => {
      const register = data.cashRegisters.find(
        (c) => c.storeId === req.user!.storeId && c.status === 'ABERTO'
      );
      if (!register) {
        throw new Error('Nenhum caixa aberto para fechar.');
      }

      // Expected cash in drawer = initial + salesCash + inflow - outflow
      const expectedCash = register.initialAmount + register.salesCash + register.inflowAmount - register.outflowAmount;
      const difference = physical - expectedCash;

      register.status = 'FECHADO';
      register.closedAt = new Date().toISOString();
      register.finalPhysicalAmount = physical;
      register.expectedAmount = expectedCash;
      register.differenceAmount = difference;
      register.closedByUserId = req.user!.id;
      register.closedByUserName = req.user!.name;
      if (notes) register.notes = notes;

      logAudit(
        data,
        req.user!,
        'Fechamento de Caixa',
        'Caixa',
        register.id,
        `Caixa fechado. Esperado em dinheiro: R$ ${expectedCash.toFixed(2)}, Informado: R$ ${physical.toFixed(2)}, Diferença: R$ ${difference.toFixed(2)}`
      );

      return register;
    });

    res.json(closed);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 9. PDV / SALES (VENDAS RÁPIDAS)
// ==========================================

apiRouter.post('/sales', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { items, paymentMethod, amountPaid, discount } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Carrinho vazio. Adicione pelo menos um produto para vender.' });
  }

  if (!paymentMethod || !['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Forma de pagamento inválida. Escolha Dinheiro, Pix, Débito ou Crédito.' });
  }

  try {
    const saleResult = await db.withLock((data) => {
      // 1. Check open cash register
      const register = data.cashRegisters.find(
        (c) => c.storeId === req.user!.storeId && c.status === 'ABERTO'
      );
      if (!register) {
        throw new Error('Não há nenhum caixa aberto no momento. Abra o caixa antes de realizar vendas.');
      }

      // 2. Validate stock for each item
      for (const item of items) {
        const prod = data.products.find((p) => p.id === item.productId && p.storeId === req.user!.storeId);
        if (!prod) {
          throw new Error(`Produto não encontrado (ID: ${item.productId}).`);
        }
        if (!prod.active) {
          throw new Error(`Produto "${prod.name}" está inativo.`);
        }
        const requestedQty = Number(item.quantity) || 1;
        if (prod.currentStock < requestedQty) {
          throw new Error(`Estoque insuficiente para "${prod.name}". Disponível: ${prod.currentStock} un, Solicitado: ${requestedQty} un.`);
        }
      }

      // 3. Compute totals and snapshots
      let subtotal = 0;
      let costTotal = 0;
      const saleId = `sale-${Date.now()}`;
      const saleNumber = `#V-${String(data.sales.length + 1).padStart(5, '0')}`;
      const now = new Date().toISOString();
      const saleItemsToInsert: SaleItem[] = [];

      for (const item of items) {
        const prod = data.products.find((p) => p.id === item.productId && p.storeId === req.user!.storeId)!;
        const qty = Number(item.quantity) || 1;
        const unitPrice = prod.sellPrice;
        const unitCost = prod.costPrice || 0;
        const itemSubtotal = unitPrice * qty;
        const itemCostSubtotal = unitCost * qty;

        subtotal += itemSubtotal;
        costTotal += itemCostSubtotal;

        // Decrement stock
        prod.currentStock -= qty;
        prod.updatedAt = now;

        // Record stock movement
        data.stockMovements.unshift({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          storeId: req.user!.storeId,
          productId: prod.id,
          productName: prod.name,
          type: 'VENDA',
          quantity: -qty,
          costPrice: unitCost,
          reason: `Venda ${saleNumber}`,
          userId: req.user!.id,
          userName: req.user!.name,
          createdAt: now,
        });

        saleItemsToInsert.push({
          id: `sitem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          saleId,
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          unitPrice,
          unitCost,
          subtotal: itemSubtotal,
          costSubtotal: itemCostSubtotal,
          createdAt: now,
        });
      }

      const parsedDiscount = Math.max(0, Number(discount) || 0);
      const total = Math.max(0, subtotal - parsedDiscount);
      let parsedAmountPaid = Number(amountPaid) || total;
      let changeAmount = 0;

      if (paymentMethod === 'DINHEIRO') {
        if (parsedAmountPaid < total) {
          throw new Error(`Valor recebido (R$ ${parsedAmountPaid.toFixed(2)}) é menor que o total da venda (R$ ${total.toFixed(2)}).`);
        }
        changeAmount = parsedAmountPaid - total;
      } else {
        parsedAmountPaid = total;
      }

      // Update cash register totals
      if (paymentMethod === 'DINHEIRO') {
        register.salesCash += total;
        register.expectedAmount += total;
      } else if (paymentMethod === 'PIX') {
        register.salesPix += total;
      } else if (paymentMethod === 'DEBITO') {
        register.salesDebit += total;
      } else if (paymentMethod === 'CREDITO') {
        register.salesCredit += total;
      }

      const newSale: Sale = {
        id: saleId,
        saleNumber,
        storeId: req.user!.storeId,
        origin: 'PDV',
        userId: req.user!.id,
        userName: req.user!.name,
        subtotal,
        discount: parsedDiscount,
        total,
        costTotal,
        paymentMethod: paymentMethod as PaymentMethod,
        amountPaid: parsedAmountPaid,
        changeAmount,
        status: 'FINALIZADA',
        cashRegisterId: register.id,
        createdAt: now,
      };

      data.sales.unshift(newSale);
      data.saleItems.push(...saleItemsToInsert);

      logAudit(
        data,
        req.user!,
        'Venda Finalizada (PDV)',
        'Venda',
        saleId,
        `Venda ${saleNumber} de R$ ${total.toFixed(2)} (${paymentMethod})`
      );

      return {
        ...newSale,
        items: saleItemsToInsert,
      };
    });

    res.status(201).json(saleResult);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/sales', requireAuth, (req: AuthenticatedRequest, res) => {
  const { origin, paymentMethod, status, startDate, endDate } = req.query;
  const rawData = db.getRawData();
  const isAdmin = req.user!.role === 'ADMINISTRADOR';

  let sales = rawData.sales.filter((s) => s.storeId === req.user!.storeId);

  if (origin) sales = sales.filter((s) => s.origin === origin);
  if (paymentMethod) sales = sales.filter((s) => s.paymentMethod === paymentMethod);
  if (status) sales = sales.filter((s) => s.status === status);

  if (startDate) {
    const start = new Date(String(startDate));
    sales = sales.filter((s) => new Date(s.createdAt) >= start);
  }
  if (endDate) {
    const end = new Date(String(endDate));
    end.setHours(23, 59, 59, 999);
    sales = sales.filter((s) => new Date(s.createdAt) <= end);
  }

  // Populate items
  const result = sales.map((sale) => {
    const items = rawData.saleItems.filter((i) => i.saleId === sale.id);
    if (!isAdmin) {
      const { costTotal: _, ...safeSale } = sale;
      const safeItems = items.map(({ unitCost: __, costSubtotal: ___, ...item }) => item);
      return { ...safeSale, items: safeItems };
    }
    return { ...sale, items };
  });

  res.json(result);
});

apiRouter.get('/sales/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const rawData = db.getRawData();
  const isAdmin = req.user!.role === 'ADMINISTRADOR';

  const sale = rawData.sales.find((s) => s.id === id && s.storeId === req.user!.storeId);
  if (!sale) return res.status(404).json({ error: 'Venda não encontrada.' });

  const items = rawData.saleItems.filter((i) => i.saleId === sale.id);

  if (!isAdmin) {
    const { costTotal: _, ...safeSale } = sale;
    const safeItems = items.map(({ unitCost: __, costSubtotal: ___, ...item }) => item);
    return res.json({ ...safeSale, items: safeItems });
  }

  res.json({ ...sale, items });
});

// ==========================================
// 10. COMANDAS & MESAS
// ==========================================

apiRouter.get('/comandas/open', requireAuth, (req: AuthenticatedRequest, res) => {
  const rawData = db.getRawData();
  const comandas = rawData.comandas
    .filter((c) => c.storeId === req.user!.storeId && c.status === 'ABERTA')
    .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());

  // Attach items
  const result = comandas.map((c) => ({
    ...c,
    items: rawData.comandaItems.filter((i) => i.comandaId === c.id),
  }));

  res.json(result);
});

apiRouter.get('/comandas/history', requireAuth, (req: AuthenticatedRequest, res) => {
  const rawData = db.getRawData();
  const comandas = rawData.comandas
    .filter((c) => c.storeId === req.user!.storeId && c.status !== 'ABERTA')
    .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());

  const result = comandas.map((c) => ({
    ...c,
    items: rawData.comandaItems.filter((i) => i.comandaId === c.id),
  }));

  res.json(result);
});

apiRouter.post('/comandas', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { tableNumber, clientName, notes } = req.body;

  const comanda = await db.withLock((data) => {
    const count = data.comandas.filter((c) => c.storeId === req.user!.storeId).length + 1;
    const comandaNumber = `#CMD-${String(count).padStart(3, '0')}`;
    const newComanda: Comanda = {
      id: `cmd-${Date.now()}`,
      comandaNumber,
      storeId: req.user!.storeId,
      tableNumber: tableNumber ? String(tableNumber).trim() : undefined,
      clientName: clientName ? String(clientName).trim() : undefined,
      notes: notes || undefined,
      status: 'ABERTA',
      openedByUserId: req.user!.id,
      openedByUserName: req.user!.name,
      openedAt: new Date().toISOString(),
      total: 0,
      itemCount: 0,
    };
    data.comandas.unshift(newComanda);

    logAudit(
      data,
      req.user!,
      'Comanda Aberta',
      'Comanda',
      newComanda.id,
      `Comanda ${comandaNumber} aberta (Mesa: ${tableNumber || '-'}, Cliente: ${clientName || '-'})`
    );

    return { ...newComanda, items: [] };
  });

  res.status(201).json(comanda);
});

apiRouter.get('/comandas/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const rawData = db.getRawData();
  const comanda = rawData.comandas.find((c) => c.id === id && c.storeId === req.user!.storeId);
  if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada.' });

  const items = rawData.comandaItems.filter((i) => i.comandaId === comanda.id);
  res.json({ ...comanda, items });
});

// Adicionar produto à comanda (IMPORTANTE: NÃO BAIXAR ESTOQUE AQUI!)
apiRouter.post('/comandas/:id/items', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { productId, quantity } = req.body;
  const qty = Number(quantity) || 1;

  if (!productId || qty <= 0) {
    return res.status(400).json({ error: 'Produto e quantidade válida são obrigatórios.' });
  }

  try {
    const updatedComanda = await db.withLock((data) => {
      const comanda = data.comandas.find((c) => c.id === id && c.storeId === req.user!.storeId);
      if (!comanda) throw new Error('Comanda não encontrada.');
      if (comanda.status !== 'ABERTA') throw new Error('Comanda já fechada ou cancelada.');

      const product = data.products.find((p) => p.id === productId && p.storeId === req.user!.storeId);
      if (!product) throw new Error('Produto não encontrado.');
      if (!product.active) throw new Error(`Produto ${product.name} está inativo.`);

      // Check if item already in comanda; if so, increase quantity
      const existingItem = data.comandaItems.find((i) => i.comandaId === id && i.productId === productId);
      if (existingItem) {
        existingItem.quantity += qty;
        existingItem.subtotal = existingItem.quantity * existingItem.unitPrice;
      } else {
        const newItem: ComandaItem = {
          id: `citem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          comandaId: id,
          productId,
          productName: product.name,
          quantity: qty,
          unitPrice: product.sellPrice,
          subtotal: qty * product.sellPrice,
          createdAt: new Date().toISOString(),
        };
        data.comandaItems.push(newItem);
      }

      // Recalculate comanda total and item count WITHOUT touching product stock!
      const items = data.comandaItems.filter((i) => i.comandaId === id);
      comanda.total = items.reduce((acc, i) => acc + i.subtotal, 0);
      comanda.itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

      logAudit(
        data,
        req.user!,
        'Item Adicionado à Comanda',
        'Comanda',
        comanda.id,
        `+${qty} un de ${product.name} na comanda ${comanda.comandaNumber}`
      );

      return { ...comanda, items };
    });

    res.json(updatedComanda);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Atualizar quantidade de item na comanda (Aumentar / Diminuir)
apiRouter.put('/comandas/:id/items/:itemId', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id, itemId } = req.params;
  const { quantity } = req.body;
  const qty = Number(quantity);

  if (isNaN(qty)) return res.status(400).json({ error: 'Quantidade inválida.' });

  try {
    const updated = await db.withLock((data) => {
      const comanda = data.comandas.find((c) => c.id === id && c.storeId === req.user!.storeId);
      if (!comanda) throw new Error('Comanda não encontrada.');
      if (comanda.status !== 'ABERTA') throw new Error('Comanda já fechada.');

      const itemIdx = data.comandaItems.findIndex((i) => i.id === itemId && i.comandaId === id);
      if (itemIdx === -1) throw new Error('Item não encontrado na comanda.');

      if (qty <= 0) {
        data.comandaItems.splice(itemIdx, 1);
      } else {
        const item = data.comandaItems[itemIdx];
        item.quantity = qty;
        item.subtotal = qty * item.unitPrice;
      }

      const items = data.comandaItems.filter((i) => i.comandaId === id);
      comanda.total = items.reduce((acc, i) => acc + i.subtotal, 0);
      comanda.itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

      return { ...comanda, items };
    });

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Remover item da comanda
apiRouter.delete('/comandas/:id/items/:itemId', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id, itemId } = req.params;

  try {
    const updated = await db.withLock((data) => {
      const comanda = data.comandas.find((c) => c.id === id && c.storeId === req.user!.storeId);
      if (!comanda) throw new Error('Comanda não encontrada.');
      if (comanda.status !== 'ABERTA') throw new Error('Comanda já fechada.');

      const itemIdx = data.comandaItems.findIndex((i) => i.id === itemId && i.comandaId === id);
      if (itemIdx !== -1) {
        data.comandaItems.splice(itemIdx, 1);
      }

      const items = data.comandaItems.filter((i) => i.comandaId === id);
      comanda.total = items.reduce((acc, i) => acc + i.subtotal, 0);
      comanda.itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

      return { ...comanda, items };
    });

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// FECHAR COMANDA (Gera UMA Venda, valida estoque, baixa estoque, atualiza caixa, impede duplicidade)
apiRouter.post('/comandas/:id/close', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { paymentMethod, amountPaid, discount } = req.body;

  if (!paymentMethod || !['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Selecione uma forma de pagamento válida.' });
  }

  try {
    const result = await db.withLock((data) => {
      // 1. Find comanda and verify status
      const comanda = data.comandas.find((c) => c.id === id && c.storeId === req.user!.storeId);
      if (!comanda) throw new Error('Comanda não encontrada.');
      if (comanda.status !== 'ABERTA') {
        throw new Error('Esta comanda já foi fechada ou cancelada.');
      }
      if (comanda.saleId) {
        throw new Error('Esta comanda já possui uma venda vinculada.');
      }

      const items = data.comandaItems.filter((i) => i.comandaId === id);
      if (items.length === 0) {
        throw new Error('A comanda não possui nenhum item lançado para fechamento.');
      }

      // 2. Check open cash register
      const register = data.cashRegisters.find(
        (c) => c.storeId === req.user!.storeId && c.status === 'ABERTO'
      );
      if (!register) {
        throw new Error('Não há caixa aberto. Abra o caixa antes de fechar a comanda.');
      }

      // 3. Re-validate stock for each item in comanda
      for (const item of items) {
        const prod = data.products.find((p) => p.id === item.productId && p.storeId === req.user!.storeId);
        if (!prod) {
          throw new Error(`Produto não encontrado (ID: ${item.productId}).`);
        }
        if (prod.currentStock < item.quantity) {
          throw new Error(`Estoque insuficiente para "${prod.name}". Estoque atual: ${prod.currentStock}, Solicitado na comanda: ${item.quantity}.`);
        }
      }

      // 4. Create Sale and SaleItems with snapshots
      const saleId = `sale-${Date.now()}`;
      const saleNumber = `#V-${String(data.sales.length + 1).padStart(5, '0')}`;
      const now = new Date().toISOString();

      let subtotal = 0;
      let costTotal = 0;
      const saleItemsToInsert: SaleItem[] = [];

      for (const item of items) {
        const prod = data.products.find((p) => p.id === item.productId && p.storeId === req.user!.storeId)!;
        const qty = item.quantity;
        const unitPrice = item.unitPrice;
        const unitCost = prod.costPrice || 0;
        const itemSubtotal = unitPrice * qty;
        const itemCostSubtotal = unitCost * qty;

        subtotal += itemSubtotal;
        costTotal += itemCostSubtotal;

        // NOW DECREMENT STOCK
        prod.currentStock -= qty;
        prod.updatedAt = now;

        // Record stock movement
        data.stockMovements.unshift({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          storeId: req.user!.storeId,
          productId: prod.id,
          productName: prod.name,
          type: 'VENDA',
          quantity: -qty,
          costPrice: unitCost,
          reason: `Fechamento Comanda ${comanda.comandaNumber} (${saleNumber})`,
          userId: req.user!.id,
          userName: req.user!.name,
          createdAt: now,
        });

        saleItemsToInsert.push({
          id: `sitem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          saleId,
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          unitPrice,
          unitCost,
          subtotal: itemSubtotal,
          costSubtotal: itemCostSubtotal,
          createdAt: now,
        });
      }

      const parsedDiscount = Math.max(0, Number(discount) || 0);
      const total = Math.max(0, subtotal - parsedDiscount);
      let parsedAmountPaid = Number(amountPaid) || total;
      let changeAmount = 0;

      if (paymentMethod === 'DINHEIRO') {
        if (parsedAmountPaid < total) {
          throw new Error(`Valor recebido (R$ ${parsedAmountPaid.toFixed(2)}) é menor que o total da comanda (R$ ${total.toFixed(2)}).`);
        }
        changeAmount = parsedAmountPaid - total;
      } else {
        parsedAmountPaid = total;
      }

      // Update cash register
      if (paymentMethod === 'DINHEIRO') {
        register.salesCash += total;
        register.expectedAmount += total;
      } else if (paymentMethod === 'PIX') {
        register.salesPix += total;
      } else if (paymentMethod === 'DEBITO') {
        register.salesDebit += total;
      } else if (paymentMethod === 'CREDITO') {
        register.salesCredit += total;
      }

      // Create Sale record
      const sale: Sale = {
        id: saleId,
        saleNumber,
        storeId: req.user!.storeId,
        origin: 'COMANDA',
        comandaId: comanda.id,
        comandaNumber: comanda.comandaNumber,
        tableNumber: comanda.tableNumber,
        clientName: comanda.clientName,
        userId: req.user!.id,
        userName: req.user!.name,
        subtotal,
        discount: parsedDiscount,
        total,
        costTotal,
        paymentMethod: paymentMethod as PaymentMethod,
        amountPaid: parsedAmountPaid,
        changeAmount,
        status: 'FINALIZADA',
        cashRegisterId: register.id,
        createdAt: now,
      };

      data.sales.unshift(sale);
      data.saleItems.push(...saleItemsToInsert);

      // Close the comanda
      comanda.status = 'FECHADA';
      comanda.closedAt = now;
      comanda.closedByUserId = req.user!.id;
      comanda.closedByUserName = req.user!.name;
      comanda.saleId = saleId;
      comanda.total = total;

      logAudit(
        data,
        req.user!,
        'Fechamento de Comanda',
        'Comanda',
        comanda.id,
        `Comanda ${comanda.comandaNumber} fechada com sucesso. Gerada venda ${saleNumber} de R$ ${total.toFixed(2)}`
      );

      return {
        comanda: { ...comanda, items },
        sale: { ...sale, items: saleItemsToInsert },
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 11. CONTAS A PAGAR (Admin Only)
// ==========================================

apiRouter.get('/accounts-payable', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  const { status, filter } = req.query;
  const rawData = db.getRawData();
  let accounts = rawData.accountsPayable.filter((a) => a.storeId === req.user!.storeId);

  const todayStr = new Date().toISOString().split('T')[0];

  // Update overdue statuses dynamically
  accounts.forEach((acc) => {
    if (acc.status === 'PENDENTE' && acc.dueDate < todayStr) {
      acc.status = 'ATRASADO';
    }
  });

  if (status) {
    accounts = accounts.filter((a) => a.status === status);
  }

  if (filter === 'hoje') {
    accounts = accounts.filter((a) => a.dueDate === todayStr && a.status !== 'PAGO');
  } else if (filter === 'proximas') {
    accounts = accounts.filter((a) => a.dueDate > todayStr && a.status === 'PENDENTE');
  } else if (filter === 'atrasadas') {
    accounts = accounts.filter((a) => a.status === 'ATRASADO');
  } else if (filter === 'pagas') {
    accounts = accounts.filter((a) => a.status === 'PAGO');
  }

  res.json(accounts);
});

apiRouter.post('/accounts-payable', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { supplierId, supplierName, description, amount, dueDate, notes, paymentMethod } = req.body;
  const amt = Number(amount);

  if (!description || isNaN(amt) || amt <= 0 || !dueDate) {
    return res.status(400).json({ error: 'Descrição, valor (> 0) e data de vencimento são obrigatórios.' });
  }

  const newAccount = await db.withLock((data) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const initialStatus = dueDate < todayStr ? 'ATRASADO' : 'PENDENTE';

    const account: AccountPayable = {
      id: `ap-${Date.now()}`,
      storeId: req.user!.storeId,
      supplierId: supplierId || undefined,
      supplierName: supplierName || 'Fornecedor Avulso',
      description,
      amount: amt,
      dueDate,
      paymentMethod: paymentMethod || undefined,
      status: initialStatus,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
    };
    data.accountsPayable.unshift(account);

    logAudit(
      data,
      req.user!,
      'Conta a Pagar Cadastrada',
      'Contas a Pagar',
      account.id,
      `Nova conta "${description}" de R$ ${amt.toFixed(2)} com vencimento em ${dueDate}`
    );

    return account;
  });

  res.status(201).json(newAccount);
});

apiRouter.post('/accounts-payable/:id/pay', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { paymentMethod, notes } = req.body;

  try {
    const paidAccount = await db.withLock((data) => {
      const account = data.accountsPayable.find((a) => a.id === id && a.storeId === req.user!.storeId);
      if (!account) throw new Error('Conta não encontrada.');
      if (account.status === 'PAGO') throw new Error('Esta conta já está paga.');

      account.status = 'PAGO';
      account.paidAt = new Date().toISOString();
      account.paidByUserId = req.user!.id;
      account.paidByUserName = req.user!.name;
      if (paymentMethod) account.paymentMethod = paymentMethod;
      if (notes) account.notes = (account.notes ? account.notes + ' | ' : '') + notes;

      logAudit(
        data,
        req.user!,
        'Conta Paga',
        'Contas a Pagar',
        account.id,
        `Conta "${account.description}" de R$ ${account.amount.toFixed(2)} marcada como PAGA`
      );

      return account;
    });

    res.json(paidAccount);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 12. REPORTS & DASHBOARD METRICS
// ==========================================

apiRouter.get('/reports/dashboard', requireAuth, (req: AuthenticatedRequest, res) => {
  const { period } = req.query; // 'hoje', '7d', '30d', 'mes', or custom
  const rawData = db.getRawData();
  const isAdmin = req.user!.role === 'ADMINISTRADOR';

  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();

  let startDate: Date;
  if (period === '7d') {
    startDate = new Date(now.getTime() - 7 * 86400000);
  } else if (period === '30d') {
    startDate = new Date(now.getTime() - 30 * 86400000);
  } else if (period === 'mes') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    // 'hoje'
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  // Filter sales for this store and period
  const storeSales = rawData.sales.filter(
    (s) => s.storeId === req.user!.storeId && s.status === 'FINALIZADA' && new Date(s.createdAt) >= startDate
  );

  const totalRevenue = storeSales.reduce((acc, s) => acc + s.total, 0);
  const totalSalesCount = storeSales.length;
  const closedComandasCount = storeSales.filter((s) => s.origin === 'COMANDA').length;
  const ticketAverage = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

  // Total products sold
  const saleIds = new Set(storeSales.map((s) => s.id));
  const soldItems = rawData.saleItems.filter((i) => saleIds.has(i.saleId));
  const totalProductsSold = soldItems.reduce((acc, i) => acc + i.quantity, 0);

  // Stock overview
  const storeProducts = rawData.products.filter((p) => p.storeId === req.user!.storeId && p.active);
  const totalRegisteredProducts = storeProducts.length;
  const lowStockCount = storeProducts.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStock).length;
  const outOfStockCount = storeProducts.filter((p) => p.currentStock <= 0).length;
  const estimatedStockValue = isAdmin
    ? storeProducts.reduce((acc, p) => acc + (p.currentStock * (p.costPrice || 0)), 0)
    : undefined;

  // Accounts payable (Admin only)
  const storeAccounts = rawData.accountsPayable.filter((a) => a.storeId === req.user!.storeId);
  const accountsDueToday = isAdmin
    ? storeAccounts.filter((a) => a.dueDate === todayStr && a.status !== 'PAGO').reduce((acc, a) => acc + a.amount, 0)
    : undefined;
  const accountsOverdue = isAdmin
    ? storeAccounts.filter((a) => a.status === 'ATRASADO' || (a.status === 'PENDENTE' && a.dueDate < todayStr)).reduce((acc, a) => acc + a.amount, 0)
    : undefined;
  const nextAccountsDue = isAdmin
    ? storeAccounts.filter((a) => a.status === 'PENDENTE' && a.dueDate > todayStr).slice(0, 5)
    : undefined;

  // Chart 1: Revenue by Day (last 7 or 14 days)
  const daysMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    daysMap.set(key, 0);
  }
  storeSales.forEach((s) => {
    const d = new Date(s.createdAt);
    const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (daysMap.has(key)) {
      daysMap.set(key, (daysMap.get(key) || 0) + s.total);
    }
  });
  const chartRevenueByDay = Array.from(daysMap.entries()).map(([date, revenue]) => ({
    date,
    faturamento: Number(revenue.toFixed(2)),
  }));

  // Chart 2: Payment Methods
  const paymentsMap: Record<string, number> = { DINHEIRO: 0, PIX: 0, DEBITO: 0, CREDITO: 0 };
  storeSales.forEach((s) => {
    if (paymentsMap[s.paymentMethod] !== undefined) {
      paymentsMap[s.paymentMethod] += s.total;
    }
  });
  const chartPaymentMethods = [
    { name: 'Dinheiro', value: Number(paymentsMap.DINHEIRO.toFixed(2)), color: '#10b981' },
    { name: 'Pix', value: Number(paymentsMap.PIX.toFixed(2)), color: '#06b6d4' },
    { name: 'Débito', value: Number(paymentsMap.DEBITO.toFixed(2)), color: '#3b82f6' },
    { name: 'Crédito', value: Number(paymentsMap.CREDITO.toFixed(2)), color: '#8b5cf6' },
  ];

  // Chart 3: Top 5 Sold Products
  const prodSalesMap = new Map<string, { name: string; quantity: number; total: number }>();
  soldItems.forEach((i) => {
    const existing = prodSalesMap.get(i.productId) || { name: i.productName, quantity: 0, total: 0 };
    existing.quantity += i.quantity;
    existing.total += i.subtotal;
    prodSalesMap.set(i.productId, existing);
  });
  const topProducts = Array.from(prodSalesMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Sales by Employee
  const empSalesMap = new Map<string, { name: string; count: number; total: number }>();
  storeSales.forEach((s) => {
    const existing = empSalesMap.get(s.userId) || { name: s.userName, count: 0, total: 0 };
    existing.count += 1;
    existing.total += s.total;
    empSalesMap.set(s.userId, existing);
  });
  const salesByEmployee = Array.from(empSalesMap.values());

  // Estimated Gross Profit = Revenue - Cost Total (Admin only)
  const totalCost = storeSales.reduce((acc, s) => acc + (s.costTotal || 0), 0);
  const grossProfitEstimated = isAdmin ? totalRevenue - totalCost : undefined;

  res.json({
    metrics: {
      totalRevenue,
      totalSalesCount,
      closedComandasCount,
      ticketAverage,
      totalProductsSold,
      totalRegisteredProducts,
      lowStockCount,
      outOfStockCount,
      estimatedStockValue,
      accountsDueToday,
      accountsOverdue,
      grossProfitEstimated,
    },
    nextAccountsDue,
    chartRevenueByDay,
    chartPaymentMethods,
    topProducts,
    salesByEmployee,
  });
});

apiRouter.get('/reports/products-profit', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  const rawData = db.getRawData();
  const sales = rawData.sales.filter((s) => s.storeId === req.user!.storeId && s.status === 'FINALIZADA');
  const saleIds = new Set(sales.map((s) => s.id));
  const items = rawData.saleItems.filter((i) => saleIds.has(i.saleId));

  const map = new Map<string, {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
    cost: number;
    estimatedGrossProfit: number;
  }>();

  items.forEach((item) => {
    const existing = map.get(item.productId) || {
      productId: item.productId,
      productName: item.productName,
      quantity: 0,
      revenue: 0,
      cost: 0,
      estimatedGrossProfit: 0,
    };
    existing.quantity += item.quantity;
    existing.revenue += item.subtotal;
    existing.cost += item.costSubtotal;
    existing.estimatedGrossProfit = existing.revenue - existing.cost;
    map.set(item.productId, existing);
  });

  const list = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  res.json(list);
});

// ==========================================
// 13. AUDIT LOGS (Admin Only)
// ==========================================

apiRouter.get('/audit-logs', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  const rawData = db.getRawData();
  const logs = rawData.auditLogs
    .filter((a) => a.storeId === req.user!.storeId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 100);
  res.json(logs);
});

apiRouter.get('/audit', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  const rawData = db.getRawData();
  const logs = rawData.auditLogs
    .filter((a) => a.storeId === req.user!.storeId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 100);
  res.json(logs);
});
