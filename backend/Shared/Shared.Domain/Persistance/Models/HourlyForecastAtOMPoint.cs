
namespace Shared.Domain.Persistance.Models
{
    public class HourlyForecastAtOMPoint
    {        
        public string Time { get; set; } = default!;
        public double Temperature2m { get; set; }
        public int PrecipitationProbability { get; set; }
        public double Precipitation { get; set; }
        public double Rain { get; set; }
        public double WindSpeed10m { get; set; }
        public double WindDirection10m { get; set; }
    }
}
