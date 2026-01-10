interface NovaLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

export function NovaLogo({ size = "md", showText = true, className = "" }: NovaLogoProps) {
  const sizes = {
    sm: { icon: 24, text: "text-base", gap: "gap-1.5" },
    md: { icon: 32, text: "text-lg", gap: "gap-2" },
    lg: { icon: 40, text: "text-xl", gap: "gap-2.5" },
    xl: { icon: 56, text: "text-3xl", gap: "gap-3" },
  };

  const { icon, text, gap } = sizes[size];

  return (
    <div className={`flex items-center ${gap} ${className}`}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="novaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="novaAccent" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <circle cx="32" cy="32" r="28" fill="url(#novaGradient)" opacity="0.15" />
        
        <circle cx="32" cy="32" r="22" fill="url(#novaGradient)" opacity="0.3" />
        
        <circle cx="32" cy="32" r="16" fill="url(#novaGradient)" />
        
        <circle cx="32" cy="32" r="6" fill="url(#novaAccent)" filter="url(#glow)" />
        
        <circle cx="32" cy="8" r="3" fill="url(#novaAccent)" opacity="0.8" />
        <circle cx="32" cy="56" r="3" fill="url(#novaAccent)" opacity="0.8" />
        <circle cx="8" cy="32" r="3" fill="url(#novaAccent)" opacity="0.8" />
        <circle cx="56" cy="32" r="3" fill="url(#novaAccent)" opacity="0.8" />
        
        <line x1="32" y1="11" x2="32" y2="16" stroke="url(#novaAccent)" strokeWidth="1.5" opacity="0.6" />
        <line x1="32" y1="48" x2="32" y2="53" stroke="url(#novaAccent)" strokeWidth="1.5" opacity="0.6" />
        <line x1="11" y1="32" x2="16" y2="32" stroke="url(#novaAccent)" strokeWidth="1.5" opacity="0.6" />
        <line x1="48" y1="32" x2="53" y2="32" stroke="url(#novaAccent)" strokeWidth="1.5" opacity="0.6" />
        
        <circle cx="15" cy="15" r="2" fill="url(#novaGradient)" opacity="0.5" />
        <circle cx="49" cy="15" r="2" fill="url(#novaGradient)" opacity="0.5" />
        <circle cx="15" cy="49" r="2" fill="url(#novaGradient)" opacity="0.5" />
        <circle cx="49" cy="49" r="2" fill="url(#novaGradient)" opacity="0.5" />
      </svg>
      
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold ${text} bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent`}>
            Nova AI
          </span>
        </div>
      )}
    </div>
  );
}

export function NovaTagline({ className = "" }: { className?: string }) {
  return (
    <p className={`text-muted-foreground ${className}`}>
      Your Intelligent Support Companion
    </p>
  );
}
