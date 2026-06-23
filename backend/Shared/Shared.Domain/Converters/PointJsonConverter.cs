using NetTopologySuite.Geometries;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Shared.Domain.Converters
{
    public class PointJsonConverter : JsonConverter<Point>
    {
        public override Point Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            double x = 0.0, y = 0.0;
            var value = reader.GetString();

            if (!string.IsNullOrWhiteSpace(value))
            {
                // expecting "X,Y"
                var parts = value.Split(',');

                x = double.Parse(parts[0]);
                y = double.Parse(parts[1]);
            }

            var geometryFactory = new GeometryFactory();
            return geometryFactory.CreatePoint(new Coordinate(x, y));
        }

        public override void Write(Utf8JsonWriter writer, Point value, JsonSerializerOptions options)
        {
            if (value == null)
            {
                writer.WriteNullValue();
                return;
            }

            // choose your format here
            writer.WriteStringValue($"{value.Y},{value.X}");
        }

        public override Point ReadAsPropertyName(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var value = reader.GetString();
            return Parse(value);
        }

        public override void WriteAsPropertyName(Utf8JsonWriter writer, Point value, JsonSerializerOptions options)
        {
            writer.WritePropertyName(Serialize(value));
        }

        private static string Serialize(Point p) =>
            $"{p.Y.ToString(CultureInfo.InvariantCulture)},{p.X.ToString(CultureInfo.InvariantCulture)}";

        private static Point Parse(string? s)
        {
            double x = 0.0, y = 0.0;

            if (s != null)
            {
                var parts = s.Split(',');
                x = double.Parse(parts[0], CultureInfo.InvariantCulture); 
                y = double.Parse(parts[0], CultureInfo.InvariantCulture);                
            }

            return new GeometryFactory().CreatePoint(new Coordinate(y, x));
        }
    }
}
