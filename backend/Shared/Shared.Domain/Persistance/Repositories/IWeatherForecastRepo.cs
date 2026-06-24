using NetTopologySuite.Geometries;
using Shared.Domain.Persistance.Models;

namespace Shared.Domain.Persistance.Repositories
{
    public interface IWeatherForecastRepo
    {
        Task<PointForecastEntity?> GetForecastAtPoint(Point latLng);
        Task<List<PointForecastEntity>?> GetForecastAtPoints(Point[] latLng);
        Task<List<PointForecastEntity>?> GetForecastForRouteID(Guid routeId);
        Task RemoveForecastForRouteID(Guid routeId);
        void AddForecastAtPoint(PointForecastEntity forecast);
        List<PointForecastEntity> GetPendingForecast();
        Task SaveChangesAsync();
    }
}