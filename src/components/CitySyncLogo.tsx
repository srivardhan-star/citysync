import React from 'react';

interface CitySyncLogoProps {
  /** Size variant or pixel dimension */
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Whether to show the CitySync wordmark alongside the monogram */
  showWordmark?: boolean;
  /** Wordmark text theme: light for dark backgrounds, dark for light backgrounds */
  theme?: 'dark' | 'light';
  /** Optional subtitle or municipal tag */
  subtitle?: string;
  className?: string;
}

export default function CitySyncLogo({
  size = 'md',
  showWordmark = true,
  theme = 'dark',
  subtitle,
  className = '',
}: CitySyncLogoProps) {
  // Determine pixel size for the icon mark
  const pixelSize =
    typeof size === 'number'
      ? size
      : size === 'sm'
      ? 28
      : size === 'md'
      ? 36
      : size === 'lg'
      ? 44
      : 54;

  const isDarkSurface = theme === 'dark';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Geometric C Monogram Symbol */}
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
        aria-label="CitySync Logo Mark"
      >
        <defs>
          <linearGradient id="citysync-c-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
          <filter id="citysync-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#7C3AED" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Squircle container background */}
        <rect
          width="100"
          height="100"
          rx="24"
          fill="#0F172A"
          stroke="#7C3AED"
          strokeWidth="2.5"
          strokeOpacity="0.4"
        />

        {/* Ambient subtle inner glow */}
        <circle cx="50" cy="50" r="34" fill="#7C3AED" fillOpacity="0.08" />

        {/* Modern Geometric C Monogram */}
        <path
          d="M 68 28
             L 42 28
             A 22 22 0 0 0 20 50
             A 22 22 0 0 0 42 72
             L 68 72"
          fill="none"
          stroke="url(#citysync-c-gradient)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#citysync-glow)"
        />

        {/* Architectural coordination node / accent */}
        <circle cx="68" cy="50" r="4.5" fill="#F472B6" />
      </svg>

      {/* Modern Sans-Serif Wordmark */}
      {showWordmark && (
        <div className="flex flex-col text-left leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-tight ${
                size === 'sm'
                  ? 'text-base'
                  : size === 'md'
                  ? 'text-lg'
                  : size === 'lg'
                  ? 'text-xl'
                  : 'text-2xl'
              } ${isDarkSurface ? 'text-[#F8FAFC]' : 'text-slate-900'}`}
            >
              City<span className="text-[#A855F7]">Sync</span>
            </span>
          </div>
          {subtitle && (
            <span
              className={`text-[11px] font-medium mt-1 tracking-normal ${
                isDarkSurface ? 'text-purple-200/70' : 'text-slate-500'
              }`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
