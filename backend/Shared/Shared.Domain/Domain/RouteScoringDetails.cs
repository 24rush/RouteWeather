using NetTopologySuite.Geometries;
using Shared.Domain.Persistance.Models;

namespace Shared.Domain.Domain
{
    public record LatLng(double Lat, double Lng);

    public class RouteScoringDetails
    {
        public double Distance { get; set; } = 0.0;
        public List<LatLng> TrackPoints { get; set; } = [];
        public Dictionary<int, Point> RoutePoints { get; set; } = [];
        public List<int> PointSequence { get; set; } = [];
        public Dictionary<int, WeatherForecast> ForecastAtRoutePoints { get; set; } = [];
    }

    public class WeatherForecast
    {
        public Dictionary<string, HourlyForecastAtOMPoint> ForecastAtIntervals { get; set; } = [];
    }
}
