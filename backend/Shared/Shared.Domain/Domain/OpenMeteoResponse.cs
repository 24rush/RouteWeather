using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using System.Linq;

namespace Shared.Domain.OpenMeteo
{
    public class OpenMeteoResponseSingle
    {
        [JsonPropertyName("latitude")]
        public double Latitude { get; set; }
        [JsonPropertyName("longitude")]
        public double Longitude { get; set; }
        public HourlyData Hourly { get; set; } = default!;
        public DateTime GenerationTime { get; set; }
    }

    public class HourlyData
    {
        // All timestamps in UTC
        private DateTime[]? _utcTime;

        [NotMapped]
        public DateTime[] UtcTime 
        { 
            get 
            {
                if (_utcTime == null || _utcTime.Length != Time.Length)
                {
                    _utcTime = Time.Select(t => DateTime.SpecifyKind(DateTime.Parse(t), DateTimeKind.Utc)).ToArray();
                }
                return _utcTime;
            }
            set => _utcTime = value;
        }

        public string[] Time { get; set; } = [];

        [JsonPropertyName("temperature_2m")]
        public double[] Temperature2m { get; set; } = [];

        [JsonPropertyName("precipitation_probability")]
        public int[] PrecipitationProbability { get; set; } = [];

        [JsonPropertyName("precipitation")]
        public double[] Precipitation { get; set; } = [];

        [JsonPropertyName("rain")]
        public double[] Rain { get; set; } = [];

        [JsonPropertyName("wind_speed_10m")]
        public double[] WindSpeed10m { get; set; } = [];

        [JsonPropertyName("wind_direction_10m")]
        public double[] WindDirection10m { get; set; } = [];        
    }
}
