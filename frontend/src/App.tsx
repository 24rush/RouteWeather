import { useState, useCallback, useEffect, useMemo } from 'react';
import { Box } from '@mui/material';
import MapViewer from './components/MapViewer';
import Controls from './components/Controls';
import type { RouteScoringDetails } from './types';
import { api } from './api';
import { getBearing } from './utils';

function App() {
  const [data, setData] = useState<RouteScoringDetails | null>(null);
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 4]); // Default 2 hours (4 * 30m)
  const [maxSliderSteps, setMaxSliderSteps] = useState(96);
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
      const homepageData = await api.getHomepageData("019ef898-9951-73f3-8389-097190955155");
      setData(homepageData);

      // Set default time to 7am today, max slider to midnight (17 hours = 34 steps)
      setMaxSliderSteps(34);
      setTimeRange([0, 4]); // Default 2 hours duration
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

      setMaxSliderSteps(34);
      setTimeRange([0, 4]);
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

    // Generate simple GPX XML
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="RouteWeather">\n<trk>\n<name>Drawn Route</name>\n<trkseg>\n`;
    for (const pt of points) {
      gpx += `<trkpt lat="${pt[0]}" lon="${pt[1]}"><ele>0</ele></trkpt>\n`;
    }
    gpx += `</trkseg>\n</trk>\n</gpx>`;

    const file = new File([gpx], "drawn_route.gpx", { type: "application/gpx+xml" });
    try {
      const homepageData = await api.uploadGpx(file);
      setData(homepageData);
      setMaxSliderSteps(34);
      setTimeRange([0, 4]);
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
    if (!data || !data.pointSequence || data.pointSequence.length === 0) return [];

    const [startIndex, endIndex] = timeRange;

    const today7am = new Date();
    today7am.setHours(7, 0, 0, 0);
    const baseTimeMs = today7am.getTime();

    const stepMs = 30 * 60 * 1000;

    const startTimeMs = baseTimeMs + startIndex * stepMs;
    const endTimeMs = baseTimeMs + endIndex * stepMs;
    const durationMs = endTimeMs - startTimeMs;

    const pts = data.pointSequence;
    if (!pts || pts.length === 0) return [];

    const coords: [number, number][] = [];
    for (let i = 0; i < pts.length; i++) {
      const ptStr = data.routePoints[pts[i]];
      if (!ptStr) {
        coords.push([0, 0]);
        continue;
      }
      const [lat, lng] = ptStr.split(',').map(Number);
      coords.push([lat, lng]);
    }

    const cards = [];
    const seenTimes = new Set<string>();
    let lastBearing: number | null = null;

    for (let i = 0; i < pts.length; i++) {
      const ptId = pts[i];
      const fraction = i / Math.max(1, pts.length - 1);
      const arrivalTimeMs = startTimeMs + fraction * durationMs;

      const pointForecasts = data.forecastAtRoutePoints[ptId]?.forecastAtIntervals;
      let closestTimeIso = '';
      let closestForecast = null;
      let minDiff = Infinity;

      if (pointForecasts) {
        for (const [timeIso, forecast] of Object.entries(pointForecasts)) {
          let tMs = 0;
          if (timeIso.includes(':') && timeIso.length <= 5) {
            const [h, m] = timeIso.split(':').map(Number);
            const d = new Date();
            d.setHours(h, m, 0, 0);
            tMs = d.getTime();
          } else {
            tMs = new Date(timeIso).getTime();
          }
          const diff = Math.abs(tMs - arrivalTimeMs);
          if (diff < minDiff) {
            minDiff = diff;
            closestTimeIso = timeIso;
            closestForecast = forecast;
          }
        }
      }

      if (closestForecast && !seenTimes.has(closestTimeIso)) {
        seenTimes.add(closestTimeIso);

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
      <Box sx={{ position: 'absolute', top: 24, left: 24, zIndex: 1000, width: 380, maxWidth: '90%' }}>
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
