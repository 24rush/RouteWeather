// types.ts

export interface Point {
    x: number;
    y: number;
    // other fields might be present depending on NetTopologySuite serialization,
    // e.g., coordinate: { x, y } or similar. We'll refine this as needed.
}

export interface HourlyForecastAtOMPoint {
    time: string;
    temperature2m: number;
    precipitationProbability: number;
    precipitation: number;
    windSpeed10m: number;
    windDirection10m: number;
    cloudCover: number;
    windGusts10m: number;
}

export interface WeatherForecast {
    forecastAtIntervals: Record<string, HourlyForecastAtOMPoint>;
}



export interface LatLng {
    lat: number;
    lng: number;
}

export const RouteSectionType = {
    Unknown: 0,
    Flat: 1,
    Ascent: 2,
    Descent: 3
} as const;

export type RouteSectionType = typeof RouteSectionType[keyof typeof RouteSectionType];

export interface RouteSection {
    type: RouteSectionType;
    startIndex: number;
    endIndex: number;
    elevationDelta: number;
}

export interface RouteSamplingData {
    distances: number[];
    speedMultipliers: number[];
    bearings: number[];
    elevations: number[];
    sections: RouteSection[];
}

export interface RouteScoringDetails {
    routePolyline: string;
    weatherPoints: Record<number, string>;
    forecastAtWeatherPoints: Record<number, WeatherForecast>;
    physics: RouteSamplingData;
}

export type int = number;
