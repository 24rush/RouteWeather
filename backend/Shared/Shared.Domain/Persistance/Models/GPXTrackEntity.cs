using NetTopologySuite.Geometries;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Shared.Domain.Persistance.Models
{
    public class GPXTrackEntity
    {
        [JsonIgnore]
        public Guid Id { get; init; }

        [Required]
        public required string Name { get; init; }
        [Required]
        public required double Distance { get; set; } 
        [Required]
        public required LineString SampledPoints { get; set; }
        [Required]
        public required LineString TrackPoints { get; set; }

        [JsonIgnore]
        public DateTime ForecastGenerationTime {  get; set; }
    }
}
