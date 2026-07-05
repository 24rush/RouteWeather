import type { HourlyForecastAtOMPoint } from './types';

export const getBaseDate = (routeDateStr?: string | null) => {
  const baseDate = routeDateStr ? new Date(routeDateStr) : new Date();
  if (baseDate.getMinutes() <= 30 && baseDate.getMinutes() > 0) {
    baseDate.setMinutes(30, 0, 0);
  } else {
    baseDate.setHours(baseDate.getHours() + (baseDate.getMinutes() > 30 ? 1 : 0), 0, 0, 0);
  }

  return baseDate;
}

export const getBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (d: number) => d * Math.PI / 180;
  const dLon = toRad(lon2 - lon1);
  const l1 = toRad(lat1);
  const l2 = toRad(lat2);
  const y = Math.sin(dLon) * Math.cos(l2);
  const x = Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

// Returns distance in kilometers between two lat/lng pairs using Haversine formula
export const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

function blendHues(h1: number, h2: number, factor: number) {
  let diff = h2 - h1;

  // If the transition goes through purple (counter-clockwise from red to blue),
  // force it to go clockwise through green/teal instead
  if (diff < -180) {
    diff += 360;
  } else if (diff > 180) {
    diff -= 360;
  }

  // Double-check: If we are starting near red (e.g., h1 > 300) and going to blue (h2 = 200),
  // we force it to go clockwise (via 360 -> 0 -> 100 -> 200) to bypass purple entirely:
  if (h1 > 300 && h2 === 200) {
    const adjustedH1 = h1 - 360; // treats 350° as -10°
    const interpolated = adjustedH1 + (h2 - adjustedH1) * factor;
    return (interpolated + 360) % 360;
  }

  return (h1 + diff * factor + 360) % 360;
}

const STORM_BLUE = { h: 200, s: 75, l: 60 };

export const getRainyWeatherColor = (tempColorStr: string, rainProb: number, rainVol: number) => {
  const match = tempColorStr.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/i);
  let tempColor = { h: 0, s: 0, l: 100 };
  if (match) {
    tempColor = { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) };
  }

  // Calculate base rain factor
  const probFactor = Math.min(1.0, rainProb / 50);
  const volFactor = Math.min(1.0, rainVol / 0.4);
  const rawRainFactor = Math.max(probFactor, volFactor);

  // Apply a curve so it reaches maximum blue much faster
  const rainFactor = Math.pow(rawRainFactor, 0.5);

  // Blend using the clockwise hue blender
  const h = blendHues(tempColor.h, STORM_BLUE.h, rainFactor);
  const s = tempColor.s + (STORM_BLUE.s - tempColor.s) * rainFactor;
  const l = tempColor.l + (STORM_BLUE.l - tempColor.l) * rainFactor;

  return `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`;
}

export const getWindColor = (windSpeed: number) => {
  // Map wind speed (0 - 40km/h) to hue (120 - 0)
  const hue = Math.max(0, 120 - (windSpeed * 3));
  return `hsl(${hue}, 80%, 70%)`;
};

export const getWeatherColor = (forecast: any, isSelected: boolean, bearing: number | null, overrideAlpha?: number) => {
  if (!forecast) return isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)';

  const temp = forecast.temperature2m || 20;
  const wind = forecast.windSpeed10m || 0;
  const precipProb = forecast.precipitationProbability || 0;
  const precipVol = forecast.precipitation || 0;
  const windDir = forecast.windDirection10m || 0;

  let windMultiplier = 1.0;
  if (bearing !== null) {
    const windRelativeAngle = Math.abs((bearing - (windDir + 180) + 540) % 360 - 180);
    windMultiplier = 0.2 + (windRelativeAngle / 180) * 1.8;
  }

  const tempScore = Math.abs(20 - temp) * 3;
  const windScore = wind * 1.5 * windMultiplier;
  const precipScore = precipProb;

  const baseScore = (tempScore + windScore) / 2;
  const totalScore = Math.min(100, baseScore + precipScore);

  const hue = Math.max(0, 120 - (totalScore * 1.2));

  const alpha = overrideAlpha !== undefined ? overrideAlpha : (isSelected ? 0.9 : 0.8);

  const colorByTemp = `hsla(${hue}, 95%, 50%, ${alpha})`;
  if (precipVol > 0) {
    return getRainyWeatherColor(colorByTemp, precipProb, precipVol);
  }

  return colorByTemp;
};

