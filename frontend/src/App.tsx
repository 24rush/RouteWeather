import { useState, useCallback, useEffect, useMemo } from 'react';
import { Box } from '@mui/material';
import MapViewer from './components/MapViewer';
import Controls from './components/Controls';
import type { RouteScoringDetails } from './types';
import { api } from './api';
import { getBearing, getDistance, decodePolyline } from './utils';

function App() {
  const [data, setData] = useState<RouteScoringDetails | null>(null);
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 4]); // Default 2 hours (4 * 30m)
  const [routeDateStr, setRouteDateStr] = useState<string | null>(null);

  const getBaseDate = (dateStr?: string | null) => {
    const baseDate = dateStr ? new Date(dateStr) : new Date();
    const m = baseDate.getMinutes();
    if (m < 30) {
      baseDate.setMinutes(30, 0, 0);
    } else {
      baseDate.setHours(baseDate.getHours() + 1, 0, 0, 0);
    }
    return baseDate;
  };

  const getInitialMaxSteps = (routeData?: RouteScoringDetails | null) => {
    if (routeData?.forecastAtWeatherPoints) {
      const pts = Object.values(routeData.forecastAtWeatherPoints);
      if (pts.length > 0 && pts[0].forecastAtIntervals) {
        const intervalsCount = Object.keys(pts[0].forecastAtIntervals).length;
        const absMax = Math.max(2, (intervalsCount - 1) * 2);
        return Math.min(24, absMax);
      }
    }
    return 24; // Fixed 12 hours fallback
  };

  const getInitialDurationSteps = (routeData: RouteScoringDetails | null) => {
    const distance = (routeData?.physics.distances[routeData?.physics.distances.length - 1] ?? 0) / 1000.0;
    if (distance === 0) return 4;
    const speed = distance < 20 ? 8 : 24;
    const hours = distance / speed;
    return Math.min(24, Math.max(1, Math.ceil(hours * 2)));
  };

  const [maxSliderSteps, setMaxSliderSteps] = useState(getInitialMaxSteps());
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]);

  const fetchDemoData = async () => {
    try {
      setIsDrawingMode(false);
      setDrawnPoints([]); // Clear the red drawing line from map
      setIsUploading(true);
      // Pass the specific GUID for the demo track
      const homepageData = await api.getHomepageData(window.location.hostname.includes("localhost") ?
        "019f189f-5c4c-7d03-8843-f1c624d45342" :
        "019f189a-9332-7b11-a396-1653cb69553f");
      setData(homepageData);
      setRouteDateStr(null);

      const durationSteps = getInitialDurationSteps(homepageData);
      setMaxSliderSteps(getInitialMaxSteps());
      setTimeRange([0, durationSteps]);
    } catch (error) {
      console.error("Error fetching demo data:", error);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    fetchDemoData();
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const homepageData = await api.uploadGpx(file);
      setData(homepageData);
      setRouteDateStr(null);

      setMaxSliderSteps(getInitialMaxSteps());
      setTimeRange([0, getInitialDurationSteps(homepageData)]);
    } catch (error) {
      console.error("Error uploading or fetching data:", error);
      alert("Failed to upload GPX or fetch route data. Please ensure backend is running.");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const submitDrawnRoute = async (points: [number, number][]) => {
    if (points.length < 2) return;

    // Dump GPS coordinates as requested
    console.log("=== Drawn GPS Coordinates ===");
    console.log(JSON.stringify(points.map(p => ({ lat: p[0], lng: p[1] })), null, 2));

    setIsUploading(true);

    const sampledPoints = [];
    if (points.length > 0) {
      sampledPoints.push(points[0]);
      let lastPoint = points[0];
      for (let i = 1; i < points.length; i++) {
        const dist = getDistance(lastPoint[0], lastPoint[1], points[i][0], points[i][1]);
        if (dist >= 0.025) { // 25 meters
          sampledPoints.push(points[i]);
          lastPoint = points[i];
        }
      }
      if (points.length > 1 && lastPoint !== points[points.length - 1]) {
        sampledPoints.push(points[points.length - 1]);
      }
    }

    // Generate simple GPX XML
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="RouteWeather">\n<trk>\n<name>Drawn Route</name>\n<trkseg>\n`;
    for (const pt of sampledPoints) {
      gpx += `<trkpt lat="${pt[0]}" lon="${pt[1]}"><ele>0</ele></trkpt>\n`;
    }
    gpx += `</trkseg>\n</trk>\n</gpx>`;

    const file = new File([gpx], "drawn_route.gpx", { type: "application/gpx+xml" });
    try {
      const homepageData = await api.uploadGpx(file);
      setData(homepageData);
      setRouteDateStr(null);
      setMaxSliderSteps(getInitialMaxSteps());
      setTimeRange([0, getInitialDurationSteps(homepageData)]);
    } catch (error) {
      console.error("Error uploading drawn route:", error);
      alert("Failed to upload drawn route.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleDrawingMode = (enabled: boolean) => {
    setIsDrawingMode(enabled);
    if (!enabled) {
      if (drawnPoints.length >= 2) {
        submitDrawnRoute(drawnPoints);
      }
      setDrawnPoints([]); // Immediately clear the red line when finishing/canceling
    } else {
      // Remove the current track and clear points when entering drawing mode
      setData(null);
      setDrawnPoints([]);
    }
  };

  const weatherCards = useMemo(() => {
    if (!data || !data.weatherPoints) return [];
    const pts = Object.keys(data.weatherPoints).map(Number).sort((a, b) => a - b);
    if (pts.length === 0) return [];

    const [startIndex, endIndex] = timeRange;

    const baseDate = getBaseDate(routeDateStr);
    const baseTimeMs = baseDate.getTime();

    const stepMs = 30 * 60 * 1000;

    const startTimeMs = baseTimeMs + startIndex * stepMs;
    const endTimeMs = baseTimeMs + endIndex * stepMs;
    const durationMs = endTimeMs - startTimeMs;

    const routePositions = decodePolyline(data.routePolyline);

    const weatherPtCoords = pts.map(ptId => {
      const ptStr = data.weatherPoints[ptId];
      if (!ptStr) return { ptId, lat: 0, lng: 0 };
      const [lat, lng] = ptStr.split(',').map(Number);
      return { ptId, lat, lng };
    }).filter(wp => wp.lat !== 0 || wp.lng !== 0);

    const cards = [];
    let lastBearing: number | null = null;

    let totalEffectiveDist = 0;
    for (let i = 1; i < data.physics.distances.length; i++) {
      const segDist = data.physics.distances[i] - data.physics.distances[i - 1];
      const multiplier = data.physics.speedMultipliers[i] || 1.0;
      totalEffectiveDist += segDist / multiplier;
    }
    if (totalEffectiveDist === 0) totalEffectiveDist = 1;

    let physicsIdx = 1;
    let accumulatedDist = 0;
    let currentEffectiveTimeMs = 0;
    let nextTargetTimeMs = 0;

    const pushCard = (targetMs: number, posIdx: number) => {
      let closestWp = weatherPtCoords[0];
      let minDist = Infinity;
      const posLat = routePositions[posIdx][0];
      const posLng = routePositions[posIdx][1];
      for (const wp of weatherPtCoords) {
        const d = getDistance(wp.lat, wp.lng, posLat, posLng);
        if (d < minDist) {
          minDist = d;
          closestWp = wp;
        }
      }

      const pointForecasts = data.forecastAtWeatherPoints[closestWp.ptId]?.forecastAtIntervals;
      if (!pointForecasts) return;

      const arrivalTimeMs = startTimeMs + targetMs;
      let closestTimeIso = '';
      let closestForecast = null;
      let minDiff = Infinity;

      for (const [timeIso, forecast] of Object.entries(pointForecasts)) {
        const tMs = new Date(timeIso).getTime();
        const diff = Math.abs(tMs - arrivalTimeMs);
        if (diff < minDiff) {
          minDiff = diff;
          closestTimeIso = timeIso;
          closestForecast = forecast;
        }
      }

      if (closestForecast) {
        let bearing: number | null = null;
        for (let j = posIdx + 1; j < Math.min(posIdx + 15, routePositions.length); j++) {
          if (routePositions[j][0] !== posLat || routePositions[j][1] !== posLng) {
            bearing = getBearing(posLat, posLng, routePositions[j][0], routePositions[j][1]);
            break;
          }
        }
        if (bearing === null && lastBearing !== null) bearing = lastBearing;
        if (bearing !== null) lastBearing = bearing;

        cards.push({
          time: closestTimeIso,
          uiTime: arrivalTimeMs,
          forecast: closestForecast,
          lat: posLat,
          lng: posLng,
          bearing
        });
      }
    };

    pushCard(nextTargetTimeMs, 0);
    nextTargetTimeMs += 30 * 60 * 1000;

    for (let i = 1; i < routePositions.length; i++) {
      const p1 = routePositions[i - 1];
      const p2 = routePositions[i];
      const segmentDist = getDistance(p1[0], p1[1], p2[0], p2[1]) * 1000;

      const midpointDist = accumulatedDist + segmentDist / 2;
      while (physicsIdx < data.physics.distances.length - 1 && data.physics.distances[physicsIdx] < midpointDist) {
        physicsIdx++;
      }

      const multiplier = data.physics.speedMultipliers[physicsIdx] || 1.0;
      const effectiveSegment = segmentDist / multiplier;
      const timeForSegmentMs = effectiveSegment * (durationMs / totalEffectiveDist);

      currentEffectiveTimeMs += timeForSegmentMs;
      accumulatedDist += segmentDist;

      while (currentEffectiveTimeMs >= nextTargetTimeMs && nextTargetTimeMs <= durationMs) {
        pushCard(nextTargetTimeMs, i);
        nextTargetTimeMs += 30 * 60 * 1000;
      }
    }

    if (nextTargetTimeMs <= durationMs) {
      pushCard(durationMs, routePositions.length - 1);
    }

    return cards;
  }, [data, timeRange]);

  const handleLoadRoute = async (id: string, date?: string) => {
    setIsUploading(true);
    try {
      setIsDrawingMode(false);
      setDrawnPoints([]);
      const homepageData = await api.getHomepageData(id, date);
      setData(homepageData);
      setRouteDateStr(date || null);

      const durationSteps = getInitialDurationSteps(homepageData);
      setMaxSliderSteps(getInitialMaxSteps());
      setTimeRange([0, durationSteps]);
    } catch (error) {
      console.error("Error loading route:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>

      {/* Map Area */}
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <MapViewer
          data={data}
          weatherCards={weatherCards}
          selectedCardIndex={selectedCardIndex}
          isDrawingMode={isDrawingMode}
          drawnPoints={drawnPoints}
          setDrawnPoints={setDrawnPoints}
        />
      </Box>

      {/* Floating Controls Overlay */}
      <Box sx={{ position: 'absolute', top: 24, left: 24, zIndex: 1000, width: 380, maxWidth: '88%' }}>
        <Controls
          onFileUpload={handleFileUpload}
          isUploading={isUploading}
          data={data}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          maxSliderSteps={maxSliderSteps}
          setMaxSliderSteps={setMaxSliderSteps}
          selectedCardIndex={selectedCardIndex}
          onCardIndexChange={setSelectedCardIndex}
          weatherCards={weatherCards}
          isDrawingMode={isDrawingMode}
          onToggleDrawingMode={handleToggleDrawingMode}
          onClearRoute={fetchDemoData}
          onLoadRoute={handleLoadRoute}
          routeDateStr={routeDateStr}
        />
      </Box>

    </Box>
  );
}

export default App;
