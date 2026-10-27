interface KavachLogoProps {
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
  className?: string;
}

export function KavachLogo({ size = 'md', subtitle, className = '' }: KavachLogoProps) {
  const iconDimensions =
    size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';
  const wordmarkSize =
    size === 'sm'
      ? 'text-lg tracking-[0.14em]'
      : size === 'lg'
        ? 'text-2xl tracking-[0.16em]'
        : 'text-xl tracking-[0.15em]';

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <div className={`relative flex items-center justify-center shrink-0 ${iconDimensions}`}>
        <svg
          viewBox="0 0 44 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full kavach-shield-glow"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="kavachShieldFill" x1="6" y1="4" x2="38" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="52%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#0F295C" />
            </linearGradient>
            <linearGradient id="kavachShieldStroke" x1="4" y1="2" x2="40" y2="46" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#67E8F9" />
              <stop offset="55%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1E40AF" />
            </linearGradient>
            <linearGradient id="kavachCoreGlow" x1="15" y1="14" x2="29" y2="33" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E0F2FE" />
              <stop offset="100%" stopColor="#22D3EE" />
            </linearGradient>
          </defs>

          {/* Outer Shield Silhouette */}
          <path
            d="M22 2.5L6.5 8.8V21.6C6.5 32.3 13.1 41.6 22 45.5C30.9 41.6 37.5 32.3 37.5 21.6V8.8L22 2.5Z"
            fill="url(#kavachShieldFill)"
            stroke="url(#kavachShieldStroke)"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Inner Cyber Bevel */}
          <path
            d="M22 6.6L10.3 11.4V21.3C10.3 29.8 15.3 37.3 22 40.7C28.7 37.3 33.7 29.8 33.7 21.3V11.4L22 6.6Z"
            stroke="#93C5FD"
            strokeOpacity="0.28"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />

          {/* Cybersecurity Circuit Nodes & Lock Core */}
          <path
            d="M17.5 20V17.4C17.5 14.9 19.5 12.9 22 12.9C24.5 12.9 26.5 14.9 26.5 17.4V20"
            stroke="url(#kavachCoreGlow)"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <rect
            x="15.2"
            y="20"
            width="13.6"
            height="11.2"
            rx="2.6"
            fill="#08142C"
            stroke="url(#kavachCoreGlow)"
            strokeWidth="1.9"
          />
          <circle cx="22" cy="24.5" r="1.6" fill="#22D3EE" />
          <path
            d="M22 26.1V28.6"
            stroke="#22D3EE"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Subtle Cyber Network Traces */}
          <path
            d="M11.8 18.5H14.5M29.5 18.5H32.2"
            stroke="#67E8F9"
            strokeOpacity="0.65"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="flex flex-col leading-none">
        <span className={`font-extrabold text-white ${wordmarkSize}`}>
          KAVACH
        </span>
        {subtitle && (
          <span className="text-[11px] font-medium tracking-wide text-slate-400 mt-1">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
