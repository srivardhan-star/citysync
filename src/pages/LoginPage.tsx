// ============================================================
// CitySync — Government Administration Login Page
// ============================================================

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  Lock,
  User,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
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
          className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-1"
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
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-sky-500 text-white shadow-xl shadow-blue-600/20 mb-4 border border-blue-400/20">
              <Shield className="w-7 h-7" />
            </div>
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
                className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400 animate-shake"
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
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
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
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
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
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      backgroundColor: 'var(--cs-elevated)',
                      borderColor: 'var(--cs-border)',
                      color: 'var(--cs-text)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-600 hover:to-sky-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-700/20 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                  borderColor: 'rgba(59, 130, 246, 0.25)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300">
                    <Info className="w-4 h-4" />
                    <span>{t('auth.judgeHintTitle')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleFillDemoCredentials}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                  >
                    Auto-fill
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-gray-700 dark:text-gray-300">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block text-[10px]">
                      {t('auth.judgeHintUser')}
                    </span>
                    <strong className="select-all">{DEMO_GOV_CREDENTIALS.username}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block text-[10px]">
                      {t('auth.judgeHintPass')}
                    </span>
                    <strong className="select-all">{DEMO_GOV_CREDENTIALS.password}</strong>
                  </div>
                </div>
                <p className="text-[10px] mt-2 text-gray-500 dark:text-gray-400 leading-normal">
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
