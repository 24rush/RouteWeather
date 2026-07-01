using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using Shared.Domain.Persistance.Models;

namespace Shared.Domain.Persistance.Repositories
{
    public class WeatherForecastRepo : IWeatherForecastRepo
    {
        private readonly double CoordinateDistToleranceFine = 200.0; // 200m

        private readonly RouteWeatherDbContext _context;

        public WeatherForecastRepo(RouteWeatherDbContext context)
        {
            _context = context;
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }

        public async Task<List<PointForecastEntity>?> GetForecastForRouteID(Guid routeId)
        {
            return await _context.PointForecast.Where(fp => fp.RouteId == routeId).AsNoTracking().ToListAsync();            
        }

        async Task<PointForecastEntity?> IWeatherForecastRepo.GetForecastAtPoint(Point latLng)
        {
            var forecast = await _context.PointForecast.Where(p => p.Position.IsWithinDistance(latLng, CoordinateDistToleranceFine))
                .OrderBy(p => p.Position.Distance(latLng))
                .Take(1)
                .AsNoTracking()
                .FirstOrDefaultAsync();

            if (forecast == null) return null;

            return forecast;
        }

        async Task<List<PointForecastEntity>?> IWeatherForecastRepo.GetForecastAtPoints(Point[] latLngs)
        {
            if (latLngs == null || latLngs.Length == 0)
                return null;

            var now = DateTime.UtcNow;
            var maxStaleTime = now.AddHours(3);

            var result = new List<PointForecastEntity>();

            foreach (var p in latLngs)
            {
                var match = await _context.PointForecast
                    .FirstOrDefaultAsync(e => e.Position.Distance(p) <= 0.1);

                if (match != null)
                    result.AddRange(match);
            }

            if (result.Count == 0)
                return null;

            return result;
        }

        void IWeatherForecastRepo.AddForecastAtPoint(PointForecastEntity forecast)
        {
            _context.PointForecast.Add(forecast);
        }

        public async Task RemoveForecastForRouteID(Guid routeId)
        {
            await _context.PointForecast.Where(x => x.RouteId == routeId).ExecuteDeleteAsync();
        }
    }
}
