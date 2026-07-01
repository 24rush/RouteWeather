using Shared.Domain.Domain;
using System.Text;

namespace Shared.Domain.Coordinates
{
    public static class PolylineEncoder
    {
        // Encodes a list of Latitude/Longitude pairs
        public static string EncodeCoordinates(IEnumerable<TrackPoint> points)
        {
            var str = new StringBuilder();
            int lastLat = 0;
            int lastLng = 0;

            foreach (var point in points)
            {
                int lat = (int)Math.Round(point.Latitude * 1e5);
                int lng = (int)Math.Round(point.Longitude * 1e5);

                int deltaLat = lat - lastLat;
                int deltaLng = lng - lastLng;

                EncodeValue(deltaLat, str);
                EncodeValue(deltaLng, str);

                lastLat = lat;
                lastLng = lng;
            }

            return str.ToString();
        }

        // Encodes a list of Elevations (scaled to 1 decimal place / 10cm accuracy)
        public static string EncodeElevation(IEnumerable<double> elevations)
        {
            var str = new StringBuilder();
            int lastEle = 0;

            foreach (var ele in elevations)
            {
                int currentEle = (int)Math.Round(ele * 10); // 10cm precision
                int deltaEle = currentEle - lastEle;

                EncodeValue(deltaEle, str);
                lastEle = currentEle;
            }

            return str.ToString();
        }

        private static void EncodeValue(int value, StringBuilder str)
        {
            int sValue = value << 1;
            if (value < 0) sValue = ~sValue;

            while (sValue >= 0x20)
            {
                str.Append((char)((0x20 | (sValue & 0x1f)) + 63));
                sValue >>= 5;
            }
            str.Append((char)(sValue + 63));
        }
    }
}
