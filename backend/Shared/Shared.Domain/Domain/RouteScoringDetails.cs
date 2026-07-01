using NetTopologySuite.Geometries;
using Shared.Domain.Persistance.Models;

namespace Shared.Domain.Domain
{
    public record LatLng(double Lat, double Lng);

    public class RouteScoringDetails
    {
        public string RoutePolyline { get; set; } = default!;
        public Dictionary<int, Point> WeatherPoints { get; set; } = [];
        public Dictionary<int, WeatherForecast> ForecastAtWeatherPoints { get; set; } = [];
        public string Physics { get; set; } = default!;
    }

    public class WeatherForecast
    {
        public Dictionary<string, HourlyForecastAtOMPoint> ForecastAtIntervals { get; set; } = [];
    }

    public class RouteSamplingData
    {        
        public required int[] Distances { get; set; } = [];
        public required float[] SpeedMultipliers { get; set; }
        public required int[] Bearings { get; set; } = [];
        public required int[] Elevations { get; set; } = [];
        public RouteSection[] Sections {  get; set; } = [];   
    }

    public enum RouteSectionType
    {
        Unknown,
        Flat,
        Ascent,
        Descent
    }

    public class RouteSection
    {
        public RouteSectionType Type { get; set; } = RouteSectionType.Unknown;
        public int StartIndex { get; set; } = 0;
        public int EndIndex { get; set; } = 0;
        public int ElevationDelta { get; set; } = 0;
    }
}

