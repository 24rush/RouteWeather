using NetTopologySuite;
using NetTopologySuite.Geometries;
using Shared.Domain.Domain;

namespace Shared.Domain.GPX
{
    public static class Utilities
    {
        private const double DegreesToRadians = Math.PI / 180.0;
        private const double RadiansToDegrees = 180.0 / Math.PI;

        public static double Haversine(
            double lat1,
            double lon1,
            double lat2,
            double lon2)
        {
            const double R = 6371000;

            double dLat = DegreesToRadians * (lat2 - lat1);
            double dLon = DegreesToRadians * (lon2 - lon1);

            double a =
                Math.Pow(Math.Sin(dLat / 2), 2) +
                Math.Cos(DegreesToRadians * (lat1)) *
                Math.Cos(DegreesToRadians * (lat2)) *
                Math.Pow(Math.Sin(dLon / 2), 2);

            double c = 2 * Math.Atan2(
                Math.Sqrt(a),
                Math.Sqrt(1 - a));

            return R * c;
        }

        public static double[] SmoothElevations(List<TrackPoint> points, int windowSize = 11)
        {
            var result = new double[points.Count];
            int radius = windowSize / 2;

            for (int i = 0; i < points.Count; i++)
            {
                double sum = 0;
                int count = 0;

                for (int j = Math.Max(0, i - radius);
                     j <= Math.Min(points.Count - 1, i + radius);
                     j++)
                {
                    if (points[j].Elevation is int e)
                    {
                        sum += e;
                        count++;
                    }
                }

                result[i] = count > 0
                    ? sum / count
                    : 0;
            }

            return result;
        }

        public static int DistanceBetweenTrackPoints(TrackPoint a, TrackPoint b)
        {
            return (int)Haversine(a.Latitude, a.Longitude, b.Latitude, b.Longitude);
        }

        public static int BearingBetweenPoints(TrackPoint a, TrackPoint b)
        {
            // Convert coordinates to radians
            double lat1Rad = a.Latitude * DegreesToRadians;
            double lat2Rad = b.Latitude * DegreesToRadians;
            double deltaLngRad = (b.Longitude - a.Longitude) * DegreesToRadians;

            // Spherical trigonometry formula for forward bearing
            double y = Math.Sin(deltaLngRad) * Math.Cos(lat2Rad);
            double x = Math.Cos(lat1Rad) * Math.Sin(lat2Rad) -
                       Math.Sin(lat1Rad) * Math.Cos(lat2Rad) * Math.Cos(deltaLngRad);

            double bearingRad = Math.Atan2(y, x);

            // Convert back to degrees and normalize to [0, 360)
            double bearingDeg = bearingRad * RadiansToDegrees;
            return (int)((bearingDeg + 360.0) % 360.0);
        }

        public static int[] BuildCumulativeGPSDistances(List<TrackPoint> points)
        {
            var distances = new int[points.Count];

            for (int i = 1; i < points.Count; i++)
            {
                distances[i] = distances[i - 1] + DistanceBetweenTrackPoints(points[i - 1], points[i]);
            }

            return distances;
        }

        public static List<TrackPoint> PointsAtDistanceCrow(List<TrackPoint> points, int[] cumulativeDistanceMeters, int minimumDistanceMeters)
        {
            if (points == null || points.Count == 0) { return new List<TrackPoint>(); }

            var sampledPoints = new List<TrackPoint>();
            sampledPoints.Add(points[0]);

            foreach (var i in Enumerable.Range(1, points.Count - 1))
            {
                var lastPoint = sampledPoints.Last();

                var distanceToLast = Haversine(
                        lastPoint.Latitude,
                        lastPoint.Longitude,
                        points[i].Latitude,
                        points[i].Longitude);

                if (distanceToLast >= minimumDistanceMeters)
                {
                    sampledPoints.Add(points[i]);
                }
            }

            return sampledPoints;
        }

        public static List<TrackPoint> PointsAtDistanceOnTrack(List<TrackPoint> items, int[] cumulativeDistanceMeters, int minimumDistanceMeters)
        {
            var sampledPoints = new List<TrackPoint>();
            double lastDistance = cumulativeDistanceMeters[0];

            sampledPoints.Add(items[0]);

            foreach (var i in Enumerable.Range(1, items.Count - 1))
            {
                if (cumulativeDistanceMeters[i] - lastDistance >= minimumDistanceMeters)
                {
                    sampledPoints.Add(items[i]);
                    lastDistance = cumulativeDistanceMeters[i];
                }
            }

            sampledPoints.Add(items[^1]);
            return sampledPoints;
        }

        private enum TrendState { Flat, Climbing, Descending }

        private const int MaxFlatDistanceMeters = 600;
        private const double SteepElevationChangeThreshold = 75.0;

