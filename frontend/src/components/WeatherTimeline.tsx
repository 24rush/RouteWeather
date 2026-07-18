import React, { useRef, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import type { HourlyForecastAtOMPoint } from '../types';
import { getWeatherCondition } from '../utils';
import { PartlyCloudyIcon, RainyIcon, WindArrowIcon, SunIcon, CloudyIcon } from './Icons';

interface WeatherTimelineProps {
    weatherCards: { time: string; forecast: HourlyForecastAtOMPoint; bearing: number | null; lat: number; lng: number, uiTime: number }[];
    selectedCardIndex: number;
    onCardIndexChange: (index: number) => void;
}

const WIND_COLORS = {
    tailwind: '#a3e635',
    headwind: '#f87171',
    crosswind: '#cbd5e1',
};

export const WeatherCard: React.FC<{ forecast: HourlyForecastAtOMPoint, uiTime: number, highlighted: boolean, onClick: () => void }> = ({ forecast, uiTime, highlighted, onClick }) => {
    const { temperature2m, windSpeed10m, precipitationProbability, precipitation, windDirection10m, cloudCover } = forecast;

    // Render appropriate weather icon/emoji based on condition
    const getWeatherIcon = (cond: string) => {
        switch (cond) {
            case 'sunny': return <SunIcon />;
            case 'partly-cloudy': return <PartlyCloudyIcon />;
            case 'cloudy': return <CloudyIcon />;
            case 'rainy': return <RainyIcon />;
            default: return <SunIcon />;
        }
    };

    let condition = getWeatherCondition(precipitation, precipitationProbability, cloudCover);

    return (
        <Paper
            onClick={onClick}
            elevation={highlighted ? 4 : 1}
            sx={{
                background: highlighted
                    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(163, 230, 53, 0.04) 40%, rgba(9, 40, 247, 0.5) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.03) 40%, rgba(14, 43, 233, 0.4) 100%)',

                backgroundImage: highlighted
                    ? 'linear-gradient(rgba(45, 50, 53, 0.85), rgba(0, 17, 129, 0.68)), linear-gradient(135deg, #a3e635 0%, rgba(163, 230, 53, 0.1) 100%)'
                    : 'linear-gradient(rgba(28, 32, 34, 0.65), rgba(0, 17, 129, 0.68)), linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 100%)',

                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',

                border: '1.5px solid transparent',
                backdropFilter: 'blur(20px) saturate(120%)',
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: 'inherit',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.08) 35%, rgba(255, 255, 255, 0) 36%, rgba(255, 255, 255, 0) 100%)',
                    pointerEvents: 'none',
                },

                transition: 'transform 0.1s ease, border-color 0.1s ease, box-shadow 0.1s ease',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    borderColor: highlighted ? '#a3e635' : 'rgba(255, 255, 255, 0.2)',
                },

                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1,
                width: 82,
                minWidth: 82,
                height: 156,
                borderRadius: 2,
                userSelect: 'none',
                cursor: 'pointer',
            }}
        >
            {/* 1. Temperature at the top */}
            <Typography sx={{ fontSize: '1.45rem', mb: 0.75, fontWeight: 300, color: '#ffffff', lineHeight: 1.4 }}>
                {temperature2m.toFixed(0)}°C
            </Typography>
            {/* 2. Weather Icon (representing cloud cover & rain status) */}
            <Box sx={{ display: 'flex', mb: 1.25, justifyContent: 'center', alignItems: 'center', height: 32 }}>
                {getWeatherIcon(condition)}
            </Box>
            {/* 3. Wind speed & direction block */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <WindArrowIcon rotation={windDirection10m} color={WIND_COLORS['tailwind']} />
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
                    <Typography sx={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>
                        {windSpeed10m.toFixed(0)}
                    </Typography>
                    <Typography sx={{ fontSize: '0.6rem', color: '#94a3b8', lineHeight: 1 }}>
                        km/h
                    </Typography>
                </Box>
            </Box>
            {/* 4. Precipitation Probability / Volume Ratio */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                <Typography sx={{ fontSize: '0.6rem', color: '#89bbf9ff', fontWeight: 500 }}>
                    {precipitationProbability.toFixed(0)}% {precipitation.toFixed(1)}mm
                </Typography>
            </Box>
            {/* 5. Forecast Time at the bottom */}
            <Typography sx={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, letterSpacing: '0.2px' }}>
                {new Date(uiTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </Typography>
        </Paper >
    );
};

export const WeatherTimeline: React.FC<WeatherTimelineProps> = ({ weatherCards, selectedCardIndex, onCardIndexChange }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseLeave = () => setIsDragging(false);
    const handleMouseUp = () => setIsDragging(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    return (
        <Box
            sx={{
                px: 1,
                borderRadius: 2,
                maxWidth: '100%',
            }}
        >
            <Box
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                sx={{
                    bgcolor: 'none',
                    display: 'flex',
                    overflowX: 'auto',
                    pb: 1,
                    pt: 1, // Added top padding to prevent cut-off on hover/select
                    cursor: isDragging ? 'grabbing' : 'grab',
                    // Custom scrollbar styles mapped directly in MUI
                    '&::-webkit-scrollbar': {
                        height: 6,
                    },
                    '&::-webkit-scrollbar-track': {
                        bgcolor: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 3,
                    },
                    '&::-webkit-scrollbar-thumb': {
                        bgcolor: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: 3,
                    },
                }}
            >
                {weatherCards.filter((card, index, self) => index === self.findIndex(c => c.uiTime === card.uiTime)).map((card, idx) => {
                    const originalIndex = weatherCards.findIndex(c => c.uiTime === card.uiTime);
                    const isSelected = selectedCardIndex >= 0 ? weatherCards[selectedCardIndex]?.uiTime === card.uiTime : false;

                    return (
                        <WeatherCard
                            key={`${card.time}-${idx}`}
                            forecast={card.forecast}
                            uiTime={card.uiTime}
                            highlighted={isSelected}
                            onClick={() => {
                                onCardIndexChange(originalIndex === selectedCardIndex ? -1 : originalIndex);
                            }}
                        />
                    );
                })}
            </Box>
        </Box>
    );
};