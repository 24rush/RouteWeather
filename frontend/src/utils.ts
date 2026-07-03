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
  return `hsla(${hue}, 100%, 50%, ${alpha})`;
};

export const getTempColor = (temp?: number) => {
  if (temp == undefined) return 'text.primary';
  if (temp < 0) return '#0066b7'; // very cold - blue
  if (temp < 26) return '#51d057ff'; // proper - green
  if (temp < 30) return '#faa423ff'; // highish - orange
  return '#ce4036'; // very high - red
};

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
