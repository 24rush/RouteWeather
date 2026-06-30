using Shared.Domain.Domain;
using Shared.Domain.GPX;
using Xunit;

namespace Shared.Domain.Tests
{
    public class UtilitiesTests
    {
        [Fact]
        public void PointsAtDistanceCrow_ReturnsExpectedPoints()
        {
            // Arrange
            var points = new List<TrackPoint>
            {
                new TrackPoint { Latitude = 47.6062, Longitude = -122.3321 }, // Point 0: Seattle
                new TrackPoint { Latitude = 47.6063, Longitude = -122.3321 }, // Point 1: ~11m North
                new TrackPoint { Latitude = 47.6072, Longitude = -122.3321 }, // Point 2: ~111m North of Point 0
                new TrackPoint { Latitude = 47.6082, Longitude = -122.3321 }  // Point 3: ~222m North of Point 0
            };
            
            // Assume cumulative distances are correctly supplied (though not used in PointsAtDistanceCrow)
            int[] cumulative = { 0, 11, 111, 222 };
            int minDistance = 100; // minimum distance from last sampled point

            // Act
            var result = Utilities.PointsAtDistanceCrow(points, cumulative, minDistance);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(3, result.Count);
            
            // Point 0 is always included
            Assert.Equal(47.6062, result[0].Latitude);
            
            // Point 1 is skipped because it's only 11m from Point 0.
            // Point 2 is included because it's 111m from Point 0 (>= 100m).
            Assert.Equal(47.6072, result[1].Latitude);
            
            // Point 3 is included because it's ~111m from Point 2 (>= 100m).
            Assert.Equal(47.6082, result[2].Latitude);
        }

        [Fact]
        public void PointsAtDistanceOnTrack_ReturnsExpectedPoints()
        {
            // Arrange
            var points = new List<TrackPoint>
            {
                new TrackPoint { Latitude = 0, Longitude = 0 },
                new TrackPoint { Latitude = 0, Longitude = 0 },
                new TrackPoint { Latitude = 0, Longitude = 0 },
                new TrackPoint { Latitude = 0, Longitude = 0 },
                new TrackPoint { Latitude = 0, Longitude = 0 }
            };

            int[] cumulative = { 0, 50, 90, 150, 200 };
            int minDistance = 100;

            // Act
            var result = Utilities.PointsAtDistanceOnTrack(points, cumulative, minDistance);

            // Assert
            Assert.NotNull(result);
            
            // Point 0 (at 0m) is always included
            // Next included point is at index 3 (150m), since 150 - 0 >= 100
            // Point at index 4 (200m) is always included since it's the last point
            Assert.Equal(3, result.Count);
            Assert.Same(points[0], result[0]);
            Assert.Same(points[3], result[1]);
            Assert.Same(points[4], result[2]);
        }

        [Fact]
        public void Haversine_ComputesCorrectDistance()
        {
            // Arrange
            double lat1 = 47.6062; // Seattle
            double lon1 = -122.3321;
            
            double lat2 = 47.6062;
            double lon2 = -122.3321; // Same point

            // Act
            double distance1 = Utilities.Haversine(lat1, lon1, lat2, lon2);
            
            // Assert
            Assert.Equal(0, distance1, 5);
            
            // Test a known distance (Seattle to Portland)
            double portlandLat = 45.5152;
            double portlandLon = -122.6784;
            
            double distance2 = Utilities.Haversine(lat1, lon1, portlandLat, portlandLon);
            
            // Approximate distance is ~233km. We will assert it is within 1km.
            Assert.InRange(distance2, 232000, 235000);
        }

        [Fact]
        public void BuildCumulativeGPSDistances_ReturnsCorrectCumulativeValues()
        {
            // Arrange
            var points = new List<TrackPoint>
            {
                new TrackPoint { Latitude = 47.6062, Longitude = -122.3321 },
                new TrackPoint { Latitude = 47.6063, Longitude = -122.3321 }, // ~11m
                new TrackPoint { Latitude = 47.6064, Longitude = -122.3321 }  // + ~11m = ~22m
            };

            // Act
            var distances = Utilities.BuildCumulativeGPSDistances(points);

            // Assert
            Assert.Equal(3, distances.Length);
            Assert.Equal(0, distances[0]);
            Assert.InRange(distances[1], 10, 12);
            Assert.InRange(distances[2], 21, 23);
        }
    }
}
