import React from 'react';
import { VehicleType, ServiceType } from '../../types';

interface VehicleIllustrationProps {
  type: VehicleType;
  serviceType?: ServiceType;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isAssigned?: boolean;
}

/**
 * Clean, recognizable SVG vehicle illustrations for map markers and ride selection.
 * Distinct categories:
 * - Bike: Motorcycle / two-wheeler
 * - Auto: Auto-rickshaw 3-wheeler
 * - Mini: Compact hatchback
 * - Sedan: Sleek premium sedan
 * - Seven Seater: Spacious SUV / MUV
 * - RUBI CAB PINK: Distinctive pink styling
 */
export const VehicleIllustration: React.FC<VehicleIllustrationProps> = ({
  type,
  serviceType = 'rubi_cab',
  className = '',
  size = 'md',
  isAssigned = false,
}) => {
  const isPink = serviceType === 'rubi_pink';

  // Dimension scaling
  const dimension = {
    sm: { w: 28, h: 28, box: 32 },
    md: { w: 48, h: 36, box: 48 },
    lg: { w: 72, h: 52, box: 64 },
    xl: { w: 96, h: 68, box: 80 },
  }[size];

  // Colors
  const primaryBody = isPink ? '#EC4899' : '#0F172A'; // Pink vs Midnight Slate
  const accentRoof = isPink ? '#F472B6' : isAssigned ? '#F59E0B' : '#FBBF24'; // Yellow/Gold cab accent
  const glassColor = '#93C5FD'; // Soft windshield blue
  const tireColor = '#1E293B';

  switch (type) {
    case 'bike':
      return (
        <svg
          width={dimension.w}
          height={dimension.h}
          viewBox="0 0 64 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Motorcycle Illustration */}
          {/* Wheels */}
          <circle cx="14" cy="34" r="9" fill={tireColor} />
          <circle cx="14" cy="34" r="5" fill="#E2E8F0" stroke={tireColor} strokeWidth="1.5" />
          <circle cx="50" cy="34" r="9" fill={tireColor} />
          <circle cx="50" cy="34" r="5" fill="#E2E8F0" stroke={tireColor} strokeWidth="1.5" />

          {/* Engine block & exhaust */}
          <rect x="25" y="30" width="14" height="8" rx="2" fill="#64748B" />
          <path d="M36 34 L52 35" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />

          {/* Frame & Swingarm */}
          <path d="M14 34 L28 26 L38 26 L50 34" stroke={primaryBody} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M28 26 L34 16 L44 14" stroke={primaryBody} strokeWidth="3" strokeLinecap="round" />

          {/* Fuel Tank (Colored) */}
          <path d="M31 16 Q36 12 43 14 Q45 18 38 21 Z" fill={accentRoof} stroke={primaryBody} strokeWidth="1.5" />

          {/* Seat */}
          <path d="M22 21 Q27 20 33 21 Q34 23 23 24 Z" fill="#0B0F19" />

          {/* Handlebars & Headlight */}
          <path d="M44 14 L46 8" stroke="#0B0F19" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M42 9 L48 9" stroke="#0B0F19" strokeWidth="2" strokeLinecap="round" />
          <circle cx="48" cy="14" r="2.5" fill="#FEF08A" stroke="#EAB308" strokeWidth="0.8" />
        </svg>
      );

    case 'auto':
      return (
        <svg
          width={dimension.w}
          height={dimension.h}
          viewBox="0 0 64 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Classic Indian Auto-Rickshaw Illustration */}
          {/* Rear Wheel & Front Wheel */}
          <circle cx="16" cy="36" r="8" fill={tireColor} />
          <circle cx="16" cy="36" r="4" fill="#E2E8F0" />
          <circle cx="48" cy="36" r="6.5" fill={tireColor} />
          <circle cx="48" cy="36" r="3" fill="#E2E8F0" />

          {/* Lower Body (Black / Slate) */}
          <path
            d="M10 26 L12 36 L44 36 L52 30 L50 24 L22 24 Z"
            fill={primaryBody}
            stroke="#0B0F19"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Upper Cabin Roof (Yellow or Pink) */}
          <path
            d="M12 24 L14 10 Q28 8 42 10 L48 18 L48 24 Z"
            fill={accentRoof}
            stroke={primaryBody}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Windshield */}
          <path
            d="M42 12 L47 18 L39 21 L36 12 Z"
            fill={glassColor}
            stroke="#0B0F19"
            strokeWidth="1"
            opacity="0.9"
          />

          {/* Passenger Cabin Opening */}
          <rect x="18" y="14" width="14" height="10" rx="1.5" fill="#0B0F19" opacity="0.85" />

          {/* Headlight */}
          <circle cx="53" cy="27" r="2.5" fill="#FEF08A" stroke="#CA8A04" strokeWidth="0.8" />
        </svg>
      );

    case 'mini':
      return (
        <svg
          width={dimension.w}
          height={dimension.h}
          viewBox="0 0 64 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Compact Hatchback Car Illustration */}
          {/* Wheels */}
          <circle cx="16" cy="35" r="7.5" fill={tireColor} />
          <circle cx="16" cy="35" r="4" fill="#CBD5E1" stroke={tireColor} strokeWidth="1" />
          <circle cx="48" cy="35" r="7.5" fill={tireColor} />
          <circle cx="48" cy="35" r="4" fill="#CBD5E1" stroke={tireColor} strokeWidth="1" />

          {/* Hatchback Body */}
          <path
            d="M7 32 Q6 28 10 26 L16 26 L23 15 Q26 13 38 13 L47 21 L57 24 Q60 26 59 32 L56 34 L53 34 Q51 30 46 30 Q41 30 39 34 L25 34 Q23 30 18 30 Q13 30 11 34 Z"
            fill={primaryBody}
            stroke="#0B0F19"
            strokeWidth="1.5"
          />

          {/* Roof Accent Pill / Cap */}
          {isPink ? (
            <path d="M24 14 Q28 12 37 12 L46 20 L24 20 Z" fill={accentRoof} opacity="0.3" />
          ) : null}

          {/* Side Windows */}
          <path
            d="M25 16 L35 16 L35 23 L20 23 Z"
            fill={glassColor}
            stroke="#0B0F19"
            strokeWidth="0.8"
          />
          <path
            d="M37 16 L45 22 L45 23 L37 23 Z"
            fill={glassColor}
            stroke="#0B0F19"
            strokeWidth="0.8"
          />

          {/* Headlights & Taillights */}
          <circle cx="58" cy="27" r="1.8" fill="#FEF08A" />
          <rect x="7" y="27" width="2" height="3" rx="1" fill="#EF4444" />
        </svg>
      );

    case 'sedan':
      return (
        <svg
          width={dimension.w}
          height={dimension.h}
          viewBox="0 0 64 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Sleek Prime Sedan Illustration */}
          {/* Wheels */}
          <circle cx="15" cy="35" r="7.5" fill={tireColor} />
          <circle cx="15" cy="35" r="4" fill="#E2E8F0" stroke={tireColor} strokeWidth="1" />
          <circle cx="49" cy="35" r="7.5" fill={tireColor} />
          <circle cx="49" cy="35" r="4" fill="#E2E8F0" stroke={tireColor} strokeWidth="1" />

          {/* Sedan Body with defined 3-box profile (bonnet, cabin, boot) */}
          <path
            d="M5 32 Q5 27 9 26 L14 26 L21 16 Q24 14 36 14 L46 16 L53 24 L59 26 Q62 28 61 32 L58 34 L54 34 Q52 30 47 30 Q42 30 40 34 L24 34 Q22 30 17 30 Q12 30 10 34 Z"
            fill={primaryBody}
            stroke="#0B0F19"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Windows with chrome divide */}
          <path
            d="M22 17 L34 16 L34 23 L16 23 Z"
            fill={glassColor}
            stroke="#0B0F19"
            strokeWidth="0.8"
          />
          <path
            d="M36 16 L45 17 L51 23 L36 23 Z"
            fill={glassColor}
            stroke="#0B0F19"
            strokeWidth="0.8"
          />

          {/* Headlight & Taillight */}
          <polygon points="59,27 61,28 60,30 58,29" fill="#FEF08A" />
          <rect x="5" y="27" width="2" height="3" rx="0.8" fill="#EF4444" />
        </svg>
      );

    case 'seven_seater':
      return (
        <svg
          width={dimension.w}
          height={dimension.h}
          viewBox="0 0 64 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Spacious Family SUV / MUV Illustration */}
          {/* Heavy Duty Wheels */}
          <circle cx="16" cy="36" r="8.5" fill={tireColor} />
          <circle cx="16" cy="36" r="4.5" fill="#E2E8F0" stroke={tireColor} strokeWidth="1.2" />
          <circle cx="49" cy="36" r="8.5" fill={tireColor} />
          <circle cx="49" cy="36" r="4.5" fill="#E2E8F0" stroke={tireColor} strokeWidth="1.2" />

          {/* Roof Rail */}
          <rect x="20" y="10" width="26" height="2" rx="1" fill="#94A3B8" />

          {/* SUV Body */}
          <path
            d="M6 33 Q5 27 9 25 L16 25 L21 13 Q23 12 43 12 L51 18 L58 23 Q62 25 61 33 L58 35 L55 35 Q53 30 47 30 Q41 30 39 35 L26 35 Q24 30 18 30 Q12 30 10 35 Z"
            fill={primaryBody}
            stroke="#0B0F19"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />

          {/* 3-Row Windows */}
          <path
            d="M22 15 L32 14 L32 22 L17 22 Z"
            fill={glassColor}
            stroke="#0B0F19"
            strokeWidth="0.8"
          />
          <path
            d="M34 14 L43 14 L43 22 L34 22 Z"
            fill={glassColor}
            stroke="#0B0F19"
            strokeWidth="0.8"
          />
          <path
            d="M45 15 L50 19 L49 22 L45 22 Z"
            fill={glassColor}
            stroke="#0B0F19"
            strokeWidth="0.8"
          />

          {/* Fog lamps & Headlights */}
          <circle cx="59" cy="28" r="2" fill="#FEF08A" stroke="#CA8A04" strokeWidth="0.8" />
          <rect x="6" y="27" width="2" height="4" rx="1" fill="#EF4444" />
        </svg>
      );
  }
};
