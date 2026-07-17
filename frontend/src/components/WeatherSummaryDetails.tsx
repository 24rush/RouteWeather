import React from 'react';
import { Box, Typography } from '@mui/material';

import { ClockIcon, ThermometerIcon, WindIcon, PrecipDropletIcon, DistanceIcon } from './Icons';

interface SummaryDetailProps {
    label: string;
    value: string;
    icon: React.ReactNode;
}

const SummaryDetail: React.FC<SummaryDetailProps> = ({ label, value, icon }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
            {icon}
            <Typography
                sx={{
                    fontSize: '0.5rem',
                    color: '#94a3b8',
                    fontWeight: 600,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    lineHeight: 1.4,
                    textAlign: 'right'
                }}
            >
                {label}
            </Typography>
            <Box>
                <Typography
                    sx={{
                        fontSize: '0.85rem',
                        color: '#ffffff',
                        fontWeight: 500,
                        lineHeight: 1,
                        textAlign: 'right'
                    }}
                >
                    {value}
                </Typography>
            </Box>
        </Box>
    </Box>
);

export const WeatherSummaryDetails: React.FC<{ distance: string, duration: string, avgTemp: number, avgRain: number, avgWind: number }> = ({ distance, duration, avgTemp, avgRain, avgWind }) => {
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                flexWrap: 'wrap',
                gap: 1,
                width: '100%',
                paddingTop: 1,
                p: 1,
            }}
        >
            <SummaryDetail
                label="Distance"
                value={distance + "km"}
                icon={<DistanceIcon />}
            />

            <SummaryDetail
                label="Duration"
                value={duration}
                icon={<ClockIcon />}
            />
            <SummaryDetail
                label="Avg. Temp"
                value={avgTemp.toFixed(1) + '°C'}
                icon={<ThermometerIcon />}
            />
            <SummaryDetail
                label="Wind"
                value={avgWind < 0 ? (avgWind * -1).toFixed(0) + "km/h" + ' tw' : avgWind.toFixed(0) + ' hw'}
                icon={<WindIcon />}
            />
            <SummaryDetail
                label="Rain"
                value={avgRain.toFixed(0) + 'mm'}
                icon={<PrecipDropletIcon />}
            />
        </Box>
    );
};