import React, { useState } from 'react';
import { Store, Lock, Mail, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuthView: React.FC = () => {
  const { login } = useAuth();
  const [isRecovering, setIsRecovering] = useState<boolean>(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Informe o e-mail cadastrado.');
      return;
    }
    setError(null);
    setSuccess('Instruções de recuperação enviadas para o e-mail informado.');
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 mb-3.5">
            <Store className="h-8 w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Entre Copos Gestão
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Plataforma Comercial • PDV • Comandas • Estoque
          </p>
        </div>

        {/* Main Card - Login Only */}
        <div className="rounded-2xl bg-white text-slate-900 p-6 sm:p-8 shadow-2xl shadow-black/40 border border-slate-100">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              {isRecovering ? 'Recuperar Senha' : 'Acesse sua conta'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRecovering
                ? 'Digite seu e-mail cadastrado para redefinir o acesso.'
                : 'Informe suas credenciais para acessar o sistema.'}
            </p>
          </div>

          {/* Error & Success Messages */}
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Login Form */}
          {!isRecovering ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  E-mail de Acesso
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    id="input-login-email"
                    type="email"
                    required
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Senha</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecovering(true);
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-xs text-amber-600 hover:text-amber-700 font-semibold"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    id="input-login-password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <button
                id="btn-submit-login"
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 text-sm transition shadow-md disabled:opacity-50 active:scale-[0.99]"
              >
                {loading ? 'Autenticando...' : 'Entrar no Sistema'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            /* Recovery Form */
            <form onSubmit={handleRecovery} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  E-mail cadastrado
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-sm transition shadow-md"
              >
                Enviar Link de Recuperação
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRecovering(false);
                  setError(null);
                  setSuccess(null);
                }}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-semibold pt-1"
              >
                ← Voltar para o Login
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-slate-500">
          Entre Copos Gestão • Todos os direitos reservados
        </div>
      </div>
    </div>
  );
};
