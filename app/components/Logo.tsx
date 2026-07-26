export function LogoSVG() {
  return (
    <svg width="220" height="64" viewBox="0 0 220 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff007f" />
          <stop offset="100%" stopColor="#00d4ff" />
        </linearGradient>
      </defs>
      
      {/* Background circle */}
      <circle cx="32" cy="32" r="28" fill="url(#grad1)" opacity="0.1" />
      
      {/* Main icon - stylized connection/network */}
      <g transform="translate(16, 16)">
        {/* Center dot */}
        <circle cx="16" cy="16" r="3" fill="#ff007f" />
        
        {/* Connection lines */}
        <line x1="16" y1="16" x2="8" y2="8" stroke="#ff007f" strokeWidth="2" />
        <line x1="16" y1="16" x2="24" y2="8" stroke="#00d4ff" strokeWidth="2" />
        <line x1="16" y1="16" x2="8" y2="24" stroke="#00d4ff" strokeWidth="2" />
        <line x1="16" y1="16" x2="24" y2="24" stroke="#ff007f" strokeWidth="2" />
        
        {/* Connecting dots */}
        <circle cx="8" cy="8" r="2" fill="#ff007f" />
        <circle cx="24" cy="8" r="2" fill="#00d4ff" />
        <circle cx="8" cy="24" r="2" fill="#00d4ff" />
        <circle cx="24" cy="24" r="2" fill="#ff007f" />
      </g>
      
      {/* Text */}
      <text x="56" y="38" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="bold" fill="#000">
        AVG
      </text>
      <text x="56" y="56" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="600" fill="#ff007f">
        CONNECTS
      </text>
    </svg>
  );
}