export const getTempColor = (temp?: number) => {
  if (temp == null) temp = 20;

  const colorScale = [
    { temp: 15, h: 200, s: 70, l: 50 }, // Cool Blue
    { temp: 20, h: 140, s: 65, l: 45 }, // Comfortable Green
    { temp: 24, h: 80, s: 70, l: 45 }, // Mild Yellow-Green
    { temp: 27, h: 45, s: 85, l: 60 }, // Warm Yellow-Orange
    { temp: 32, h: 15, s: 90, l: 60 }, // Hot Red-Orange
  ];

  // Handle edge cases
  if (temp <= colorScale[0].temp) return colorScale[0];
  if (temp >= colorScale[colorScale.length - 1].temp) return colorScale[colorScale.length - 1];

  // Find the two bounding anchors
  let i = 0;
  while (temp > colorScale[i + 1].temp) i++;

  const c1 = colorScale[i];
  const c2 = colorScale[i + 1];

  // Calculate interpolation factor (0.0 to 1.0)
  const factor = (temp - c1.temp) / (c2.temp - c1.temp);

  // Interpolate H, S, and L
  const h = c1.h + (c2.h - c1.h) * factor;
  const s = c1.s + (c2.s - c1.s) * factor;
  const l = c1.l + (c2.l - c1.l) * factor;

  return `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`;
}

export const decodePolyline = (str: string, precision: number = 5) => {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: [number, number][] = [];
  const shift = Math.pow(10, precision);
  let shiftAmount = 0;
  let result = 0;
  let byte = null;

  while (index < str.length) {
    byte = null;
    shiftAmount = 0;
    result = 0;

    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shiftAmount;
      shiftAmount += 5;
    } while (byte >= 0x20);

    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shiftAmount = 0;
    result = 0;

    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shiftAmount;
      shiftAmount += 5;
    } while (byte >= 0x20);

    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    coordinates.push([lat / shift, lng / shift]);
  }

  return coordinates;
};
export const stepToHourString = (step: number, baseTime: Date): string => {
  const date = new Date(baseTime.getTime() + step * 3600 * 1000 / 2);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function interpolateForecast(
  pointForecasts: Record<string, HourlyForecastAtOMPoint>,
  arrivalTimeMs: number
): HourlyForecastAtOMPoint | null {
  const times = Object.keys(pointForecasts)
    .map(timeIso => ({ timeIso, tMs: new Date(timeIso).getTime() }))
    .sort((a, b) => a.tMs - b.tMs);

  if (times.length === 0) return null;

  if (arrivalTimeMs <= times[0].tMs) {
    return pointForecasts[times[0].timeIso];
  }
  if (arrivalTimeMs >= times[times.length - 1].tMs) {
    return pointForecasts[times[times.length - 1].timeIso];
  }

  let f1 = times[0];
  let f2 = times[0];
  for (let i = 0; i < times.length - 1; i++) {
    if (arrivalTimeMs >= times[i].tMs && arrivalTimeMs <= times[i + 1].tMs) {
      f1 = times[i];
      f2 = times[i + 1];
      break;
    }
  }

  const t1 = f1.tMs;
  const t2 = f2.tMs;
  if (t1 === t2) return pointForecasts[f1.timeIso];

  const fraction = (arrivalTimeMs - t1) / (t2 - t1);

  const forecast1 = pointForecasts[f1.timeIso];
  const forecast2 = pointForecasts[f2.timeIso];

  const interpolate = (v1: number, v2: number) => {
    if (v1 === undefined) return v2;
    if (v2 === undefined) return v1;
    return v1 + (v2 - v1) * fraction;
  };

  const interpolateAngle = (a1: number, a2: number) => {
    if (a1 === undefined) return a2;
    if (a2 === undefined) return a1;
    let diff = (a2 - a1) % 360;
    if (diff < -180) diff += 360;
    if (diff > 180) diff -= 360;
    return (a1 + diff * fraction + 360) % 360;
  };

  return {
    time: new Date(arrivalTimeMs).toISOString(),
    temperature2m: interpolate(forecast1.temperature2m, forecast2.temperature2m),
    precipitationProbability: Math.round(interpolate(forecast1.precipitationProbability, forecast2.precipitationProbability) || 0),
    precipitation: interpolate(forecast1.precipitation, forecast2.precipitation),
    windSpeed10m: interpolate(forecast1.windSpeed10m, forecast2.windSpeed10m),
    windDirection10m: interpolateAngle(forecast1.windDirection10m, forecast2.windDirection10m),
  };
}