// ============================================================
// CitySync — Government Administration Login Page (Deep Purple Rebrand)
// ============================================================

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Lock,
  User,
  ArrowLeft,
  AlertCircle,
  Info,
  Eye,
  EyeOff,
  Building2,
} from 'lucide-react';
import { useTranslation, LanguageSelector } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import {
  DEMO_GOV_CREDENTIALS,
  validateGovCredentials,
  saveSession,
} from '../config/authConfig';
import CitySyncLogo from '../components/CitySyncLogo';

export default function LoginPage() {
  const { t } = useTranslation();
  const { setUserRole } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Return destination if redirected by RouteGuard, otherwise /dashboard
  const fromLocation = (location.state as { from?: string })?.from || '/dashboard';

  const handleFillDemoCredentials = () => {
    setUsername(DEMO_GOV_CREDENTIALS.username);
    setPassword(DEMO_GOV_CREDENTIALS.password);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const validation = validateGovCredentials(username, password);

    if (!validation.success) {
      setIsLoading(false);
      setErrorMessage(t(validation.errorKey || 'auth.errorInvalid'));
      return;
    }

    // Establish minimal demo session
    saveSession({
      isAuthenticated: true,
      username: DEMO_GOV_CREDENTIALS.username,
      displayName: DEMO_GOV_CREDENTIALS.displayName,
      department: DEMO_GOV_CREDENTIALS.department,
      role: 'government',
      loginTime: new Date().toISOString(),
    });

    // Update app perspective
    setUserRole('government');

    // Smooth transition
    setTimeout(() => {
      setIsLoading(false);
      navigate(fromLocation, { replace: true });
    }, 300);
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-between"
      style={{ backgroundColor: 'var(--cs-bg)', color: 'var(--cs-text)' }}
    >
      {/* ── Top Bar ── */}
      <header
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between border-b"
        style={{ borderColor: 'var(--cs-border)' }}
      >
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors p-1"
          aria-label={t('auth.backToHome')}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('auth.backToHome')}</span>
        </button>

        <div className="flex items-center gap-3">
          <LanguageSelector variant="header" />
        </div>
      </header>

      {/* ── Login Form Container ── */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Card Header & Brand */}
          <div className="text-center mb-8 flex flex-col items-center">
            <CitySyncLogo size="xl" showWordmark={false} theme="dark" className="mb-4" />
            <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--cs-text)' }}>
              {t('auth.cardTitle')}
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--cs-muted)' }}>
              {t('auth.cardSubtitle')}
            </p>
          </div>

          {/* Form Card */}
          <div
            className="card p-6 sm:p-8 shadow-xl border rounded-2xl"
            style={{ backgroundColor: 'var(--cs-surface)', borderColor: 'var(--cs-border)' }}
          >
            {/* Error Message */}
            {errorMessage && (
              <div
                className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-400 animate-shake"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input */}
              <div>
                <label
                  htmlFor="gov-username"
                  className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--cs-text)' }}
                >
                  {t('auth.usernameLabel')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="gov-username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder={t('auth.usernamePlaceholder')}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{
                      backgroundColor: 'var(--cs-elevated)',
                      borderColor: 'var(--cs-border)',
                      color: 'var(--cs-text)',
                    }}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor="gov-password"
                  className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--cs-text)' }}
                >
                  {t('auth.passwordLabel')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="gov-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder={t('auth.passwordPlaceholder')}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{
                      backgroundColor: 'var(--cs-elevated)',
                      borderColor: 'var(--cs-border)',
                      color: 'var(--cs-text)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-purple-300"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="submit-login-btn"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-[#7C3AED] to-[#9333EA] hover:from-[#6D28D9] hover:to-[#7E22CE] text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-900/30 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-purple-400/30"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('auth.loggingIn')}</span>
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4" />
                    <span>{t('auth.loginBtn')}</span>
                  </>
                )}
              </button>
            </form>

            {/* ── Demo Credentials Hint for Hackathon Judges ── */}
            <div className="mt-6 pt-5 border-t" style={{ borderColor: 'var(--cs-border)' }}>
              <div
                className="p-3.5 rounded-xl border text-xs"
                style={{
                  backgroundColor: 'rgba(124, 58, 237, 0.1)',
                  borderColor: 'rgba(168, 85, 247, 0.3)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-purple-300">
                    <Info className="w-4 h-4 text-purple-400" />
                    <span>{t('auth.judgeHintTitle')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleFillDemoCredentials}
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 active:scale-95 transition-all shadow-sm"
                  >
                    Auto-fill
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-300">
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      {t('auth.judgeHintUser')}
                    </span>
                    <strong className="select-all text-purple-200">{DEMO_GOV_CREDENTIALS.username}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      {t('auth.judgeHintPass')}
                    </span>
                    <strong className="select-all text-purple-200">{DEMO_GOV_CREDENTIALS.password}</strong>
                  </div>
                </div>
                <p className="text-[10px] mt-2 text-slate-400 leading-normal">
                  {t('auth.judgeHintNote')}
                </p>
              </div>
            </div>
          </div>

          {/* Security Disclaimer */}
          <p
            className="text-[11px] text-center mt-6 px-4 leading-relaxed"
            style={{ color: 'var(--cs-muted)' }}
          >
            {t('auth.securityDisclaimer')}
          </p>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer
        className="w-full max-w-7xl mx-auto px-4 py-4 text-center text-xs border-t"
        style={{ borderColor: 'var(--cs-border)', color: 'var(--cs-muted)' }}
      >
        <span>CitySync — {t('app.portalSub')}</span>
      </footer>
    </div>
  );
}
