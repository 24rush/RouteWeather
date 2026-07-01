using NetTopologySuite.Geometries;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Shared.Domain.Persistance.Models
{
    public class GPXTrackEntity
    {
        [JsonIgnore]
        public Guid Id { get; init; }        
        [JsonIgnore]
        public DateTime ForecastGenerationTime { get; set; }

        // Database
        [Required]
        public required string Name { get; init; }        
        [Required]        
        public required LineString WeatherPoints { get; set; } // Weather points at 4 km distance
        [Required]        
        public required LineString TrackPoints { get; set; }
        [Required]
        public required string RoutePolyline { get; set; }
        [Required]        
        public required string Physics { get; set; } // JSON containing the master array and corresponding parameters
    }
}
