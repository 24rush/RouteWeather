using api.BackgroundService.OpenMeteo;
using NetTopologySuite.Geometries;
using Shared.Domain.Domain;
using Shared.Domain.Persistance.Models;
using Shared.Domain.Persistance.Repositories;

namespace route_scoring_engine
{
    public class RouteScoringEngine
    {
        private readonly IGPXTracksRepo _gpxRepo;
        private readonly IWeatherForecastRepo _weatherRepo;

        private readonly OpenMeteoClient _openMeteoClient;

        class UserPreferences
        {
            private const int PREF_START_HOUR = 7;
            private const int PREF_START_HOUR_MAX = 18;

            public static DateTime prefStartTime = new DateTime(DateTime.Today.Year, DateTime.Today.Month, DateTime.Today.Day, PREF_START_HOUR, 0, 0);
            public static DateTime prefMaxStartTime = new DateTime(DateTime.Today.Year, DateTime.Today.Month, DateTime.Today.Day, PREF_START_HOUR_MAX, 0, 0);
        }

        public RouteScoringEngine(IGPXTracksRepo gpxRepo, IWeatherForecastRepo weatherRepo, OpenMeteoClient client)
        {
            _openMeteoClient = client;
            _gpxRepo = gpxRepo;
            _weatherRepo = weatherRepo;
        }

        private async Task<List<PointForecastEntity>?> getWeatherDataForRoute(GPXTrackEntity route)
        {                        
            if (DateTime.UtcNow.Subtract(route.ForecastGenerationTime).TotalHours >= 3)
            {                
                await _weatherRepo.RemoveForecastForRouteID(route.Id);

                var pointsForWeather = route.SampledPoints.Coordinates.Select(c => new Point(c) { SRID = 4326 }).ToArray();                                     

                var forecast = await _openMeteoClient.GetForecastAsync(pointsForWeather);

                if (forecast == null)
                {
                    Console.WriteLine($"Cannot get forecast for {route.Id}");
                    return null;
                }

                route.ForecastGenerationTime = DateTime.UtcNow;
                await _gpxRepo.SaveChangesAsync();

                // Update DB with latest weather data                
                foreach (var pointForecast in forecast)
                {                    
                    _weatherRepo.AddForecastAtPoint(PointForecastEntity.FromOpenMeteoResponse(pointForecast, route.Id));
                }

                await _weatherRepo.SaveChangesAsync();
            }
                        
            return await _weatherRepo.GetForecastForRouteID(route.Id); ;
        }

        private double interpolateValues(double a, double b, double distance)
        {
            return a + (b - a) * distance;
        }

        private HourlyForecastAtOMPoint? getForecastAtTimestamp(PointForecastEntity forecast, DateTime timestamp)
        {
            for (int i = 0; i < forecast.Hourly.LocalTime.Length - 1; i++)
            {
                var forecastAtPoint = forecast.Hourly;

                if (timestamp >= forecastAtPoint.LocalTime[i] && timestamp < forecastAtPoint.LocalTime[i + 1])
                {
                    var minutes = timestamp.Subtract(forecastAtPoint.LocalTime[i]).Minutes;
                    var percentage = minutes == 0 ? 0 : 1 / 60.0 / minutes;

                    return new HourlyForecastAtOMPoint()
                    {
                        Time = timestamp.ToString("HH:mm"),
                        Temperature2m = interpolateValues(forecastAtPoint.Temperature2m[i], forecastAtPoint.Temperature2m[i + 1], percentage),
                        WindSpeed10m = interpolateValues(forecastAtPoint.WindSpeed10m[i], forecastAtPoint.WindSpeed10m[i + 1], percentage),
                        WindDirection10m = interpolateValues(forecastAtPoint.WindDirection10m[i], forecastAtPoint.WindDirection10m[i + 1], percentage),
                        Precipitation = interpolateValues(forecastAtPoint.Precipitation[i], forecastAtPoint.Precipitation[i + 1], percentage),
                        PrecipitationProbability = (int)interpolateValues((double)forecastAtPoint.PrecipitationProbability[i], (double)forecastAtPoint.PrecipitationProbability[i + 1], percentage),
                        Rain = interpolateValues(forecastAtPoint.Rain[i], forecastAtPoint.Rain[i + 1], percentage),
                    };
                }
            }

            return null;
        }

