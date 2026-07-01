using NetTopologySuite.Geometries;
using Shared.Domain.OpenMeteo;

namespace Shared.Domain.Persistance.Models
{
    public class PointForecastEntity
    {
        public int Id { get; set; }
        public required Guid RouteId { get; set; }
        // This is OpenMeteo gric cell position
        public required Point Position { get; set; }
        public required HourlyData Hourly { get; set; }

        private static void generateDateTimeUtc(HourlyData hourly)
        {
            // Generate DateTime timestamps in UTC
            hourly.UtcTime = new DateTime[hourly.Time.Length];

            for (var i = 0; i < hourly.Time.Length; i++)
            {
                hourly.UtcTime[i] = DateTime.SpecifyKind(DateTime.Parse(hourly.Time[i]), DateTimeKind.Utc);
            }
        }

        public static PointForecastEntity FromOpenMeteoResponse(OpenMeteoResponseSingle pointForecast, Guid routeId)
        {
            var results = new PointForecastEntity()
            {
                RouteId = routeId,
                Position = new Point(pointForecast.Longitude, pointForecast.Latitude) { SRID = 4326 },
                Hourly = pointForecast.Hourly,
            };

            generateDateTimeUtc(results.Hourly);

            return results;
        }
    }
}
