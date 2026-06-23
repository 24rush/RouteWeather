using Shared.Domain.Persistance.Models;

namespace Shared.Domain.Persistance.Repositories
{
    public interface IGPXTracksRepo
    {
        Task AddGPXTrack(GPXTrackEntity gpxTrack);
        Task SaveChangesAsync();
        Task<GPXTrackEntity?> GetGPXTrackById(Guid routeId);
    }
}