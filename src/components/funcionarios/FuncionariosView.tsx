import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  UserX,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { api } from '../../services/api';
import { User, UserRole } from '../../types';
import { formatDate } from '../../utils/formatters';

export const FuncionariosView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'FUNCIONARIO' as UserRole,
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar colaboradores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    setError(null);
    try {
      const created = await api.createUser({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
      });

      setUsers([...users, created]);
      setShowModal(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'FUNCIONARIO',
      });
      setSuccess(`Colaborador "${created.name}" cadastrado com sucesso!`);
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar usuário.');
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newActive = !user.active;
    try {
      const updated = await api.updateUser(user.id, { active: newActive });
      setUsers(users.map((u) => (u.id === updated.id ? updated : u)));
      setSuccess(`Status de "${user.name}" alterado para ${newActive ? 'Ativo' : 'Inativo'}.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar status do colaborador.');
    }
  };

  const handleToggleRole = async (user: User) => {
    const newRole: UserRole = user.role === 'ADMINISTRADOR' ? 'FUNCIONARIO' : 'ADMINISTRADOR';
    if (!confirm(`Alterar permissão de "${user.name}" para ${newRole === 'ADMINISTRADOR' ? 'Administrador' : 'Operador'}?`)) {
      return;
    }
    try {
      const updated = await api.updateUser(user.id, { role: newRole });
      setUsers(users.map((u) => (u.id === updated.id ? updated : u)));
      setSuccess(`Cargo de "${user.name}" atualizado para ${newRole === 'ADMINISTRADOR' ? 'Administrador' : 'Operador'}.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar cargo.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Controle de Funcionários e Permissões
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Gerencie operadores de caixa, gerentes e administradores da sua loja.
          </p>
        </div>

        <button
          id="btn-new-employee"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 text-xs sm:text-sm transition shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          Novo Colaborador
        </button>
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

      {/* Permission Guide Callout */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs space-y-2 text-slate-600">
        <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Matriz de Perfis e Permissões (Validadas no Backend e Banco de Dados)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="rounded-xl bg-white p-3 border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">
              • Operador de Caixa / Atendente (EMPLOYEE)
            </span>
            <p className="text-slate-500 text-[11px]">
              Acesso ao PDV Balcão, Comandas/Mesas, Consulta rápida de catálogo e Abertura/Fechamento do seu turno de caixa. Não tem acesso a custos de fornecedores, contas a pagar, cadastro de equipe ou relatórios financeiros de margens.
            </p>
          </div>

          <div className="rounded-xl bg-white p-3 border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">
              • Administrador / Gerente Geral (ADMIN)
            </span>
            <p className="text-slate-500 text-[11px]">
              Acesso irrestrito a todo o sistema, edição de preço de custo e venda, ajustes manuais de auditoria de estoque, contas a pagar, fornecedores, relatórios de Lucro Bruto Estimado e gestão de usuários.
            </p>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3">Colaborador</th>
                <th className="px-4 py-3">E-mail de Acesso</th>
                <th className="px-4 py-3 text-center">Nível / Cargo</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Cadastro</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-bold text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">{u.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                        u.role === 'ADMINISTRADOR'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {u.role === 'ADMINISTRADOR' ? 'Administrador' : 'Operador de Caixa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        u.active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-[11px]">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleToggleRole(u)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition"
                        title="Alternar entre Administrador e Operador"
                      >
                        Alternar Cargo
                      </button>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                          u.active
                            ? 'text-rose-700 hover:bg-rose-50'
                            : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title={u.active ? 'Desativar acesso' : 'Reativar acesso'}
                      >
                        {u.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Cadastrar Novo Colaborador
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail de Login *
                </label>
                <input
                  type="email"
                  required
                  placeholder="carlos@conveniencia.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Senha Provisória *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nível de Permissão *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                >
                  <option value="FUNCIONARIO">Operador de Caixa (Vendas, PDV e Mesas)</option>
                  <option value="ADMINISTRADOR">Administrador Geral (Acesso Completo)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-xs transition shadow-md"
                >
                  Criar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
