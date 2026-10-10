// ============================================================
// CitySync — Landing Page Branding & Background Configuration
// ============================================================

export interface LandingPageConfig {
  appName: string;
  tagline: string;
  description: string;
  /**
   * Background image URL or path. Can be a local asset or URL.
   * If empty or invalid, the landing page uses an attractive modern gradient fallback.
   */
  backgroundImageUrl: string;
  /** Background overlay opacity (0 to 1) */
  overlayOpacity: number;
  /** Custom fallback gradient */
  gradientFallback: string;
  /** Accent highlights */
  locationBadge: string;
  accentCity: string;
}

export const LANDING_PAGE_CONFIG: LandingPageConfig = {
  appName: 'CitySync',
  tagline: 'Coordinating infrastructure. Connecting communities.',
  description:
    'CitySync helps residents track public works projects, understand construction progress, and improve coordination between government departments.',
  // Modern civic infrastructure image (Chennai cityscape / modern urban architecture aesthetic)
  backgroundImageUrl: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=2000&q=80',
  overlayOpacity: 0.82,
  gradientFallback: 'radial-gradient(ellipse at top, #1e3a5f 0%, #0f172a 60%, #030712 100%)',
  locationBadge: 'Chennai, Tamil Nadu',
  accentCity: 'Greater Chennai Corporation',
};
