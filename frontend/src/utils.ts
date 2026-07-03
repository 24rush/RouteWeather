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
  return `hsla(${hue}, 95%, 50%, ${alpha})`;
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
