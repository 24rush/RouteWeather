import React, { useState, useRef, useDeferredValue } from 'react';
import { Box, Button, Slider, Typography, Paper, CircularProgress, Tabs, Tab, IconButton } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import type { RouteScoringDetails, HourlyForecastAtOMPoint } from '../types';
import { getWeatherColor } from '../utils';
import { FileUploadOutlined, GestureOutlined, Cloud, Terrain, East, WarningAmberRounded, NavigateBefore, NavigateNext, Thermostat, WaterDrop, Air } from '@mui/icons-material';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceArea } from 'recharts';

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
  weatherCards: { time: string; forecast: HourlyForecastAtOMPoint; bearing: number | null; lat: number; lng: number }[];
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
  const touchStartXRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  const handleAlertTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const hasData = data && data.weatherPoints && Object.keys(data.weatherPoints).length > 0;

  React.useEffect(() => {
    if (hasData) {
      setActiveTab(1);
    } else {
      setActiveTab(0);
    }
  }, [data]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

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
  if (hasData && data?.forecastAtWeatherPoints) {
    const pts = Object.values(data.forecastAtWeatherPoints);
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

  const hasElevationData = React.useMemo(() => {
    if (!hasData || !data?.physics?.elevations || data.physics.elevations.length === 0) return false;
    const max = Math.max(...data.physics.elevations);
    const min = Math.min(...data.physics.elevations);
    return max > min;
  }, [data, hasData]);

  React.useEffect(() => {
    if (activeTab === 2 && !hasElevationData) {
      setActiveTab(hasData ? 1 : 0);
    }
  }, [hasElevationData, activeTab, hasData]);

  const elevationData = React.useMemo(() => {
    if (!hasData || !data?.physics?.distances || !data?.physics?.elevations) return [];

    // Subsample if necessary, or just map directly
    const points = [];
    const step = Math.max(1, Math.floor(data.physics.distances.length / 500)); // limit to ~500 points for perf
    for (let i = 0; i < data.physics.distances.length; i += step) {
      points.push({
        distance: data.physics.distances[i] / 1000.0,
        elevation: data.physics.elevations[i]
      });
    }
    // ensure last point is included
    if (points[points.length - 1].distance !== data.physics.distances[data.physics.distances.length - 1] / 1000.0) {
      points.push({
        distance: data.physics.distances[data.physics.distances.length - 1] / 1000.0,
        elevation: data.physics.elevations[data.physics.elevations.length - 1]
      });
    }
    return points;
  }, [data, hasData]);

  const deferredTimeRange = useDeferredValue(timeRange);
  const sectionWeatherDataCache = useRef<Record<string, any>>({});

  React.useEffect(() => {
    sectionWeatherDataCache.current = {};
  }, [data]);

  const sectionWeatherData = React.useMemo(() => {
    if (!hasData || !data?.physics?.sections || !data?.physics?.distances || !data.forecastAtWeatherPoints) return [];

    const cacheKey = `${deferredTimeRange[0]}_${deferredTimeRange[1]}`;
    if (sectionWeatherDataCache.current[cacheKey]) {
      return sectionWeatherDataCache.current[cacheKey];
    }

    const baseDate = new Date();
    baseDate.setHours(baseDate.getHours() + (baseDate.getMinutes() > 30 ? 1 : 0), baseDate.getMinutes() > 30 ? 0 : 30, 0, 0);
    const baseTimeMs = baseDate.getTime();
    const startTimeMs = baseTimeMs + deferredTimeRange[0] * 30 * 60 * 1000;
    const durationMs = (deferredTimeRange[1] - deferredTimeRange[0]) * 30 * 60 * 1000;
    const totalDist = data.physics.distances[data.physics.distances.length - 1] || 1;

    const weatherPtIndices = Object.keys(data.weatherPoints).map(Number).sort((a, b) => a - b);

    // Use only significant sections
    const significantSections = data.physics.sections.filter(sec => {
      const distDelta = data.physics.distances[sec.endIndex] - data.physics.distances[sec.startIndex];
      return distDelta >= 1000 && Math.abs(sec.elevationDelta) >= 50;
    });

    const result = significantSections.map((sec, idx) => {
      let maxRain = 0;
      let maxHeadwind = 0;
      let maxCrosswind = 0;
      let maxTemp = -Infinity;
      let minTemp = Infinity;

      let totalTemp = 0;
      let totalRain = 0;
      let totalEffectiveWind = 0;
      let evaluatedDistance = 0;
      let ptCount = 0;

      // Find arrival time at start of section
      const startDist = data.physics.distances[sec.startIndex];
      const startFraction = startDist / totalDist;
      const sectionStartMs = startTimeMs + startFraction * durationMs;

      // Subsample evaluating points (e.g. every 10th point)
      const step = Math.max(1, Math.floor((sec.endIndex - sec.startIndex) / 50));
      for (let i = sec.startIndex; i <= sec.endIndex; i += step) {
        const dist = data.physics.distances[i];
        let segmentDist = 0;
        if (i === sec.startIndex) {
          segmentDist = 0;
        } else {
          const prevIdx = Math.max(sec.startIndex, i - step);
          segmentDist = dist - data.physics.distances[prevIdx];
        }
        const fraction = dist / totalDist;
        const arrivalTimeMs = startTimeMs + fraction * durationMs;

        let nearestPt = weatherPtIndices[0];
        let minDist = Math.abs(i - nearestPt);
        for (let j = 1; j < weatherPtIndices.length; j++) {
          const d = Math.abs(i - weatherPtIndices[j]);
          if (d < minDist) {
            minDist = d;
            nearestPt = weatherPtIndices[j];
          }
        }

        const pointForecasts = data.forecastAtWeatherPoints[nearestPt]?.forecastAtIntervals;
        if (!pointForecasts) continue;

        let closestForecast: HourlyForecastAtOMPoint | null = null;
        let minTimeDiff = Infinity;
        for (const [timeIso, forecast] of Object.entries(pointForecasts)) {
          const tMs = new Date(timeIso).getTime();
          const diff = Math.abs(tMs - arrivalTimeMs);
          if (diff < minTimeDiff) {
            minTimeDiff = diff;
            closestForecast = forecast;
          }
        }

        if (closestForecast) {
          const temp = closestForecast.temperature2m !== undefined ? closestForecast.temperature2m : 20;
          const rain = closestForecast.precipitation || 0;
          const windSpeed = closestForecast.windSpeed10m || 0;
          const windDir = closestForecast.windDirection10m || 0;
          const bearing = data.physics.bearings[i] || 0;

          if (temp > maxTemp) maxTemp = temp;
          if (temp < minTemp) minTemp = temp;
          if (rain > maxRain) maxRain = rain;

          const angleDiffRad = (windDir - bearing) * Math.PI / 180;
          const headwind = windSpeed * Math.cos(angleDiffRad);
          const crosswind = Math.abs(windSpeed * Math.sin(angleDiffRad));

          if (headwind > maxHeadwind) maxHeadwind = headwind;
          if (crosswind > maxCrosswind) maxCrosswind = crosswind;

          totalTemp += temp;
          totalRain += rain;
          totalEffectiveWind += (headwind * segmentDist);
          evaluatedDistance += segmentDist;
          ptCount++;
        }
      }

      const avgTemp = ptCount > 0 ? totalTemp / ptCount : 0;
      const avgRain = ptCount > 0 ? totalRain / ptCount : 0;
      const avgWind = evaluatedDistance > 0 ? totalEffectiveWind / evaluatedDistance : 0;

      const alerts: string[] = [];
      if (maxRain > 0.1) alerts.push(`Rain up to ${maxRain.toFixed(1)}mm/h`);
      if (sec.type === 2 && maxHeadwind > 15) alerts.push(`Headwind gusts up to ${maxHeadwind.toFixed(0)}km/h`);
      if (sec.type === 3 && maxCrosswind > 15) alerts.push(`Crosswind gusts up to ${maxCrosswind.toFixed(0)}km/h`);
      if (maxTemp > 30) alerts.push(`Heat up to ${maxTemp.toFixed(0)}°C`);
      if (minTemp < 5 && minTemp !== Infinity) alerts.push(`Cold drop to ${minTemp.toFixed(0)}°C`);

      return {
        key: idx,
        type: sec.type === 2 ? 'Ascent' : sec.type === 3 ? 'Descent' : 'Flat',
        startKm: (startDist / 1000).toFixed(1),
        startTimeStr: new Date(sectionStartMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        avgTemp,
        avgRain,
        avgWind,
        alerts
      };
    });

    sectionWeatherDataCache.current[cacheKey] = result;
    return result;
  }, [data, hasData, deferredTimeRange]);

  const elevationSections = React.useMemo(() => {
    if (!hasData || !data?.physics?.sections || !data?.physics?.distances || sectionWeatherData.length === 0) return [];

    const significantSections = data.physics.sections.filter(sec => {
      const distDelta = data.physics.distances[sec.endIndex] - data.physics.distances[sec.startIndex];
      return distDelta >= 1000 && Math.abs(sec.elevationDelta) >= 50;
    });

    return significantSections.map((sec, idx) => {
      const x1 = data.physics.distances[sec.startIndex] / 1000.0;
      const x2 = data.physics.distances[sec.endIndex] / 1000.0;

      const isActive = idx === activeSectionIndex;
      const hasAlerts = sectionWeatherData[idx]?.alerts?.length > 0;

      let color = hasAlerts ? 'rgba(255, 152, 0, 0.15)' : 'rgba(76, 175, 80, 0.15)';
      if (isActive) {
        color = hasAlerts ? 'rgba(255, 152, 0, 0.5)' : 'rgba(76, 175, 80, 0.5)';
      }

      return { x1, x2, color, key: idx };
    });
  }, [data, hasData, activeSectionIndex, sectionWeatherData]);

  const yDomain = React.useMemo(() => {
    if (elevationData.length === 0) return ['auto', 'auto'];
    let minEle = Infinity;
    let maxEle = -Infinity;
    for (const pt of elevationData) {
      if (pt.elevation < minEle) minEle = pt.elevation;
      if (pt.elevation > maxEle) maxEle = pt.elevation;
    }
    if (minEle === Infinity) return ['auto', 'auto'];

    const diff = maxEle - minEle;
    const totalDistanceKm = elevationData[elevationData.length - 1].distance - elevationData[0].distance;
    // Base the minimum vertical spread on the total distance (e.g. at least 10m vertical per 1km horizontal, which is a 1% grade)
    // We keep a hard minimum of 150m for very short routes so they don't over-zoom either.
    const minSpread = Math.max(150, totalDistanceKm * 10);

    if (diff < minSpread) {
      const padding = (minSpread - diff) / 2;
      return [Math.max(0, minEle - padding), maxEle + padding];
    }
    return [minEle, maxEle];
  }, [elevationData]);

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

  const calculateRideScore = (startIndexSteps: number, durationSteps: number, routeData: RouteScoringDetails | null) => {
    if (!routeData || !routeData.physics || !routeData.physics.distances || !routeData.forecastAtWeatherPoints) return { score: -Infinity, avgTemp: 0, avgRain: 0, avgWind: 0 };

    // Tweakable parameters for best start time calculation
    const IDEAL_TEMP = 20; // Celsius
    const TEMP_WEIGHT = 1.0; // Penalty per degree away from ideal
    const RAIN_WEIGHT = 10.0; // Penalty per mm of rain
    const HEADWIND_WEIGHT = 0.5; // Penalty per km/h of headwind
    const TAILWIND_BONUS = 0.2; // Bonus per km/h of tailwind

    const baseDate = new Date();
    baseDate.setHours(baseDate.getHours() + (baseDate.getMinutes() > 30 ? 1 : 0), baseDate.getMinutes() > 30 ? 0 : 30, 0, 0);
    const baseTimeMs = baseDate.getTime();
    const stepMs = 30 * 60 * 1000;
    const startTimeMs = baseTimeMs + startIndexSteps * stepMs;
    const durationMs = durationSteps * stepMs;

    const weatherPtIndices = Object.keys(routeData.weatherPoints).map(Number).sort((a, b) => a - b);
    const totalDist = routeData.physics.distances[routeData.physics.distances.length - 1] || 1;

    let totalScore = 0;
    let ptCount = 0;
    let totalTemp = 0;
    let totalRain = 0;
    let totalEffectiveWind = 0;
    let evaluatedDistance = 0;

    // Subsample evaluating points (e.g. every 10th point) for performance
    const step = Math.max(1, Math.floor(routeData.physics.distances.length / 100));
    for (let i = 0; i < routeData.physics.distances.length; i += step) {
      const dist = routeData.physics.distances[i];
      let segmentDist = 0;
      if (i === 0) {
        segmentDist = dist;
      } else {
        const prevIdx = i - step >= 0 ? i - step : 0;
        segmentDist = dist - routeData.physics.distances[prevIdx];
      }
      const fraction = dist / totalDist;
      const arrivalTimeMs = startTimeMs + fraction * durationMs;

      let nearestPt = weatherPtIndices[0];
      let minDist = Math.abs(i - nearestPt);
      for (let j = 1; j < weatherPtIndices.length; j++) {
        const d = Math.abs(i - weatherPtIndices[j]);
        if (d < minDist) {
          minDist = d;
          nearestPt = weatherPtIndices[j];
        }
      }

      const pointForecasts = routeData.forecastAtWeatherPoints[nearestPt]?.forecastAtIntervals;
      if (!pointForecasts) continue;

      let closestForecast: HourlyForecastAtOMPoint | null = null;
      let minTimeDiff = Infinity;
      for (const [timeIso, forecast] of Object.entries(pointForecasts)) {
        const tMs = new Date(timeIso).getTime();
        const diff = Math.abs(tMs - arrivalTimeMs);
        if (diff < minTimeDiff) {
          minTimeDiff = diff;
          closestForecast = forecast;
        }
      }

      if (closestForecast) {
        const windSpeed = closestForecast.windSpeed10m || 0;
        const windDir = closestForecast.windDirection10m || 0;
        const bearing = routeData.physics.bearings[i] || 0;

        evaluatedDistance += segmentDist;
        const angleDiffRad = (windDir - bearing) * Math.PI / 180;
        const headwind = windSpeed * Math.cos(angleDiffRad);

        totalEffectiveWind += (headwind * segmentDist);

        let windScore = headwind > 0 ? -headwind * HEADWIND_WEIGHT : -headwind * TAILWIND_BONUS;

        const temp = closestForecast.temperature2m !== undefined ? closestForecast.temperature2m : IDEAL_TEMP;
        const tempScore = -Math.abs(temp - IDEAL_TEMP) * TEMP_WEIGHT;
        totalTemp += temp;

        const rain = closestForecast.precipitation || 0;
        const rainScore = -rain * RAIN_WEIGHT;
        totalRain += rain;

        totalScore += (windScore + tempScore + rainScore);
        ptCount++;
      }
    }

    if (ptCount === 0) return { score: -Infinity, avgTemp: 0, avgRain: 0, avgWind: 0 };
    return {
      score: totalScore / ptCount,
      avgTemp: totalTemp / ptCount,
      avgRain: totalRain / ptCount,
      avgWind: evaluatedDistance > 0 ? (totalEffectiveWind / evaluatedDistance) : 0
    };
  };

  const bestStartData = React.useMemo(() => {
    if (!hasData) return null;
    let bestScore = -Infinity;
    let bestStep = 0;
    let bestTemp = 0;
    let bestRain = 0;
    let bestWind = 0;

    const durationSteps = timeRange[1] - timeRange[0];

    const baseDate = new Date();
    baseDate.setHours(baseDate.getHours() + (baseDate.getMinutes() > 30 ? 1 : 0), baseDate.getMinutes() > 30 ? 0 : 30, 0, 0);
    const baseTimeMs = baseDate.getTime();

    // Evaluate up to MAX_START_STEPS
    for (let step = 0; step <= MAX_START_STEPS; step++) {
      const startMs = baseTimeMs + step * 30 * 60 * 1000;
      const startDate = new Date(startMs);

      // Cap start time to daylight hours (between 06:00 and 21:00 local time)
      const hour = startDate.getHours();
      if (hour < 6 || hour > 21 || (hour === 21 && startDate.getMinutes() > 0)) {
        continue;
      }

      const res = calculateRideScore(step, durationSteps, data);
      if (res.score > bestScore) {
        bestScore = res.score;
        bestStep = step;
        bestTemp = res.avgTemp;
        bestRain = res.avgRain;
        bestWind = res.avgWind;
      }
    }

    // If all times were capped and none found, fallback safely
    if (bestScore === -Infinity) {
      return { noOptimalTime: true, timeStr: '', avgTemp: 0, avgRain: 0, avgWind: 0 };
    }

    const startMs = baseTimeMs + bestStep * 30 * 60 * 1000;
    return {
      noOptimalTime: false,
      timeStr: new Date(startMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      avgTemp: bestTemp,
      avgRain: bestRain,
      avgWind: bestWind
    };
  }, [hasData, data, timeRange, MAX_START_STEPS]);

  const currentStartData = React.useMemo(() => {
    if (!hasData || !data) return null;
    const durationSteps = timeRange[1] - timeRange[0];
    const res = calculateRideScore(timeRange[0], durationSteps, data);
    return {
      avgTemp: res.avgTemp,
      avgRain: res.avgRain,
      avgWind: res.avgWind
    };
  }, [hasData, data, timeRange]);

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
      <Box sx={{ display: 'flex', flexDirection: 'column', color: 'black' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', transition: 'min-height 0.2s ease' }}>
          {activeTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  component="label" variant='contained'
                  disabled={isUploading || isDrawingMode}
                  sx={{
                    width: '90px',
                    height: '90px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    borderRadius: 2,
                    textTransform: 'none',
                    backgroundColor: 'rgba(25, 118, 210, 0.9)',
                    '&:hover': { backgroundColor: 'rgba(21, 101, 192, 1)' },
                    fontWeight: 600,
                    fontSize: '0.75em',
                    lineHeight: 1.2,
                    boxShadow: 'none',
                    '&:active': { boxShadow: 'none' },
                    '&:focus': { boxShadow: 'none' },
                    border: 'none',
                    color: '#fff',
                    whiteSpace: 'pre-wrap',
                    textAlign: 'center'
                  }}
                >
                  {isUploading ? <CircularProgress size={28} sx={{ color: 'white' }} /> : <FileUploadOutlined sx={{ fontSize: 32 }} />}
                  <span>{isUploading ? 'Uploading...' : 'UPLOAD\nGPX'}</span>
                  <input type="file" hidden accept=".gpx" onChange={handleFileChange} />
                </Button>
                <Button
                  variant="contained"
                  color={isDrawingMode ? "secondary" : "primary"}
                  onClick={() => onToggleDrawingMode(!isDrawingMode)}
                  disabled={isUploading}
                  sx={{
                    width: '90px',
                    height: '90px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    borderRadius: 2,
                    textTransform: 'none',
                    backgroundColor: isDrawingMode ? undefined : 'rgba(25, 118, 210, 0.9)',
                    '&:hover': { backgroundColor: isDrawingMode ? undefined : 'rgba(21, 101, 192, 1)' },
                    fontWeight: 600,
                    fontSize: '0.75em',
                    lineHeight: 1.2,
                    boxShadow: 'none',
                    '&:active': { boxShadow: 'none' },
                    '&:focus': { boxShadow: 'none' },
                    border: 'none',
                    color: '#fff',
                    whiteSpace: 'pre-wrap',
                    textAlign: 'center'
                  }}
                >
                  <GestureOutlined sx={{ fontSize: 32 }} />
                  <span>{isDrawingMode ? 'FINISH\nDRAWING' : 'DRAW\nROUTE'}</span>
                </Button>
                {isDrawingMode && (
                  <Button
                    variant="contained"
                    color="error"
                    onClick={onClearRoute}
                    disabled={isUploading}
                    sx={{
                      minWidth: '40px',
                      height: '90px',
                      borderRadius: 2,
                      backgroundColor: 'rgba(211, 47, 47, 0.9)',
                      '&:hover': { backgroundColor: 'rgba(198, 40, 40, 1)' },
                    }}
                    title="Clear Route and Load Demo"
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 24 }} />
                  </Button>
                )}
              </Box>
            </Box>
          )}

          {activeTab === 1 && hasData && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {bestStartData && (
                <Box sx={{
                  borderRadius: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 0.5, fontSize: '0.55em', color: '#4b4b4bff' }}>
                    OPTIMAL START TIME
                  </Typography>
                  {bestStartData.noOptimalTime ? (
                    <Typography variant="caption" sx={{ fontWeight: 600, mt: 0.25 }}>No daylight times left today</Typography>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mt: 0.25 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{bestStartData.timeStr}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                        <Thermostat sx={{ fontSize: 14 }} />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>{bestStartData.avgTemp.toFixed(1)}°C</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                        <WaterDrop sx={{ fontSize: 14 }} />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>{bestStartData.avgRain.toFixed(1)}mm</Typography>
                      </Box>
                      {Math.abs(bestStartData.avgWind) >= 1.0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                          <Air sx={{ fontSize: 14 }} />
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {bestStartData.avgWind > 0 ? `${bestStartData.avgWind.toFixed(0)}km/h hw` : `${Math.abs(bestStartData.avgWind).toFixed(0)}km/h tw`}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              )}
              {weatherCards.length > 0 && (
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
                  {weatherCards.filter((card, index, self) => index === self.findIndex(c => c.time === card.time)).map((card, idx) => {
                    const date = new Date(card.time);
                    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

                    const cardsInInterval = weatherCards.filter(c => c.time === card.time);
                    let sumSin = 0;
                    let sumCos = 0;
                    let validCount = 0;
                    for (const c of cardsInInterval) {
                      if (c.bearing !== null && c.forecast?.windDirection10m !== undefined) {
                        const rel = c.forecast.windDirection10m - c.bearing;
                        const rad = rel * Math.PI / 180;
                        sumSin += Math.sin(rad);
                        sumCos += Math.cos(rad);
                        validCount++;
                      }
                    }

                    let avgRelativeAngle = null;
                    let showArrow = false;
                    if (validCount > 0) {
                      avgRelativeAngle = (Math.atan2(sumSin / validCount, sumCos / validCount) * 180 / Math.PI + 360) % 360;
                      if ((avgRelativeAngle >= 0 && avgRelativeAngle <= 45) ||
                        (avgRelativeAngle >= 315 && avgRelativeAngle <= 360)) {
                        showArrow = true;
                      } else if (avgRelativeAngle >= 135 && avgRelativeAngle <= 225) {
                        showArrow = true;
                      }
                    }

                    return (
                      <Paper
                        key={card.time}
                        elevation={weatherCards[selectedCardIndex]?.time === card.time ? 6 : 2}
                        onClick={() => {
                          const originalIndex = weatherCards.findIndex(c => c.time === card.time);
                          if (originalIndex !== -1) {
                            onCardIndexChange(originalIndex);
                          }
                          if (scrollRef.current && scrollRef.current.children[idx]) {
                            (scrollRef.current.children[idx] as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                          }
                        }}
                        sx={{
                          minWidth: 50,
                          p: 0.25,
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
                          <Box sx={{ height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', my: '1px' }}>
                            {showArrow && avgRelativeAngle !== null ? (
                              <East sx={{ fontSize: 16, transform: `rotate(${avgRelativeAngle}deg)` }} />
                            ) : (
                              <Typography sx={{ fontWeight: 500, fontSize: '14px', lineHeight: 1 }}>-</Typography>
                            )}
                          </Box>
                          <Typography sx={{ fontWeight: 500, fontSize: '11px', lineHeight: 1.05 }}>{card.forecast.precipitationProbability?.toFixed(0)}%</Typography>
                          <Typography sx={{ fontWeight: 500, fontSize: '11px', lineHeight: 1.05 }}>{card.forecast.precipitation == 0 ? "0" : card.forecast.precipitation?.toFixed(1)} mm</Typography>
                          <Typography sx={{ fontWeight: 700, fontSize: '11px', opacity: 0.6 }}>{timeString}</Typography>
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              )}

            </Box>
          )}

          {activeTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Box sx={{
                height: 140,
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
                '& *:focus': { outline: 'none !important' },
                '& .recharts-wrapper, & .recharts-surface': { outline: 'none !important' }
              }}>
                <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
                  <AreaChart data={elevationData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }} style={{ outline: 'none' }}>
                    <XAxis dataKey="distance" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(val) => val.toFixed(0) + 'km'} tick={{ fontSize: 10 }} />
                    <YAxis
                      dataKey="elevation"
                      domain={yDomain}
                      tickFormatter={(val) => val.toFixed(0) + 'm'}
                      tick={{ fontSize: 10 }}
                    />
                    {elevationSections.map((sec) => (
                      <ReferenceArea
                        key={sec.key}
                        x1={sec.x1}
                        x2={sec.x2}
                        fill={sec.color}
                        fillOpacity={1}
                        strokeOpacity={0}
                      />
                    ))}
                    <Area type="monotone" dataKey="elevation" stroke="#1976d2" fill="#90caf9" fillOpacity={0.5} isAnimationActive={false} activeDot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>

              {sectionWeatherData.length > 0 && (
                <Box 
                  onTouchStart={handleAlertTouchStart}
                  onTouchEnd={(e) => {
                    if (touchStartXRef.current === null) return;
                    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
                    if (diff > 50) {
                      setActiveSectionIndex(prev => Math.min(sectionWeatherData.length - 1, prev + 1));
                    } else if (diff < -50) {
                      setActiveSectionIndex(prev => Math.max(0, prev - 1));
                    }
                    touchStartXRef.current = null;
                  }}
                  sx={{ display: 'flex', alignItems: 'center', mt: 0.5, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 1, p: 0.5 }}
                >
                  <IconButton
                    size="small"
                    onClick={() => setActiveSectionIndex(prev => Math.max(0, prev - 1))}
                    disabled={activeSectionIndex === 0}
                    sx={{ p: 0.5, color: '#000' }}
                  >
                    <NavigateBefore fontSize="small" />
                  </IconButton>

                  <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', minWidth: 0, px: 0.5, userSelect: 'none' }}>
                    {(() => {
                      const activeSec = sectionWeatherData[activeSectionIndex];
                      if (!activeSec) return null;
                      return (
                        <Box sx={{ display: 'flex', width: '100%', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '11px', opacity: 0.8 }}>
                                At {activeSec.startKm}km (~{activeSec.startTimeStr})
                              </Typography>
                            </Box>

                            {activeSec.alerts.length > 0 ? (
                              <Box sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                color: '#ed6c02',
                                overflowY: 'auto',
                                maxHeight: '60px',
                                '&::-webkit-scrollbar': { width: '4px' },
                                '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(237, 108, 2, 0.4)', borderRadius: '4px' },
                                msOverflowStyle: 'auto',
                                scrollbarWidth: 'thin'
                              }}>
                                {activeSec.alerts.map((alert: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode>>, i: React.Key) => (
                                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                    <WarningAmberRounded sx={{ fontSize: 14 }} />
                                    <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px' }}>
                                      {alert}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '11px', color: 'rgba(56, 142, 60, 1)', userSelect: 'none' }}>
                                No severe weather
                              </Typography>
                            )}
                          </Box>

                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', ml: 1, minWidth: 'max-content' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                <Thermostat sx={{ fontSize: 14 }} />
                                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px' }}>{activeSec.avgTemp.toFixed(1)}°C</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                <WaterDrop sx={{ fontSize: 14 }} />
                                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px' }}>{activeSec.avgRain.toFixed(1)}mm</Typography>
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                              <Air sx={{ fontSize: 14 }} />
                              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px' }}>
                                {Math.abs(activeSec.avgWind) >= 1.0 ? (activeSec.avgWind > 0 ? `${activeSec.avgWind.toFixed(0)}km/h hw` : `${Math.abs(activeSec.avgWind).toFixed(0)}km/h tw`) : 'Neutral wind'}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      );
                    })()}
                  </Box>

                  <IconButton
                    size="small"
                    onClick={() => setActiveSectionIndex(prev => Math.min(sectionWeatherData.length - 1, prev + 1))}
                    disabled={activeSectionIndex >= sectionWeatherData.length - 1}
                    sx={{ p: 0.5, color: '#000' }}
                  >
                    <NavigateNext fontSize="small" />
                  </IconButton>
                </Box>
              )}

            </Box>
          )}

          {activeTab !== 0 && hasData && (
            <Box sx={{ display: 'flex', flexDirection: 'column', mt: 'auto' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', pt: 0.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>Start at {startTimeDisplay}</Typography>
                  {currentStartData && (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                        <Thermostat sx={{ fontSize: 14 }} />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>{currentStartData.avgTemp.toFixed(1)}°C</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                        <WaterDrop sx={{ fontSize: 14 }} />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>{currentStartData.avgRain.toFixed(1)}mm</Typography>
                      </Box>
                      {Math.abs(currentStartData.avgWind ?? 0) >= 1.0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                          <Air sx={{ fontSize: 14 }} />
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {currentStartData.avgWind > 0 ? `${currentStartData.avgWind.toFixed(0)}km/h hw` : `${Math.abs(currentStartData.avgWind).toFixed(0)}km/h tw`}
                          </Typography>
                        </Box>
                      )}
                    </>
                  )}
                </Box>
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
              <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'center', mt: 0.75 }}>
                {((data?.physics.distances[data?.physics.distances.length - 1] ?? 0) / 1000.0).toFixed(0)}km in {durationDisplay}
              </Typography>
            </Box>
          )}
        </Box>

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="Route Data Tabs"
          centered
          sx={{
            minHeight: '36px',
            '& .MuiTabs-indicator': {
              backgroundColor: '#1976d2'
            },
            '& .MuiTab-root': {
              minWidth: 0,
              px: 2,
              minHeight: '36px',
              py: 0.5,
              color: '#64b5f6', // Solid pale blue
              '&.Mui-selected': {
                color: '#1976d2'
              },
              '&.Mui-disabled': {
                color: '#9e9e9e', // Solid grey so it doesn't look washed out
                opacity: 0.6
              }
            }
          }}
        >
          <Tab icon={<FileUploadOutlined />} aria-label="Upload" />
          <Tab icon={<Cloud />} aria-label="Weather" disabled={!hasData} />
          {hasElevationData && (
            <Tab icon={<Terrain />} aria-label="Elevation Profile" disabled={!hasData} />
          )}
        </Tabs>
      </Box>
    </Paper>
  );
}
