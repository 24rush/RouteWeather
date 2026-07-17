import React from 'react';
import { SvgIcon, type SvgIconProps } from '@mui/material';

export const ClockIcon: React.FC<SvgIconProps> = ({ sx, ...props }) => (
    <SvgIcon viewBox="0 0 24 24" strokeWidth="2" sx={{ fontSize: 16, fill: 'none', stroke: '#94a3b8', ...sx }} {...props}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </SvgIcon>
);

export const ThermometerIcon: React.FC<SvgIconProps> = ({ sx, ...props }) => (
    <SvgIcon viewBox="0 0 24 24" strokeWidth="2" sx={{ fontSize: 16, fill: 'none', stroke: '#94a3b8', ...sx }} {...props}>
        <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
    </SvgIcon>
);

export const WindIcon: React.FC<SvgIconProps> = ({ sx, ...props }) => (
    <SvgIcon viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" sx={{ fontSize: 16, fill: 'none', stroke: '#94a3b8', ...sx }} {...props}>
        <path d="M 9.59 8.59 A 2 2 0 1 1 11 12 H 2 m 10.59 -4.59 A 2 2 0 1 1 14 10 H 2 m 15.59 4.59 A 2 2 0 1 0 19 16 H 2" />
    </SvgIcon>
);

export const PrecipDropletIcon: React.FC<SvgIconProps> = ({ sx, ...props }) => (
    <SvgIcon viewBox="0 0 24 24" strokeWidth="2" sx={{ fontSize: 16, fill: '#94a3b8', stroke: '#94a3b8', opacity: 0.85, ...sx }} {...props}>
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </SvgIcon>
);

export const DistanceIcon: React.FC<SvgIconProps> = ({ sx, ...props }) => (
    <SvgIcon
        viewBox="0 0 24 24"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        sx={{ fontSize: 16, fill: 'none', stroke: '#94a3b8', ...sx }}
        {...props}
    >
        {/* Left and Right road borders */}
        <line x1="5" y1="20" x2="9" y2="4" />
        <line x1="19" y1="20" x2="15" y2="4" />

        {/* Center dashed road line */}
        <line x1="12" y1="20" x2="12" y2="4" strokeDasharray="3 4" />
    </SvgIcon>
);

const WIND_COLOR = '#a3e635'; // Neon lime-green
export const PRECIP_COLOR = '#60a5fa'; // Light blue

export const MiniSunIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4" fill="#facc15" />
        <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="#facc15" strokeWidth="1.5" />
    </svg>
);
export const MiniPartlyCloudyIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="15" cy="8" r="2.5" fill="#facc15" />
        <path d="M5 16a3 3 0 011-5.9 4 4 0 017.2 1.5A3 3 0 0112 18H5a3 3 0 010-3z" fill="#94a3b8" />
    </svg>
);
export const MiniRainyIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M5 14a3 3 0 011-5.9 4 4 0 017.2 1.5A3 3 0 0112 16H5a3 3 0 010-3z" fill="#64748b" />
        <path d="M7 17v2M10 17v2" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);
export const MiniWindArrow = ({ rotation }: { rotation: number }) => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.4s ease' }}
    >
        <path
            d="M12 2L22 22L12 18L2 22L12 2Z"
            fill={WIND_COLOR}
            stroke={WIND_COLOR}
            strokeWidth="1"
            strokeLinejoin="round"
            strokeLinecap="round"
        />
    </svg>
);

export const MiniDropletIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={PRECIP_COLOR}>
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
);


// --- Vector Icons matching the premium 3D/glass style of the mockup ---
export const SunIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <filter id="sunGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
            <linearGradient id="sunGrad" x1="16" y1="16" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFF275" />
                <stop offset="50%" stopColor="#FFAE00" />
                <stop offset="100%" stopColor="#FF7A00" />
            </linearGradient>
        </defs>

        {/* Sun rays */}
        <g stroke="url(#sunGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.95">
            <line x1="24" y1="6" x2="24" y2="10" />
            <line x1="24" y1="38" x2="24" y2="42" />
            <line x1="6" y1="24" x2="10" y2="24" />
            <line x1="38" y1="24" x2="42" y2="24" />

            <line x1="11.27" y1="11.27" x2="14.1" y2="14.1" />
            <line x1="33.9" y1="33.9" x2="36.73" y2="36.73" />
            <line x1="11.27" y1="36.73" x2="14.1" y2="33.9" />
            <line x1="33.9" y1="14.1" x2="36.73" y2="11.27" />
        </g>

        {/* Sun Core */}
        <circle cx="24" cy="24" r="10" fill="url(#sunGrad)" filter="url(#sunGlow)" />
    </svg>
);

