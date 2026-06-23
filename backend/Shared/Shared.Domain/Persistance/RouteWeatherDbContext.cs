using Microsoft.EntityFrameworkCore;
using Shared.Domain.Persistance.Models;

namespace Shared.Domain.Persistance
{
    public class RouteWeatherDbContext : DbContext
    {
        public DbSet<GPXTrackEntity> GPXTracks { get; set; }
        public DbSet<PointForecastEntity> PointForecast { get; set; }

        public RouteWeatherDbContext(DbContextOptions<RouteWeatherDbContext> options)
            : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<PointForecastEntity>().OwnsOne(x => x.Hourly);            
        }
    }
}