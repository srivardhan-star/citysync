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
  // Wide, cinematic modern civic infrastructure & skyline image at dusk/night
  backgroundImageUrl: '/images/hero-cityscape.jpg',
  overlayOpacity: 0.85,
  // Deep Navy & Purple ambient glow fallback
  gradientFallback: 'radial-gradient(ellipse at 50% 20%, #2e1065 0%, #0f172a 60%, #030712 100%)',
  locationBadge: 'Chennai, Tamil Nadu',
  accentCity: 'Greater Chennai Corporation',
};
