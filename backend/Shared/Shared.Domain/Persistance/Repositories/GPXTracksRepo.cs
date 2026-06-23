using Microsoft.EntityFrameworkCore;
using Shared.Domain.Persistance.Models;

namespace Shared.Domain.Persistance.Repositories
{
    public class GPXTracksRepo : IGPXTracksRepo
    {
        private readonly RouteWeatherDbContext _context;

        public GPXTracksRepo(RouteWeatherDbContext context)
        {
            _context = context;
        }

        public async Task<GPXTrackEntity?> GetGPXTrackById(Guid routeId)
        {
            return await _context.GPXTracks.FirstOrDefaultAsync(gpxT => gpxT.Id == routeId);
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }

        public async Task AddGPXTrack(GPXTrackEntity gpxTrackEntity)
        {
            _context.GPXTracks.Add(gpxTrackEntity);            
        }
    }
}
