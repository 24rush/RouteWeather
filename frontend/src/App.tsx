import { useState, useCallback, useEffect, useMemo } from 'react';
import { Box } from '@mui/material';
import MapViewer from './components/MapViewer';
import Controls from './components/Controls';
import type { RouteScoringDetails } from './types';
import { api } from './api';
import { getDistance, getBaseDate, interpolateForecast } from './utils';
import { simulateRideIntervals } from './simulation';

function App() {
  const [data, setData] = useState<RouteScoringDetails | null>(null);
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 4]); // Default 2 hours (4 * 30m)
  const [routeDateStr, setRouteDateStr] = useState<string | null>(null);

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
  const [selectedCardIndex, setSelectedCardIndex] = useState(-1);
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
        "019f4020-ed12-7c92-a68b-85aa1b9b2375" :
        "019f6e6f-72a6-72ab-abff-c66a38164424");
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
    let baseTimeMs = baseDate.getTime();

    // If no explicit routeDateStr is provided (e.g. drawn route or GPX upload),
    // the backend may have fetched historical or specific weather. Align baseTimeMs to it.
    if (!routeDateStr && data.forecastAtWeatherPoints) {
      const firstWpId = Number(Object.keys(data.forecastAtWeatherPoints)[0]);
      const pointForecasts = data.forecastAtWeatherPoints[firstWpId]?.forecastAtIntervals;
      if (pointForecasts) {
        const times = Object.keys(pointForecasts)
          .map(timeIso => new Date(timeIso).getTime())
          .sort((a, b) => a - b);
        if (times.length > 0) {
          const firstGreaterOrEqual = times.find(t => t >= baseTimeMs);
          if (firstGreaterOrEqual !== undefined) {
            baseTimeMs = firstGreaterOrEqual;
          } else {
            baseTimeMs = times[times.length - 1];
          }
        }
      }
    }

    const stepMs = 30 * 60 * 1000;

    const startTimeMs = baseTimeMs + startIndex * stepMs;
    const endTimeMs = baseTimeMs + endIndex * stepMs;
    const durationMs = endTimeMs - startTimeMs;

    const intervalPoints = simulateRideIntervals(
      data.routePolyline,
      data.physics,
      data.weatherPoints,
      durationMs
    );

    const cards: any[] = [];
    let lastBearing: number | null = null;

    for (const pt of intervalPoints) {
      const pointForecasts = data.forecastAtWeatherPoints[pt.wpId]?.forecastAtIntervals;
      if (!pointForecasts) continue;

      const arrivalTimeMs = startTimeMs + pt.targetMs;
      const closestForecast = interpolateForecast(pointForecasts, arrivalTimeMs);
      const closestTimeIso = closestForecast?.time || '';

      if (closestForecast) {
        let bearing = pt.bearing;
        if (bearing === null && lastBearing !== null) bearing = lastBearing;
        if (bearing !== null) lastBearing = bearing;

        console.log(`[Weather Card] 30m Mark: Target=${pt.targetMs / (60 * 1000)}min, PosIdx=${pt.posIdx}, Matched Weather Point ID=${pt.wpId} (${pt.lat}, ${pt.lng}), Extracted Forecast Time=${closestTimeIso}`);

        cards.push({
          time: closestTimeIso,
          uiTime: arrivalTimeMs,
          exactTime: startTimeMs + pt.targetMs,
          forecast: closestForecast,
          lat: pt.lat,
          lng: pt.lng,
          bearing
        });
      }
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
      <Box sx={{
        position: 'absolute',
        top: 24,
        left: 24,
        zIndex: 1000,
        width: 380,
        maxWidth: '88%',
        display: 'flex',
        justifyContent: 'flex-end'
      }}>
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
