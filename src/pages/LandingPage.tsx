// ============================================================
// CitySync — Modern Civic-Tech Landing Page
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  ArrowRight,
  Lock,
  MapPin,
  AlertTriangle,
  Users,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react';
import { useTranslation, LanguageSelector } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { LANDING_PAGE_CONFIG } from '../config/landingConfig';

export default function LandingPage() {
  const { t } = useTranslation();
  const { setUserRole } = useApp();
  const navigate = useNavigate();
  const [bgFailed, setBgFailed] = useState(false);

  // Navigate directly to Public Dashboard without authentication
  const handleContinueToDashboard = () => {
    setUserRole('public');
    navigate('/dashboard');
  };

  // Navigate to dedicated Government Login
  const handleGovLogin = () => {
    navigate('/login');
  };

  return (
    <div className="relative min-h-screen flex flex-col text-slate-100 overflow-x-hidden selection:bg-blue-500 selection:text-white">
      {/* ── Background with Customizable Config & Gradient Fallback ── */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center transition-opacity duration-700 pointer-events-none"
        style={{
          backgroundImage:
            !bgFailed && LANDING_PAGE_CONFIG.backgroundImageUrl
              ? `url("${LANDING_PAGE_CONFIG.backgroundImageUrl}")`
              : undefined,
          background: bgFailed || !LANDING_PAGE_CONFIG.backgroundImageUrl
            ? LANDING_PAGE_CONFIG.gradientFallback
            : undefined,
        }}
      >
        {/* Hidden image element to detect load error and fall back smoothly */}
        {LANDING_PAGE_CONFIG.backgroundImageUrl && !bgFailed && (
          <img
            src={LANDING_PAGE_CONFIG.backgroundImageUrl}
            alt="background-loader"
            className="hidden"
            onError={() => setBgFailed(true)}
          />
        )}
        {/* Darkening & Color Gradient Overlays for optimal civic-tech contrast */}
        <div
          className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px]"
          style={{ opacity: LANDING_PAGE_CONFIG.overlayOpacity }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-blue-950/40" />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between border-b border-white/10">
        {/* CitySync Wordmark & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-sky-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/15">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-extrabold text-xl tracking-tight text-white flex items-center gap-2">
              {LANDING_PAGE_CONFIG.appName}
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {LANDING_PAGE_CONFIG.locationBadge}
              </span>
            </div>
            <p className="text-xs text-blue-200/80 font-medium">
              {t('app.portalSub')}
            </p>
          </div>
        </div>

        {/* Header Right: Language Selector & Login Shortcut */}
        <div className="flex items-center gap-3">
          <LanguageSelector variant="landing" />
          <button
            onClick={handleGovLogin}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-blue-200 hover:text-white transition-all border border-white/10 active:scale-95"
            aria-label={t('landing.btnGovLogin')}
          >
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span>{t('landing.btnGovLogin')}</span>
          </button>
        </div>
      </header>

      {/* ── Main Hero Section ── */}
      <main className="relative z-10 flex-1 flex flex-col justify-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="max-w-3xl">
          {/* Civic Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/15 border border-blue-400/30 text-blue-300 mb-6 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t('landing.heroBadge')}</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] mb-4">
            {t('landing.heroTitle')}
          </h1>

          {/* Tagline */}
          <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-300 via-sky-200 to-indigo-200 bg-clip-text text-transparent mb-4">
            "{t('app.tagline')}"
          </p>

          {/* Core Description */}
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-8 max-w-2xl font-normal">
            {t('landing.heroDesc')}
          </p>

          {/* ── Action Buttons ── */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-10">
            {/* Button A: Continue to Public Dashboard */}
            <button
              id="continue-to-dashboard-btn"
              onClick={handleContinueToDashboard}
              className="group relative flex-1 sm:flex-initial flex items-center justify-between sm:justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white rounded-xl font-bold text-base shadow-xl shadow-blue-900/30 hover:shadow-blue-700/40 transition-all transform hover:-translate-y-0.5 active:scale-95 border border-sky-400/30"
            >
              <div className="flex flex-col text-left">
                <span className="leading-tight flex items-center gap-2">
                  {t('landing.btnDashboard')}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
                <span className="text-[11px] font-normal text-sky-100/90 mt-0.5">
                  {t('landing.btnDashboardSub')}
                </span>
              </div>
            </button>

            {/* Button B: Government Login */}
            <button
              id="government-login-btn"
              onClick={handleGovLogin}
              className="flex-1 sm:flex-initial flex items-center justify-between sm:justify-center gap-3 px-6 py-4 bg-slate-900/90 hover:bg-slate-800 text-white rounded-xl font-bold text-base shadow-lg transition-all border border-slate-700/80 hover:border-slate-600 transform hover:-translate-y-0.5 active:scale-95"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0 text-blue-300">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="leading-tight text-slate-100">
                    {t('landing.btnGovLogin')}
                  </span>
                  <span className="text-[11px] font-normal text-slate-400 mt-0.5">
                    {t('landing.btnGovLoginSub')}
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/10">
            <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/5">
              <div className="text-xl font-extrabold text-sky-300">12</div>
              <div className="text-xs text-slate-400">{t('landing.statProjects')}</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/5">
              <div className="text-xl font-extrabold text-blue-300">11</div>
              <div className="text-xs text-slate-400">{t('landing.statNeighborhoods')}</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/5">
              <div className="text-xl font-extrabold text-indigo-300">7+</div>
              <div className="text-xs text-slate-400">{t('landing.statCoordination')}</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/5">
              <div className="text-xl font-extrabold text-emerald-300">100%</div>
              <div className="text-xs text-slate-400">{t('landing.statCitizensSub')}</div>
            </div>
          </div>
        </div>

        {/* ── Key Feature Cards Section ── */}
        <div className="mt-16 pt-12 border-t border-white/10">
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-white">
              {t('landing.featuresTitle')}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {t('landing.featuresSub')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Feature 1 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md hover:border-slate-700 transition-all hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/30">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base mb-2">
                {t('landing.feat1Title')}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('landing.feat1Desc')}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md hover:border-slate-700 transition-all hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4 border border-amber-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base mb-2">
                {t('landing.feat2Title')}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('landing.feat2Desc')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md hover:border-slate-700 transition-all hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/30">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base mb-2">
                {t('landing.feat3Title')}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('landing.feat3Desc')}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md hover:border-slate-700 transition-all hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4 border border-purple-500/30">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base mb-2">
                {t('landing.feat4Title')}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('landing.feat4Desc')}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div>{t('landing.footerText')}</div>
        <div className="flex items-center gap-4">
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
            {t('landing.demoBadge')}
          </span>
          <button
            onClick={handleContinueToDashboard}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            {t('landing.btnDashboard')}
          </button>
          <button
            onClick={handleGovLogin}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            {t('landing.btnGovLogin')}
          </button>
        </div>
      </footer>
    </div>
  );
}
