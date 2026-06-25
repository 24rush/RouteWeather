import React, { useState, useRef } from 'react';
import { Box, Button, Slider, Typography, Paper, CircularProgress } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import type { RouteScoringDetails } from '../types';
import { getWeatherColor } from '../utils';
import { FileUploadOutlined, GestureOutlined } from '@mui/icons-material';

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
    const baseDate = new Date();
    baseDate.setHours(baseDate.getHours() + (baseDate.getMinutes() > 30 ? 1 : 0), baseDate.getMinutes() > 30 ? 0 : 30, 0, 0);
    baseTimeMs = baseDate.getTime();

    const stepMs = 30 * 60 * 1000;
    const startMs = baseTimeMs + timeRange[0] * stepMs;
    startTimeDisplay = new Date(startMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    const durationMs = (timeRange[1] - timeRange[0]) * stepMs;
    const durationHours = Math.floor(durationMs / (60 * 60 * 1000));
    const durationMins = (durationMs % (60 * 60 * 1000)) / (60 * 1000);
    durationDisplay = `${durationHours}h ${durationMins}m`;
  }

  let MAX_START_STEPS = 72 * 2; // Default fallback
  if (hasData && data?.forecastAtRoutePoints) {
    const pts = Object.values(data.forecastAtRoutePoints);
    if (pts.length > 0 && pts[0].forecastAtIntervals) {
      let maxMs = baseTimeMs;
      let prevMs = -1;
      let dayOffset = 0;
      for (const timeIso of Object.keys(pts[0].forecastAtIntervals)) {
        let tMs = 0;
        if (timeIso.includes(':') && timeIso.length <= 5) {
          const [h, m] = timeIso.split(':').map(Number);
          const d = new Date();
          d.setHours(h, m, 0, 0);
          tMs = d.getTime() + dayOffset * 24 * 60 * 60 * 1000;
          if (prevMs !== -1 && tMs < prevMs) {
            dayOffset++;
            tMs += 24 * 60 * 60 * 1000;
          }
          prevMs = tMs;
        } else {
          tMs = new Date(timeIso).getTime();
        }
        if (tMs > maxMs) maxMs = tMs;
      }
      MAX_START_STEPS = Math.max(0, Math.floor((maxMs - baseTimeMs) / (30 * 60 * 1000)));
    }
  }

  const handleSliderChange = (
    _event: Event,
    newValue: number | number[],
    activeThumb: number,
  ) => {
    if (!Array.isArray(newValue)) return;
    let [newStart, newEnd] = newValue;
    const currentDuration = timeRange[1] - timeRange[0];

    // Enforce max start time
    if (newStart > MAX_START_STEPS) {
      newStart = MAX_START_STEPS;
    }

    let maxStartIndex = maxSliderSteps;

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

    const midnight = new Date(baseTimeMs);
    midnight.setHours(24, 0, 0, 0);
    const minMaxSteps = Math.max(8, Math.floor((midnight.getTime() - baseTimeMs) / (30 * 60 * 1000)));

    if (newEnd >= maxSliderSteps - 1) {
      const newMax = Math.min(MAX_START_STEPS + 24, maxSliderSteps + 8);
      if (newMax > maxSliderSteps) {
        setMaxSliderSteps(newMax);
      }
    } else if (newEnd < maxSliderSteps - 8 && maxSliderSteps > minMaxSteps) {
      const newMax = Math.max(minMaxSteps, newEnd + 6);
      if (newMax < maxSliderSteps) {
        setMaxSliderSteps(newMax);
      }
    }

    onTimeRangeChange([newStart, newEnd]);
  };
  /*
    const gradientStops = weatherCards.map((card, idx) => {
      const color = getWeatherColor(card.forecast, false, card.bearing, 0.8);
      const percentage = (idx / Math.max(1, weatherCards.length - 1)) * 100;
      return `${color} ${percentage}%`;
    }).join(', ');
    const sliderGradient = weatherCards.length > 0 ? `linear-gradient(to right, ${gradientStops})` : 'none';*/

  return (
    <Paper
      elevation={4}
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(3px)',
        backgroundColor: 'rgba(30, 30, 30, 0.05)',
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button
            component="label" variant='contained'
            disabled={isUploading || isDrawingMode}
            startIcon={isUploading ? <CircularProgress size={20} /> : <FileUploadOutlined />}
            sx={{
              flex: 1,
              height: '32px',
              borderRadius: 2,
              textTransform: 'none',
              backgroundColor: 'rgba(25, 118, 210, 0.9)',
              '&:hover': { backgroundColor: 'rgba(21, 101, 192, 1)' },
              fontWeight: 600,
              fontSize: '0.75em',
              boxShadow: 'none',
              '&:active': { boxShadow: 'none' },
              '&:focus': { boxShadow: 'none' },
              border: 'none',
              color: '#fff'
            }}
          >
            {isUploading ? 'Uploading...' : 'UPLOAD GPX'}
            <input type="file" hidden accept=".gpx" onChange={handleFileChange} />
          </Button>
          <Button
            variant="contained"
            color={isDrawingMode ? "secondary" : "primary"}
            onClick={() => onToggleDrawingMode(!isDrawingMode)}
            disabled={isUploading}
            startIcon={<GestureOutlined />}
            sx={{
              flex: 1,
              height: '32px',
              borderRadius: 2,
              textTransform: 'none',
              backgroundColor: isDrawingMode ? undefined : 'rgba(25, 118, 210, 0.9)',
              '&:hover': { backgroundColor: isDrawingMode ? undefined : 'rgba(21, 101, 192, 1)' },
              fontWeight: 600,
              fontSize: '0.75em',
              boxShadow: 'none',
              '&:active': { boxShadow: 'none' },
              '&:focus': { boxShadow: 'none' },
              border: 'none',
              color: '#fff'
            }}
          >
            {isDrawingMode ? 'FINISH' : 'DRAW ROUTE'}
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
        <Box sx={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid rgba(255, 255, 255, 0.1)', color: 'black' }}>
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
                  pt: 1,
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
                        cursor: 'pointer',
                        userSelect: 'none',
                        boxShadow: 'none',
                        '&:active': { boxShadow: 'none' },
                        '&:focus': { boxShadow: 'none' },
                        border: 'none'
                      }}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '14px' }}>{card.forecast.temperature2m?.toFixed(0)}°C</Typography>
                        <Typography sx={{ fontWeight: 500, fontSize: '11px', lineHeight: 1.05 }}>{card.forecast.windSpeed10m?.toFixed(0)} km/h</Typography>
                        <Typography sx={{ fontWeight: 500, fontSize: '11px', lineHeight: 1.05 }}>{card.forecast.precipitationProbability?.toFixed(0)}%</Typography>
                        {/*Typography sx={{ fontWeight: 500, fontSize: '11px', lineHeight: 1.05 }}>{card.forecast.precipitation?.toFixed(0)} mm</Typography*/}
                        <Typography sx={{ fontWeight: 700, fontSize: '11px', opacity: 0.6 }}>{timeString}</Typography>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                Start at {startTimeDisplay}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                {(data?.distance ?? data?.Distance ?? 0).toFixed(0)}km in {durationDisplay}
              </Typography>
            </Box>
            <Slider
              sx={{
                ml: 1, color: '#38f', '& .MuiSlider-thumb': {
                  borderRadius: '1px',
                  width: '12px',
                },
              }}
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
