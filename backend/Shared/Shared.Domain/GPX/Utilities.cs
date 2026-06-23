using NetTopologySuite;
using NetTopologySuite.Geometries;
using Shared.Domain.Domain;

namespace Shared.Domain.GPX
{
    public static class Utilities
    {
        public static double Haversine(
            double lat1,
            double lon1,
            double lat2,
            double lon2)
        {
            const double R = 6371000;

            double dLat = DegreesToRadians(lat2 - lat1);
            double dLon = DegreesToRadians(lon2 - lon1);

            double a =
                Math.Pow(Math.Sin(dLat / 2), 2) +
                Math.Cos(DegreesToRadians(lat1)) *
                Math.Cos(DegreesToRadians(lat2)) *
                Math.Pow(Math.Sin(dLon / 2), 2);

            double c = 2 * Math.Atan2(
                Math.Sqrt(a),
                Math.Sqrt(1 - a));

            return R * c;
        }

        private static double DegreesToRadians(double degrees)
            => degrees * Math.PI / 180.0;

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
                    if (points[j].Elevation is double e)
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

        public static double[] BuildCumulativeDistance(List<TrackPoint> points)
        {
            var distances = new double[points.Count];

            for (int i = 1; i < points.Count; i++)
            {
                distances[i] =
                    distances[i - 1] +
                    Haversine(
                        points[i - 1].Latitude,
                        points[i - 1].Longitude,
                        points[i].Latitude,
                        points[i].Longitude);
            }

            return distances;
        }

        public static List<TrackPoint> PointsAtDistance(List<TrackPoint> items, double[] cumulativeDistanceMeters, double minimumDistanceMeters)
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
