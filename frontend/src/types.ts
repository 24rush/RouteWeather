// types.ts

export interface Point {
    x: number;
    y: number;
    // other fields might be present depending on NetTopologySuite serialization,
    // e.g., coordinate: { x, y } or similar. We'll refine this as needed.
}

export interface HourlyForecastAtOMPoint {
    time: string[];
    temperature2m: number[];
    precipitationProbability: number[];
    precipitation: number[];
    windSpeed10m: number[];
    windDirection10m: number[];
}

export interface WeatherForecast {
    forecastAtIntervals: Record<string, HourlyForecastAtOMPoint>;
}

export interface ScoreDetailsAtTime {
    score: number;
    pointIdxAtTime: Record<string, int>;
}

export interface LatLng {
    lat: number;
    lng: number;
}

export interface RouteScoringDetails {
    trackPoints: LatLng[];
    routePoints: Record<number, string>;
    pointSequence: number[];
    scoresAtStartTimes?: ScoreDetailsAtTime[];
    forecastAtRoutePoints: Record<number, WeatherForecast>;
    distance?: number;
    Distance?: number;
}

export type int = number;