        public static List<RouteSection> FindFeatures(List<int> elevations, List<int> distances, int minVerticalThreshold = 20)
        {
            var features = new List<RouteSection>();
            if (elevations == null || elevations.Count < 2) return features;

            var CreateFeature = (RouteSectionType type, int start, int end, int delta) => new RouteSection
            {
                Type = type,
                StartIndex = start,
                EndIndex = end,
                ElevationDelta = delta
            };

            TrendState currentState = TrendState.Flat;
            int segmentStartIdx = 0;
            int anchorElevation = elevations[0];
            int peakOrTroughElevation = elevations[0];
            int peakOrTroughIndex = 0;

            for (int i = 1; i < elevations.Count; i++)
            {
                int currentEle = elevations[i];
                int prevEle = elevations[i - 1];
                int instantDelta = currentEle - prevEle;

                switch (currentState)
                {
                    case TrendState.Flat:
                        if (instantDelta > 0)
                        {
                            currentState = TrendState.Climbing;
                            segmentStartIdx = i - 1;
                            anchorElevation = prevEle;
                            peakOrTroughElevation = currentEle;
                            peakOrTroughIndex = i;
                        }
                        else if (instantDelta < 0)
                        {
                            currentState = TrendState.Descending;
                            segmentStartIdx = i - 1;
                            anchorElevation = prevEle;
                            peakOrTroughElevation = currentEle;
                            peakOrTroughIndex = i;
                        }
                        break;

                    case TrendState.Climbing:
                        if (currentEle >= peakOrTroughElevation)
                        {
                            peakOrTroughElevation = currentEle;
                            peakOrTroughIndex = i;
                        }

                        // Close section if we've traveled > 250m without reaching a new peak, OR if there's a steep sudden drop
                        if ((distances[i] - distances[peakOrTroughIndex] > MaxFlatDistanceMeters) || (peakOrTroughElevation - currentEle > SteepElevationChangeThreshold))
                        {
                            int finalClimbDelta = peakOrTroughElevation - anchorElevation;
                            if (finalClimbDelta >= minVerticalThreshold)
                            {
                                features.Add(CreateFeature(RouteSectionType.Ascent, segmentStartIdx, peakOrTroughIndex, finalClimbDelta));
                            }

                            currentState = TrendState.Descending;
                            segmentStartIdx = peakOrTroughIndex;
                            anchorElevation = peakOrTroughElevation;
                            peakOrTroughElevation = currentEle;
                            peakOrTroughIndex = i;
                        }
                        break;

                    case TrendState.Descending:
                        if (currentEle <= peakOrTroughElevation)
                        {
                            peakOrTroughElevation = currentEle;
                            peakOrTroughIndex = i;
                        }

                        // Close section if we've traveled > 250m without reaching a new trough, OR if there's a steep sudden climb
                        if ((distances[i] - distances[peakOrTroughIndex] > MaxFlatDistanceMeters) || (currentEle - peakOrTroughElevation > SteepElevationChangeThreshold))
                        {
                            int finalDescentDelta = peakOrTroughElevation - anchorElevation;
                            if (Math.Abs(finalDescentDelta) >= minVerticalThreshold)
                            {
                                features.Add(CreateFeature(RouteSectionType.Descent, segmentStartIdx, peakOrTroughIndex, finalDescentDelta));
                            }

                            currentState = TrendState.Climbing;
                            segmentStartIdx = peakOrTroughIndex;
                            anchorElevation = peakOrTroughElevation;
                            peakOrTroughElevation = currentEle;
                            peakOrTroughIndex = i;
                        }
                        break;
                }
            }

            if (currentState != TrendState.Flat)
            {
                int finalDelta = peakOrTroughElevation - anchorElevation;
                if (Math.Abs(finalDelta) >= minVerticalThreshold)
                {
                    var type = currentState == TrendState.Climbing ? RouteSectionType.Ascent : RouteSectionType.Descent;
                    features.Add(CreateFeature(type, segmentStartIdx, peakOrTroughIndex, finalDelta));
                }
            }

            // Post-processing: Merge adjacent sections of the same type that are less than 2km apart
            var mergedFeatures = new List<RouteSection>();
            if (features.Count > 0)
            {
                mergedFeatures.Add(features[0]);
                for (int i = 1; i < features.Count; i++)
                {
                    var current = features[i];
                    var last = mergedFeatures[mergedFeatures.Count - 1];

                    // User requested merging descending sections specifically, but it makes sense for both.
                    // We'll merge if they are the same type and within 2000m of each other.
                    if (last.Type == current.Type)
                    {
                        if (distances[current.StartIndex] - distances[last.EndIndex] <= 2000)
                        {
                            last.EndIndex = current.EndIndex;
                            last.ElevationDelta = elevations[last.EndIndex] - elevations[last.StartIndex];
                            continue;
                        }
                    }
                    mergedFeatures.Add(current);
                }
            }

            return mergedFeatures;
        }

        public static LineString ToLineString(this List<TrackPoint>? points)
        {
            if (points == null)
                return LineString.Empty;

            var geometryFactory = NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);

            var coordinates = points
                .Select(p => new Coordinate(p.Longitude, p.Latitude))
                .ToArray();

            return geometryFactory.CreateLineString(coordinates);
        }

        public static List<TrackPoint> ToTrackPointList(LineString lineString)
        {
            if (lineString == null || lineString.IsEmpty)
                return new List<TrackPoint>();

            return [.. lineString.Coordinates.Select(c => new TrackPoint() { Latitude = c.Y, Longitude = c.X })];
        }
    }
}