        int determineScore(IEnumerable<HourlyForecastAtOMPoint> points)
        {
            var totalScore = 0.0;

            foreach (var p in points)
            {
                var score = 100.0;
                // Temperature score (ideal cycling range: 15-22°C)
                double tempPenalty = p.Temperature2m switch
                {
                    < 0 => 25,
                    < 5 => 15,
                    < 10 => 8,
                    <= 22 => 0,
                    <= 28 => (p.Temperature2m - 22) * 1.5,
                    <= 35 => 10 + (p.Temperature2m - 28) * 2,
                    _ => 30
                };

                // Rain penalty
                double rainPenalty = p.PrecipitationProbability switch
                {
                    < 10 => 0,
                    < 30 => 2,
                    < 50 => 5,
                    < 70 => 10,
                    < 90 => 20,
                    _ => 35
                };

                // Wind penalty
                double windPenalty = p.WindSpeed10m switch
                {
                    < 10 => 0,
                    < 20 => 2,
                    < 30 => 5,
                    < 40 => 10,
                    < 50 => 20,
                    _ => 35
                };

                score -= tempPenalty * 0.4;
                score -= rainPenalty * 0.4;
                score -= windPenalty * 0.2;

                totalScore += score;
            }

            // Normalize by route length
            totalScore /= points.Count();

            return Math.Clamp((int)totalScore, 0, 1000);
        }

        public async Task<RouteScoringDetails?> ScoreRouteToday(GPXTrackEntity route)
        {
            var weatherDataOnRoute = await getWeatherDataForRoute(route);
            if (weatherDataOnRoute == null) return null;

            const int MINUTES_BETWEEN_WEATHER_SAMPLES = 30;

            var routeScoringDetails = new RouteScoringDetails();
            routeScoringDetails.TrackPoints = route.TrackPoints.Coordinates.Select(c => new LatLng(c.Y, c.X)).ToList();

            // Map OpenMeteo grid points to Route Points            
            var pointsOnRoute = route.SampledPoints.Coordinates.Select(c => new Point(c) { SRID = 4326 }).ToList();

            var getDistanceSquared = (Point a, Point b) =>
            {
                double dx = a.X - b.X;
                double dy = a.Y - b.Y;
                return dx * dx + dy * dy;
            };

            var routePointToIdDict = new Dictionary<Point, int>();
            foreach (var routeCoordinate in route.SampledPoints.Coordinates)
            {
                var routePoint = routeCoordinate.ToPoint();

                // Get weather sample point closest to route point
                var closestWeatherDataPoint = weatherDataOnRoute.OrderBy(p => getDistanceSquared(p.Position, routePoint)).FirstOrDefault();

                if (closestWeatherDataPoint == null)
                    throw new InvalidOperationException($"No weather data for point {routePoint}");

                closestWeatherDataPoint.Position = routePoint;

                if (!routePointToIdDict.ContainsKey(routePoint))
                {
                    routeScoringDetails.RoutePoints[routeScoringDetails.RoutePoints.Keys.Count] = routePoint;
                    routePointToIdDict[routePoint] = routeScoringDetails.RoutePoints.Keys.Count - 1;
                }

                var pointIdx = routePointToIdDict[routePoint];

                // Add the point id to the sequence
                routeScoringDetails.PointSequence.Add(routePointToIdDict[routePoint]);

                // Generate weather data for all points at all timestamps           
                var weatherForecastAtPoint = new WeatherForecast();
                if (routeScoringDetails.ForecastAtRoutePoints.ContainsKey(pointIdx))
                    continue;

                routeScoringDetails.ForecastAtRoutePoints.Add(pointIdx, weatherForecastAtPoint);

                // Get weather data at 30 minute intervals
                for (var currStartTime = UserPreferences.prefStartTime;
                    currStartTime <= UserPreferences.prefMaxStartTime.AddMinutes(MINUTES_BETWEEN_WEATHER_SAMPLES * route.SampledPoints.Coordinates.Length);
                    currStartTime = currStartTime.AddMinutes(MINUTES_BETWEEN_WEATHER_SAMPLES))
                {
                    var forecastAtTimeStamp = getForecastAtTimestamp(closestWeatherDataPoint, currStartTime);
                    if (forecastAtTimeStamp == null) return null;

                    weatherForecastAtPoint.ForecastAtIntervals.Add(forecastAtTimeStamp.Time, forecastAtTimeStamp);
                }
            }

            return routeScoringDetails;
        }

        public async Task<RouteScoringDetails?> ScoreRouteToday(Guid routeId)
        {
            var route = await _gpxRepo.GetGPXTrackById(routeId);
            if (route == null) return null;

            var scoringDetails = await ScoreRouteToday(route);
            if (scoringDetails == null) return null;

            scoringDetails.Distance = route.Distance;

            return scoringDetails;
        }
    }
}
