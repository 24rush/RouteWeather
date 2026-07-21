import React from 'react';
import { MiniWindArrow, PartlyCloudyIcon, RainyIcon, PRECIP_COLOR, SunIcon, CloudyIcon } from './Icons';

export interface MapWaypointForecast {
    index: number;         // Checkpoint sequence (e.g. 1, 2, 3)
    time: string;          // e.g. "09:40 AM"
    temp: number;          // e.g. 24
    condition: 'sunny' | 'partly-cloudy' | 'cloudy' | 'rainy';
    windSpeed: number;     // e.g. 5
    windDirection: number; // Wind angle in degrees (e.g. 0 = North, 90 = East)
    highlighted?: boolean; // Links to active slider selection
    precipVolume: number;  // e.g. 0.0
    precipProb: number;    // e.g. 3
}

// Inline SVG pointer stem (downward triangle)
const MapPinStem = ({ color }: { color: string }) => (
    <svg
        width="16"
        height="8"
        viewBox="0 0 16 8"
        style={{ display: 'block', margin: '-1px 0 0 0' }}
    >
        <path d="M0 0 L8 8 L16 0 Z" fill={color} />
    </svg>
);

export const MapWeatherMarker: React.FC<{ waypoint: MapWaypointForecast }> = ({ waypoint }) => {
    const { index, time, temp, windSpeed, windDirection, highlighted, condition, precipVolume, precipProb } = waypoint;

    const getWeatherIcon = (cond: string) => {
        switch (cond) {
            case 'sunny': return <SunIcon size={32} />;
            case 'partly-cloudy': return <PartlyCloudyIcon size={32} />;
            case 'cloudy': return <CloudyIcon size={32} />;
            case 'rainy': return <RainyIcon size={32} />;
            default: return <SunIcon size={32} />;
        }
    };

    const cardBgColor = highlighted ? 'rgba(35, 40, 43, 0.95)' : 'rgba(20, 24, 26, 0.85)';

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                zIndex: highlighted ? 1000 : 100,
                boxSizing: 'border-box'
            }}
        >
            {/* 1. Glass Card Body */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '70px',
                    paddingTop: '16px',
                    paddingBottom: '4px',
                    boxSizing: 'border-box',

                    border: highlighted ? '1.5px solid #a3e635' : '1.5px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    background: highlighted
                        ? `linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(163, 230, 53, 0.04) 40%, rgba(0, 0, 0, 0.5) 100%), ${cardBgColor}`
                        : `linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%), ${cardBgColor}`,

                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    boxShadow: highlighted
                        ? 'inset 0 1px 0 0 rgba(255, 255, 255, 0.25), 0 0 20px rgba(163, 230, 53, 0.45)'
                        : 'inset 0 1px 0 0 rgba(255, 255, 255, 0.12), 0 6px 20px rgba(0, 0, 0, 0.3)',

                    position: 'relative',
                    userSelect: 'none'
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: '3px',
                        left: '2px',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: highlighted ? '#a3e635' : 'rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <span style={{ fontSize: '9px', fontWeight: 300, color: highlighted ? '#000000' : '#ffffff' }}>
                        {index}
                    </span>
                </div>

                {/* Middle Row: Temp + Icon */}
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 0.9, justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 100, color: '#ffffff' }}>
                        {temp}°C
                    </span>
                </div>

                {/* Top Row: Checkpoint Badge + Time */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {getWeatherIcon(condition)}
                </div>

                {/* Bottom Row: Wind Arrow + Wind Speed */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MiniWindArrow rotation={windDirection} />
                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', lineHeight: 1 }}>
                        {windSpeed} <span style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 400 }}>km/h</span>
                    </span>
                </div>

                {/* Precipitation Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: PRECIP_COLOR }}>{precipProb}%</span>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: PRECIP_COLOR }}>{precipVolume}mm</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#fff', fontWeight: 500 }}>
                        {time}
                    </span>
                </div>
            </div>

            {/* 2. Pointer Stem (Custom inline triangle matches card background and highlights) */}
            <MapPinStem color={highlighted ? '#a3e635' : cardBgColor} />
        </div >
    );
};