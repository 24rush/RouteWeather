using NetTopologySuite.Geometries;

namespace Shared.Domain.Domain
{
    public class TrackPoint
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double? Elevation { get; set; }
        public Coordinate Coordinate => new Coordinate(Longitude, Latitude);
    };

    public static class CoordinateExtensions
    {
        public static TrackPoint ToTrackPoint(this Coordinate trackPoint) => new TrackPoint() { Latitude = trackPoint.Y, Longitude = trackPoint.X };

        public static Point ToPoint(this Coordinate trackPoint) => new Point(trackPoint) { SRID = 4326 };
    }
}

