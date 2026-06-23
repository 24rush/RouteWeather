using Shared.Domain.Domain;
using Shared.Domain.GPX;
using Shared.Domain.Persistance.Models;
using Shared.Domain.Persistance.Repositories;

namespace api.Services
{
    public class GPXTrackService
    {
        private readonly IGPXTracksRepo _repo;
        public GPXTrackService(IGPXTracksRepo repo)
        {
            _repo = repo;
        }

        public async Task<GPXTrackEntity> CreateGPXTrack(string name, List<TrackPoint> points)
        {
            var elevations = Utilities.SmoothElevations(points);
            var distances = Utilities.BuildCumulativeDistance(points);

            var gpxTrack = new GPXTrackEntity()
            {
                Name = name,
                Distance = distances[^1] / 1000.0,             
                SampledPoints = Utilities.PointsAtDistance(points, distances, 4000).ToLineString(),
                TrackPoints = Utilities.PointsAtDistance(points, distances, 25).ToLineString()
            };

            return gpxTrack;
        }

        public async Task SaveGpxTrack(GPXTrackEntity gPXTrackEntity)
        {
            await _repo.AddGPXTrack(gPXTrackEntity);
            await _repo.SaveChangesAsync();
        }
    }
}
