import React, { useState, useRef } from 'react';
import { Box, Button, Slider, Typography, Paper, CircularProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import type { RouteScoringDetails } from '../types';
import { getWeatherColor } from '../utils';

interface ControlsProps {
  onFileUpload: (file: File) => void;
  isUploading: boolean;
  data: RouteScoringDetails | null;
  timeRange: [number, number];
  onTimeRangeChange: (val: [number, number]) => void;
  maxSliderSteps: number;
  setMaxSliderSteps: (val: number) => void;
  selectedCardIndex: number;
  onCardIndexChange: (index: number) => void;
  weatherCards: { time: string; forecast: any; bearing: number | null; lat: number; lng: number }[];
  isDrawingMode: boolean;
  onToggleDrawingMode: (enabled: boolean) => void;
  onClearRoute: () => void;
}

export default function Controls({
  onFileUpload,
  isUploading,
  data,
  timeRange,
  onTimeRangeChange,
  maxSliderSteps,
  setMaxSliderSteps,
  selectedCardIndex,
  onCardIndexChange,
  weatherCards,
  isDrawingMode,
  onToggleDrawingMode,
  onClearRoute
}: ControlsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

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

  const hasData = data && data.pointSequence && data.pointSequence.length > 0;

  let startTimeDisplay = '';
  let durationDisplay = '';
  let baseTimeMs = 0;

  if (hasData) {
    const today7am = new Date();
    today7am.setHours(7, 0, 0, 0);
    baseTimeMs = today7am.getTime();

    const stepMs = 30 * 60 * 1000;
    const startMs = baseTimeMs + timeRange[0] * stepMs;
    startTimeDisplay = new Date(startMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    const durationMs = (timeRange[1] - timeRange[0]) * stepMs;
    const durationHours = Math.floor(durationMs / (60 * 60 * 1000));
    const durationMins = (durationMs % (60 * 60 * 1000)) / (60 * 1000);
    durationDisplay = `${durationHours}h ${durationMins}m`;
  }

  const handleSliderChange = (
    _event: Event,
    newValue: number | number[],
    activeThumb: number,
  ) => {
    if (!Array.isArray(newValue)) return;
    let [newStart, newEnd] = newValue;
    const currentDuration = timeRange[1] - timeRange[0];

    let maxStartIndex = maxSliderSteps;
    if (baseTimeMs > 0) {
      const midnight = new Date(baseTimeMs);
      midnight.setHours(24, 0, 0, 0);
      maxStartIndex = Math.floor((midnight.getTime() - baseTimeMs) / (30 * 60 * 1000));
    }

    if (activeThumb === 0) {
      if (newStart > maxStartIndex) {
        newStart = maxStartIndex;
      }
      newEnd = newStart + currentDuration;
    } else {
      if (newStart > maxStartIndex) {
        newStart = maxStartIndex;
      }
      const maxDurationSteps = 12 * 2; // 12 hours = 24 steps
      if (newEnd - newStart > maxDurationSteps) {
        newEnd = newStart + maxDurationSteps;
      }
    }

    const minMaxSteps = 34; // 17 hours * 2

    if (newEnd >= maxSliderSteps - 1) {
      setMaxSliderSteps(maxSliderSteps + 8); // Add 4 hours
    } else if (newEnd < maxSliderSteps - 8 && maxSliderSteps > minMaxSteps) {
      const newMax = Math.max(minMaxSteps, newEnd + 6);
      if (newMax < maxSliderSteps) {
        setMaxSliderSteps(newMax);
      }
    }

    onTimeRangeChange([newStart, newEnd]);
  };

  const gradientStops = weatherCards.map((card, idx) => {
    const color = getWeatherColor(card.forecast, false, card.bearing, 0.8);
    const percentage = (idx / Math.max(1, weatherCards.length - 1)) * 100;
    return `${color} ${percentage}%`;
  }).join(', ');
  const sliderGradient = weatherCards.length > 0 ? `linear-gradient(to right, ${gradientStops})` : 'none';

  return (
    <Paper
      elevation={4}
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(30, 30, 30, 0.85)',
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button
            component="label"
            variant="contained"
            disabled={isUploading || isDrawingMode}
            startIcon={isUploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
            sx={{
              flex: 1,
              height: '32px',
              borderRadius: 2,
              textTransform: 'none',
              backgroundColor: 'rgba(25, 118, 210, 0.9)',
              '&:hover': { backgroundColor: 'rgba(21, 101, 192, 1)' },
              fontWeight: 600,
            }}
          >
            {isUploading ? 'Uploading...' : 'Upload GPX'}
            <input type="file" hidden accept=".gpx" onChange={handleFileChange} />
          </Button>
          <Button
            variant="contained"
            color={isDrawingMode ? "secondary" : "primary"}
            onClick={() => onToggleDrawingMode(!isDrawingMode)}
            disabled={isUploading}
            sx={{
              flex: 1,
              height: '32px',
              borderRadius: 2,
              textTransform: 'none',
              backgroundColor: isDrawingMode ? undefined : 'rgba(25, 118, 210, 0.9)',
              '&:hover': { backgroundColor: isDrawingMode ? undefined : 'rgba(21, 101, 192, 1)' },
              fontWeight: 600,
            }}
          >
            {isDrawingMode ? 'Finish' : 'Draw Route'}
          </Button>
          {isDrawingMode && (
            <Button
              variant="contained"
              color="error"
              onClick={onClearRoute}
              disabled={isUploading}
              sx={{
                minWidth: '40px',
                height: '32px',
                borderRadius: 2,
                backgroundColor: 'rgba(211, 47, 47, 0.9)',
                '&:hover': { backgroundColor: 'rgba(198, 40, 40, 1)' },
              }}
              title="Clear Route and Load Demo"
            >
              <DeleteOutlineIcon />
            </Button>
          )}
        </Box>
      </Box>

      {hasData && (
        <Box sx={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          {weatherCards.length > 0 && (
            <>
              <Box
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                sx={{
                  display: 'flex',
                  gap: .25,
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  pb: 0.25,
                  pt: 1.75,
                  mt: 0,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  '&::-webkit-scrollbar': { height: 6 },
                  '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3 },
                }}
              >
                {weatherCards.map((card, idx) => {
                  const date = new Date();
                  const [hours, minutes] = card.time.split(':').map(Number);
                  date.setHours(hours, minutes, 0, 0);

                  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                  return (
                    <Paper
                      key={idx}
                      elevation={idx === selectedCardIndex ? 6 : 2}
                      onClick={() => {
                        onCardIndexChange(idx);
                        if (scrollRef.current && scrollRef.current.children[idx]) {
                          (scrollRef.current.children[idx] as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                        }
                      }}
                      sx={{
                        minWidth: 50,
                        p: 0.5,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        backgroundColor: getWeatherColor(card.forecast, idx === selectedCardIndex, card.bearing),
                        borderRadius: 1,
                        transform: idx === selectedCardIndex ? 'scale(1.15)' : 'scale(1)',
                        transformOrigin: 'bottom',
                        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s',
                        cursor: 'pointer',
                        zIndex: idx === selectedCardIndex ? 2 : 1,
                        mx: idx === selectedCardIndex ? 0.5 : 0,
                        userSelect: 'none',
                      }}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, alignItems: 'center' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '11px', color: 'text.secondary' }}>{timeString}</Typography>
                        <Typography sx={{ fontWeight: 700, fontSize: '13px' }}>{card.forecast.temperature2m?.toFixed(0)}°C</Typography>
                        <Typography sx={{ fontWeight: 500, fontSize: '11px', lineHeight: 1.05 }}>{card.forecast.windSpeed10m?.toFixed(0)} km/h</Typography>
                        <Typography sx={{ fontWeight: 500, fontSize: '11px', lineHeight: 1.05 }}>{card.forecast.precipitationProbability?.toFixed(0)}%</Typography>
                        <Typography sx={{ fontWeight: 500, fontSize: '11px', lineHeight: 1.05 }}>{card.forecast.precipitation?.toFixed(0)} mm</Typography>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1.5, alignItems: 'center' }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  30min
                </Typography>
                <Slider
                  value={selectedCardIndex}
                  onChange={(_, val) => {
                    const idx = val as number;
                    onCardIndexChange(idx);
                    if (scrollRef.current && scrollRef.current.children[idx]) {
                      (scrollRef.current.children[idx] as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }
                  }}
                  step={1}
                  min={0}
                  max={Math.max(0, weatherCards.length - 1)}
                  valueLabelDisplay="off"
                  size="small"
                  sx={{
                    py: 1,
                    '& .MuiSlider-rail': {
                      background: sliderGradient,
                      opacity: 1,
                    },
                    '& .MuiSlider-track': {
                      border: 'none',
                      background: 'transparent',
                    }
                  }}
                />

              </Box>
            </>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Start & Duration
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {startTimeDisplay} ({(data?.distance ?? data?.Distance ?? 0).toFixed(1)}km, {durationDisplay})
              </Typography>
            </Box>
            <Slider
              sx={{ ml: 1 }}
              value={timeRange}
              onChange={handleSliderChange}
              step={1}
              min={0}
              max={maxSliderSteps}
              disableSwap
              valueLabelDisplay="off"
            />
          </Box>

        </Box>
      )}
    </Paper>
  );
}
