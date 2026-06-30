import { useState, useCallback, useEffect, useMemo } from 'react';
import { Box } from '@mui/material';
import MapViewer from './components/MapViewer';
import Controls from './components/Controls';
import type { RouteScoringDetails } from './types';
import { api } from './api';
import { getBearing, getDistance } from './utils';

function App() {
  const [data, setData] = useState<RouteScoringDetails | null>(null);
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 4]); // Default 2 hours (4 * 30m)
  const getInitialMaxSteps = () => {
    const baseDate = new Date();
    baseDate.setHours(baseDate.getHours() + (baseDate.getMinutes() > 30 ? 1 : 0), baseDate.getMinutes() > 30 ? 0 : 30, 0, 0);
    const midnight = new Date(baseDate.getTime());
    midnight.setHours(24, 0, 0, 0);
    return Math.max(8, Math.floor((midnight.getTime() - baseDate.getTime()) / (30 * 60 * 1000)));
  };

  const getInitialDurationSteps = (routeData: RouteScoringDetails | null) => {
    const distance = (routeData?.physics.distances[routeData?.physics.distances.length - 1] ?? 0) / 1000.0;
    if (distance === 0) return 4;
    const speed = distance < 20 ? 8 : 24;
    const hours = distance / speed;
    return Math.max(1, Math.ceil(hours * 2));
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

      // Set default time to the next full hour, max slider to midnight
      setMaxSliderSteps(getInitialMaxSteps());
      //setTimeRange([0, getInitialDurationSteps(homepageData)]);
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

    const baseDate = new Date();
    baseDate.setHours(baseDate.getHours() + (baseDate.getMinutes() > 30 ? 1 : 0), baseDate.getMinutes() > 30 ? 0 : 30, 0, 0);
    const baseTimeMs = baseDate.getTime();

    const stepMs = 30 * 60 * 1000;

    const startTimeMs = baseTimeMs + startIndex * stepMs;
    const endTimeMs = baseTimeMs + endIndex * stepMs;
    const durationMs = endTimeMs - startTimeMs;

    const coords: [number, number][] = [];
    for (let i = 0; i < pts.length; i++) {
      const ptStr = data.weatherPoints[pts[i]];
      if (!ptStr) {
        coords.push([0, 0]);
        continue;
      }
      const [lat, lng] = ptStr.split(',').map(Number);
      coords.push([lat, lng]);
    }

    const cards = [];
    let lastBearing: number | null = null;

    for (let i = 0; i < pts.length; i++) {
      const ptId = pts[i];
      const fraction = i / Math.max(1, pts.length - 1);
      const arrivalTimeMs = startTimeMs + fraction * durationMs;

      const pointForecasts = data.forecastAtWeatherPoints[ptId]?.forecastAtIntervals;
      let closestTimeIso = '';
      let closestForecast = null;
      let minDiff = Infinity;

      if (pointForecasts) {
        for (const [timeIso, forecast] of Object.entries(pointForecasts)) {
          const tMs = new Date(timeIso).getTime();
          const diff = Math.abs(tMs - arrivalTimeMs);
          if (diff < minDiff) {
            minDiff = diff;
            closestTimeIso = timeIso;
            closestForecast = forecast;
          }
        }
      }

      if (closestForecast) {

        let bearing: number | null = null;
        for (let j = i + 1; j < Math.min(i + 5, pts.length); j++) {
          if (coords[j][0] !== coords[i][0] || coords[j][1] !== coords[i][1]) {
            bearing = getBearing(coords[i][0], coords[i][1], coords[j][0], coords[j][1]);
            break;
          }
        }
        if (bearing === null && lastBearing !== null) {
          bearing = lastBearing;
        }
        if (bearing !== null) {
          lastBearing = bearing;
        }

        cards.push({
          time: closestTimeIso,
          forecast: closestForecast,
          lat: coords[i][0],
          lng: coords[i][1],
          bearing
        });
      }
    }

    return cards;
  }, [data, timeRange]);

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
        />
      </Box>

    </Box>
  );
}

export default App;
