using RouteWeatherApi.Services;
using Shared.Domain.Coordinates;
using Shared.Domain.Domain;
using Shared.Domain.GPX;
using Shared.Domain.Persistance.Models;
using Shared.Domain.Persistance.Repositories;
using System.Text.Json;

namespace api.Services
{
    class AdaptiveRoute
    {
        // These parallel arrays share the exact same index keys
        public List<int> Distances { get; set; } = new();
        public List<float> SpeedMultipliers { get; set; } = new();
        public List<int> Bearings { get; set; } = new();
        public List<int> Elevations { get; set; } = new();
        public List<RouteSection> Sections { get; set; } = new();

        /// <summary>
        /// Adds a synchronized data entry across all parallel physics arrays.
        /// </summary>
        /// <param name="point">The GPX coordinate point entity containing elevation.</param>
        /// <param name="distance">The accumulated distance of the current segment in meters.</param>
        /// <param name="bearing">The forward-facing compass bearing in degrees (0-360).</param>
        /// <param name="multiplier">The computed terrain velocity multiplier.</param>
        public void AddPoint(TrackPoint point, int distanceFromStart, int bearing = 0, float multiplier = 1)
        {
            // Rounding data elements slightly saves JSON payload string space 
            Distances.Add(distanceFromStart);        // 10cm distance resolution
            Elevations.Add((int)(point?.Elevation ?? 0));     // 10cm elevation resolution
            Bearings.Add(bearing);             // 1-degree compass precision
            SpeedMultipliers.Add(multiplier);  // 2-decimal scale factor tracking
        }
    }

    public class GPXTrackService
    {
        private readonly IGPXTracksRepo _repo;
        public GPXTrackService(IGPXTracksRepo repo)
        {
            _repo = repo;
        }

        public async Task<GPXTrackEntity> CreateGPXTrack(string name, List<TrackPoint> points)
        {
            var distances = Utilities.BuildCumulativeGPSDistances(points);
            var elevations = Utilities.SmoothElevations(points);

            var routeConfig = RouteConfigFactory.GetParameters(ActivityProfile.RoadCycling);
            var adaptiveRoute = ProcessTrack(points, routeConfig.MaxDistanceInterval, routeConfig.ElevationThreshold, routeConfig.BearingThreshold);            

            var physics = new RouteSamplingData()
            {
                Distances = adaptiveRoute.Distances.ToArray(),
                SpeedMultipliers = adaptiveRoute.SpeedMultipliers.ToArray(),
                Bearings = adaptiveRoute.Bearings.ToArray(),
                Elevations = adaptiveRoute.Elevations.ToArray(),
                Sections = Utilities.FindFeatures(adaptiveRoute.Elevations, adaptiveRoute.Distances).ToArray(),
            };

            var gpxTrack = new GPXTrackEntity()
            {
                Name = name,

                // Weather points should be 4km apart as OpenMeteo returns points in a 5x5km cell grid
                WeatherPoints = Utilities.PointsAtDistanceCrow(points, distances, 4000).ToLineString(),
                TrackPoints = Utilities.PointsAtDistanceOnTrack(points, distances, 25).ToLineString(),
                RoutePolyline = PolylineEncoder.EncodeCoordinates(points),
                Physics = JsonSerializer.Serialize(physics, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
            };

            return gpxTrack;
        }

        public async Task SaveGpxTrack(GPXTrackEntity gPXTrackEntity)
        {
            await _repo.AddGPXTrack(gPXTrackEntity);
            await _repo.SaveChangesAsync();
        }

        private double calculateVelocityMultiplier(double gradient, string activityType)
        {
            if (activityType == "Cycling")
            {
                if (gradient > 8) return 0.35; // Steep climb
                if (gradient > 3) return 0.65; // Moderate climb
                if (gradient < -3) return 1.40; // Descent bonus
                return 1.0;                     // Flat territory
            }
            else // Trail Running
            {
                if (gradient > 10) return 0.50; // Extreme power hiking climb
                if (gradient > 4) return 0.75; // Running climb
                if (gradient < -8) return 0.85; // Technical steep descent penalty
                return 1.0;                     // Flat territory
            }
        }

        AdaptiveRoute ProcessTrack(List<TrackPoint> rawPoints, double maxDistanceInterval, double elevationThreshold, double bearingThreshold)
        {            
            var calculateShortestAngle = (int fromBearing, int toBearing) =>
            {
                int delta = toBearing - fromBearing;

                // Normalizes the angle to be within the range [-180, 180]
                delta = ((delta + 180) % 360 + 360) % 360 - 180;

                return delta;
            };

            var adaptiveRoute = new AdaptiveRoute();

            // Edge case: Empty or single-point tracks
            if (rawPoints == null || rawPoints.Count == 0) return adaptiveRoute;
            if (rawPoints.Count == 1)
            {
                adaptiveRoute.AddPoint(rawPoints[0], distanceFromStart: 0, bearing: 0, multiplier: (float)1.0);
                return adaptiveRoute;
            }

            // Initialize with the first anchor point
            var lastSaved = rawPoints[0];

            // Compute the initial bearing looking forward from point 0 to point 1
            lastSaved.Bearing = Utilities.BearingBetweenPoints(lastSaved, rawPoints[1]);
            adaptiveRoute.AddPoint(lastSaved, distanceFromStart: 0, bearing: lastSaved.Bearing ?? 0, multiplier: (float)1.0);

            int totalAccumulatedDistance = 0;
            int accumulatedDistanceBetweenSamples = 0;

            // Loop through raw points, stopping 1 point short of the end to allow for look-ahead
            for (int i = 0; i < rawPoints.Count - 1; i++)
            {
                var current = rawPoints[i];
                var next = rawPoints[i + 1];

                // 1. Calculate the distance and bearing looking forward to the next point
                int stepDistance = Utilities.DistanceBetweenTrackPoints(current, next);
                accumulatedDistanceBetweenSamples += stepDistance;
                totalAccumulatedDistance += stepDistance;

                int nextBearing = Utilities.BearingBetweenPoints(current, next);

                // 2. Check deltas relative to the LAST SAVED anchor point
                int eleDelta = Math.Abs((next.Elevation ?? 0) - (lastSaved.Elevation ?? 0));
                int bearingDelta = calculateShortestAngle(lastSaved.Bearing ?? 0, nextBearing);

                // 3. Evaluate if thresholds are crossed at the 'next' point
                if (accumulatedDistanceBetweenSamples >= maxDistanceInterval ||
                    eleDelta >= elevationThreshold ||
                    Math.Abs(bearingDelta) >= bearingThreshold ||
                    i == rawPoints.Count - 2) // Forced commit on the final segment
                {
                    // Calculate gradient and speed multiplier for the segment
                    double verticalChange = (next.Elevation ?? 0) - (lastSaved.Elevation ?? 0);
                    double gradientPercent = (verticalChange / accumulatedDistanceBetweenSamples) * 100;
                    float velocityMultiplier = (float) calculateVelocityMultiplier(gradientPercent, "Cycling");

                    // Commit the new point to the parallel arrays
                    adaptiveRoute.AddPoint(next, totalAccumulatedDistance, nextBearing, velocityMultiplier);

                    // Track the bearing on the anchor entity so the next loop cycle can run deltas against it
                    next.Bearing = nextBearing;

                    // Reset the anchor state machine
                    lastSaved = next;
                    accumulatedDistanceBetweenSamples = 0;
                }
            }

            return adaptiveRoute;
        }
    }
}
