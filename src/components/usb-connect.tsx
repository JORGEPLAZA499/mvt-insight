/**
 * Animated illustration: laptop ↔ USB cable ↔ phone.
 * Uses semantic tokens only; keyframes live in src/styles.css.
 */
export function UsbConnect() {
  return (
    <div className="w-full flex justify-center">
      <svg
        viewBox="0 0 400 180"
        className="w-full max-w-md h-auto"
        role="img"
        aria-label="Ordenador conectado por cable USB a un teléfono"
      >
        <defs>
          <linearGradient id="usb-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="color-mix(in oklab, var(--primary) 80%, transparent)" />
            <stop offset="100%" stopColor="color-mix(in oklab, var(--primary) 80%, transparent)" />
          </linearGradient>
          <linearGradient id="usb-screen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="color-mix(in oklab, var(--primary) 0.25, transparent)" />
            <stop offset="100%" stopColor="color-mix(in oklab, var(--primary) 0.05, transparent)" />
          </linearGradient>
        </defs>

        {/* Laptop */}
        <g className="usb-float">
          {/* screen */}
          <rect
            x="20" y="35" width="140" height="85" rx="6"
            fill="var(--card)"
            stroke="var(--border)"
            strokeWidth="2"
          />
          <rect
            x="28" y="43" width="124" height="69" rx="3"
            fill="url(#usb-screen)"
          />
          {/* tiny ui lines */}
          <rect x="36" y="52" width="36" height="4" rx="2" fill="color-mix(in oklab, var(--primary) 0.6, transparent)" />
          <rect x="36" y="62" width="80" height="3" rx="1.5" fill="color-mix(in oklab, var(--muted-foreground) 0.4, transparent)" />
          <rect x="36" y="70" width="60" height="3" rx="1.5" fill="color-mix(in oklab, var(--muted-foreground) 0.3, transparent)" />
          <rect x="36" y="78" width="70" height="3" rx="1.5" fill="color-mix(in oklab, var(--muted-foreground) 0.3, transparent)" />
          {/* base */}
          <path
            d="M10 120 L170 120 L160 130 L20 130 Z"
            fill="var(--card)"
            stroke="var(--border)"
            strokeWidth="2"
          />
          <rect x="78" y="120" width="24" height="2" rx="1" fill="color-mix(in oklab, var(--muted-foreground) 0.3, transparent)" />
        </g>

        {/* Phone */}
        <g className="usb-float-delay">
          <rect
            x="300" y="35" width="70" height="120" rx="10"
            fill="var(--card)"
            stroke="var(--border)"
            strokeWidth="2"
          />
          <rect
            x="306" y="46" width="58" height="92" rx="4"
            fill="url(#usb-screen)"
          />
          {/* notch */}
          <rect x="325" y="40" width="20" height="3" rx="1.5" fill="color-mix(in oklab, var(--muted-foreground) 0.4, transparent)" />
          {/* home indicator */}
          <rect x="324" y="148" width="22" height="3" rx="1.5" fill="color-mix(in oklab, var(--muted-foreground) 0.3, transparent)" />
          {/* signal bars */}
          <rect x="312" y="58" width="3" height="4" fill="color-mix(in oklab, var(--primary) 0.7, transparent)" />
          <rect x="317" y="56" width="3" height="6" fill="color-mix(in oklab, var(--primary) 0.7, transparent)" />
          <rect x="322" y="54" width="3" height="8" fill="color-mix(in oklab, var(--primary) 0.7, transparent)" />
          {/* lock icon-ish */}
          <circle cx="335" cy="85" r="8" fill="none" stroke="color-mix(in oklab, var(--primary) 0.8, transparent)" strokeWidth="1.5" />
          <rect x="332" y="82" width="6" height="6" rx="1" fill="color-mix(in oklab, var(--primary) 0.8, transparent)" />
        </g>

        {/* USB cable: animated dashed flow from laptop to phone */}
        <path
          d="M160 115 C 200 115, 230 165, 270 165 C 290 165, 295 150, 300 140 L 300 130"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="3"
          strokeLinecap="round"
          className="usb-cable"
        />

        {/* Connectors */}
        <rect x="155" y="110" width="10" height="10" rx="2" fill="var(--primary)" />
        <rect x="296" y="125" width="8" height="10" rx="2" fill="var(--primary)" />

        {/* Pulsing data dots near connectors */}
        <circle cx="160" cy="115" r="3" fill="var(--primary)" className="usb-pulse" />
        <circle cx="300" cy="130" r="3" fill="var(--primary)" className="usb-pulse" style={{ animationDelay: "0.8s" }} />
      </svg>
    </div>
  );
}
