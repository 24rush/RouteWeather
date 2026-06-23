using Shared.Domain.Domain;

namespace Shared.Domain.GPX
{
    public class PeaksFinder
    {
        public static List<TrackPoint> FindPeaks(List<TrackPoint> points, double[] distances, double[] elevations)
        {
            const double minClimbDistance = 1500;
            const double minClimbGain = 75;
            const double minDescentAfterPeak = 25;

            var peaks = new List<TrackPoint>();

            int climbStart = 0;

            for (int i = 1; i < points.Count - 1; i++)
            {
                // significant downhill → finish current climb
                if (elevations[i] < elevations[i - 1] - 5)
                {
                    int peakIndex = FindHighestPoint(
                        elevations,
                        climbStart,
                        i);

                    double climbDistance =
                        distances[peakIndex] -
                        distances[climbStart];

                    double climbGain =
                        elevations[peakIndex] -
                        elevations[climbStart];

                    double descent =
                        elevations[peakIndex] -
                        elevations[i];

                    if (climbDistance >= minClimbDistance &&
                        climbGain >= minClimbGain &&
                        descent >= minDescentAfterPeak)
                    {
                        peaks.Add(points[peakIndex]);
                    }

                    climbStart = i;
                }
            }

            return MergeNearbyPeaks(
                peaks,
                minimumDistanceMeters: 500);
        }

        private static int FindHighestPoint(double[] elevations, int start, int end)
        {
            int highest = start;

            for (int i = start + 1; i <= end; i++)
            {
                if (elevations[i] > elevations[highest])
                    highest = i;
            }

            return highest;
        }

        private static List<TrackPoint> MergeNearbyPeaks(List<TrackPoint> peaks, double minimumDistanceMeters)
        {
            if (peaks.Count < 2)
                return peaks;

            var result = new List<TrackPoint>
            {
                peaks[0]
            };

            for (int i = 1; i < peaks.Count; i++)
            {
                var last = result[^1];
                var current = peaks[i];

                double distance = Utilities.Haversine(
                    last.Latitude,
                    last.Longitude,
                    current.Latitude,
                    current.Longitude);

                if (distance >= minimumDistanceMeters)
                {
                    result.Add(current);
                }
                else if ((current.Elevation ?? 0) >
                         (last.Elevation ?? 0))
                {
                    result[^1] = current;
                }
            }

            return result;
        }
    }
}
