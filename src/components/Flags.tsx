import React from 'react';
import type {Power} from '../theme';

/** Self-contained SVG flags (period-appropriate, simplified). ViewBox 60x40. */
export const FlagSvg: React.FC<{power: Power; width: number; style?: React.CSSProperties}> = ({power, width, style}) => {
  const h = (width * 2) / 3;
  const common = {width, height: h, viewBox: '0 0 60 40', style: {display: 'block', ...style}} as const;
  switch (power) {
    case 'britain':
      return (
        <svg {...common}>
          <clipPath id="ukc"><rect width="60" height="40" /></clipPath>
          <rect width="60" height="40" fill="#012169" />
          <g clipPath="url(#ukc)">
            <path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" strokeWidth="8" />
            <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="3" />
            <path d="M30,0 V40 M0,20 H60" stroke="#fff" strokeWidth="13" />
            <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="8" />
          </g>
        </svg>
      );
    case 'france':
      return (
        <svg {...common}>
          <rect width="20" height="40" fill="#0055A4" />
          <rect x="20" width="20" height="40" fill="#fff" />
          <rect x="40" width="20" height="40" fill="#EF4135" />
        </svg>
      );
    case 'germany': // German Empire 1871–1918
      return (
        <svg {...common}>
          <rect width="60" height="13.4" fill="#000" />
          <rect y="13.3" width="60" height="13.4" fill="#fff" />
          <rect y="26.6" width="60" height="13.4" fill="#DD0000" />
        </svg>
      );
    case 'belgium':
      return (
        <svg {...common}>
          <rect width="20" height="40" fill="#000" />
          <rect x="20" width="20" height="40" fill="#FDDA24" />
          <rect x="40" width="20" height="40" fill="#EF3340" />
        </svg>
      );
    case 'portugal': // Kingdom of Portugal 1830–1910
      return (
        <svg {...common}>
          <rect width="30" height="40" fill="#1F4FA3" />
          <rect x="30" width="30" height="40" fill="#fff" />
          <circle cx="30" cy="20" r="7" fill="#D4A017" />
          <rect x="26" y="16" width="8" height="8" fill="#C8102E" />
        </svg>
      );
    case 'italy':
      return (
        <svg {...common}>
          <rect width="20" height="40" fill="#009246" />
          <rect x="20" width="20" height="40" fill="#fff" />
          <rect x="40" width="20" height="40" fill="#CE2B37" />
          <rect x="26" y="12" width="8" height="16" fill="#C8102E" stroke="#1F4FA3" strokeWidth="1" />
          <path d="M30,13 V27 M26.5,20 H33.5" stroke="#fff" strokeWidth="1.5" />
        </svg>
      );
    case 'spain': // 1785–1931
      return (
        <svg {...common}>
          <rect width="60" height="40" fill="#AA151B" />
          <rect y="10" width="60" height="20" fill="#F1BF00" />
        </svg>
      );
    case 'ottoman':
      return (
        <svg {...common}>
          <rect width="60" height="40" fill="#E30A17" />
          <circle cx="24" cy="20" r="10" fill="#fff" />
          <circle cx="26.5" cy="20" r="8" fill="#E30A17" />
          <polygon
            points="36,20 31.2,21.6 31.2,18.4 36,20 33.7,16.1 34.8,19.7 38.4,16.1 35.5,20 38.4,23.9 34.8,20.3 33.7,23.9"
            fill="#fff"
            transform="translate(-1 0)"
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect width="60" height="40" fill="#7a6e55" />
        </svg>
      );
  }
};
