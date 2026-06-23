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

        public static PointForecastEntity FromOpenMeteoResponse(OpenMeteoResponseSingle pointForecast, Guid routeId)
        {
            return new PointForecastEntity()
            {
                RouteId = routeId,
                Position = new Point(pointForecast.Longitude, pointForecast.Latitude) { SRID = 4326 },
                Hourly = pointForecast.Hourly,
            };
        }
    }
}
