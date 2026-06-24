using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using Shared.Domain.OpenMeteo;
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
            var results = await _context.PointForecast.Where(fp => fp.RouteId == routeId).AsNoTracking().ToListAsync();
            results.ForEach(r => generateDateTimeLocals(r.Hourly));

            return results;
        }

        private void generateDateTimeLocals(HourlyData hourly)
        {
            // Generate DateTime timestamps in local time
            // TODO: This is server time
            hourly.LocalTime = new DateTime[hourly.Time.Length];

            for (var i = 0; i < hourly.Time.Length; i++)
            {
                hourly.LocalTime[i] = DateTime.SpecifyKind(DateTime.Parse(hourly.Time[i]), DateTimeKind.Utc).ToLocalTime();
            }
        }

        async Task<PointForecastEntity?> IWeatherForecastRepo.GetForecastAtPoint(Point latLng)
        {
            var forecast = await _context.PointForecast.Where(p => p.Position.IsWithinDistance(latLng, CoordinateDistToleranceFine))
                .OrderBy(p => p.Position.Distance(latLng))
                .Take(1)
                .AsNoTracking()
                .FirstOrDefaultAsync();

            if (forecast == null) return null;
            generateDateTimeLocals(forecast.Hourly);

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

            result.ForEach(r => generateDateTimeLocals(r.Hourly));

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

        public List<PointForecastEntity> GetPendingForecast()
        {
            var localForecast = _context.PointForecast.ToList();
            localForecast.ForEach(r => generateDateTimeLocals(r.Hourly));            

            return localForecast;
        }
    }
}