export const PartlyCloudyIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <filter id="sunGlowPC" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="cloudShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.3" />
            </filter>

            <linearGradient id="sunGradPC" x1="26" y1="10" x2="38" y2="22" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFF275" />
                <stop offset="100%" stopColor="#FF8A00" />
            </linearGradient>

            {/* Glassmorphic cloud gradient */}
            <linearGradient id="glassCloud" x1="12" y1="16" x2="28" y2="38" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.75)" />
                <stop offset="60%" stopColor="rgba(200, 210, 220, 0.45)" />
                <stop offset="100%" stopColor="rgba(100, 115, 130, 0.25)" />
            </linearGradient>

            <linearGradient id="cloudBorder" x1="8" y1="16" x2="28" y2="38" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.8)" />
                <stop offset="50%" stopColor="rgba(255, 255, 255, 0.2)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.05)" />
            </linearGradient>
        </defs>

        {/* Sun in the background */}
        <g filter="url(#sunGlowPC)">
            <circle cx="31" cy="17" r="7" fill="url(#sunGradPC)" />
            <g stroke="url(#sunGradPC)" strokeWidth="2" strokeLinecap="round" opacity="0.85">
                <line x1="31" y1="4" x2="31" y2="7" />
                <line x1="41" y1="17" x2="44" y2="17" />
                <line x1="38.07" y1="9.93" x2="40.2" y2="7.8" />
                <line x1="38.07" y1="24.07" x2="40.2" y2="26.2" />
                <line x1="23.93" y1="9.93" x2="21.8" y2="7.8" />
            </g>
        </g>

        {/* Glassmorphic cloud in foreground */}
        <path
            d="M14 36a8 8 0 011-15.93 9.98 9.98 0 0117.82 2.76A7.5 7.5 0 0131.5 36H14z"
            fill="url(#glassCloud)"
            stroke="url(#cloudBorder)"
            strokeWidth="1.25"
            filter="url(#cloudShadow)"
        />
    </svg>
);

export const CloudyIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <filter id="cloudShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.35" />
            </filter>

            <linearGradient id="backCloudGrad" x1="18" y1="12" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(210, 220, 235, 0.55)" />
                <stop offset="100%" stopColor="rgba(90, 105, 125, 0.2)" />
            </linearGradient>

            <linearGradient id="frontCloudGrad" x1="10" y1="18" x2="26" y2="40" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.8)" />
                <stop offset="50%" stopColor="rgba(200, 215, 230, 0.5)" />
                <stop offset="100%" stopColor="rgba(110, 125, 145, 0.25)" />
            </linearGradient>

            <linearGradient id="cloudBorder" x1="8" y1="16" x2="28" y2="38" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.85)" />
                <stop offset="50%" stopColor="rgba(255, 255, 255, 0.2)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.05)" />
            </linearGradient>
        </defs>

        {/* Back cloud */}
        <path
            d="M20 30a7 7 0 011-13.93 8.73 8.73 0 0115.6 2.41A6.5 6.5 0 0135.5 30H20z"
            fill="url(#backCloudGrad)"
            stroke="url(#cloudBorder)"
            strokeWidth="1"
            opacity="0.8"
        />

        {/* Front cloud */}
        <path
            d="M12 36a8 8 0 011-15.93 9.98 9.98 0 0117.82 2.76A7.5 7.5 0 0129.5 36H12z"
            fill="url(#frontCloudGrad)"
            stroke="url(#cloudBorder)"
            strokeWidth="1.25"
            filter="url(#cloudShadow)"
        />
    </svg>
);

export const RainyIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <filter id="cloudShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.4" />
            </filter>
            <filter id="dropGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="1" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Dark rain cloud glass gradient */}
            <linearGradient id="rainCloudGrad" x1="12" y1="14" x2="28" y2="36" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(200, 210, 225, 0.7)" />
                <stop offset="40%" stopColor="rgba(100, 115, 135, 0.45)" />
                <stop offset="100%" stopColor="rgba(45, 55, 70, 0.3)" />
            </linearGradient>

            {/* Glowing raindrop gradient */}
            <linearGradient id="rainDropGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#93C5FD" />
                <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>

            <linearGradient id="cloudBorder" x1="8" y1="16" x2="28" y2="38" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.85)" />
                <stop offset="50%" stopColor="rgba(255, 255, 255, 0.15)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.02)" />
            </linearGradient>
        </defs>

        {/* Rain drops */}
        <g filter="url(#dropGlow)">
            <path d="M15 36c0 1.66 1.34 3 3 3s3-1.34 3-3c0-2-3-5.5-3-5.5S15 34 15 36z" fill="url(#rainDropGrad)" />
            <path d="M22 39c0 1.66 1.34 3 3 3s3-1.34 3-3c0-2-3-5.5-3-5.5S22 37 22 39z" fill="url(#rainDropGrad)" />
            <path d="M29 35c0 1.66 1.34 3 3 3s3-1.34 3-3c0-2-3-5.5-3-5.5S29 33 29 35z" fill="url(#rainDropGrad)" />
        </g>

        {/* Storm Cloud */}
        <path
            d="M12 32a8 8 0 011-15.93 9.98 9.98 0 0117.82 2.76A7.5 7.5 0 0129.5 32H12z"
            fill="url(#rainCloudGrad)"
            stroke="url(#cloudBorder)"
            strokeWidth="1.25"
            filter="url(#cloudShadow)"
        />
    </svg>
);

// Navigation pointer icon (compass arrow with solid green fill)
export const WindArrowIcon = ({ rotation, color = '#a3e635' }: { rotation: number; color?: string }) => (
    <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        style={{ transform: `rotate(${rotation + 180}deg)`, transition: 'transform 0.4s ease' }}
    >
        <path
            d="M12 2L22 22L12 18L2 22L12 2Z"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
        />
    </svg>
);

export const DropletIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill={PRECIP_COLOR}>
        <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
    </svg>
);