using NetTopologySuite.Geometries;
using Shared.Domain.OpenMeteo;
using System.Net.Http.Json;

namespace api.BackgroundService.OpenMeteo
{
    public class OpenMeteoClient
    {
        private readonly HttpClient _httpClient;

        public OpenMeteoClient(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<OpenMeteoResponseSingle[]?> GetForecastAsync(
            Point[] latlngs,
            CancellationToken cancellationToken = default)
        {
            var latitudes = latlngs.Select(p => p.Y).ToArray();
            var longitudes = latlngs.Select(p => p.X).ToArray();

            var url =
                $"v1/forecast" +
                $"?latitude={string.Join(",", latitudes)}" +
                $"&longitude={string.Join(",", longitudes)}" +
                $"&hourly=temperature_2m,precipitation_probability,precipitation,rain,wind_speed_10m,wind_direction_10m" +
                $"&timezone=GMT";


            if (latitudes.Length <= 1)
            {
                var resultSingle = await _httpClient.GetFromJsonAsync<OpenMeteoResponseSingle>(url, cancellationToken);
                if (resultSingle != null)
                {
                    resultSingle.GenerationTime = DateTime.UtcNow;
                    return [resultSingle];
                }
            }
            else
            {
                var resultMultiple = await _httpClient.GetFromJsonAsync<OpenMeteoResponseSingle[]>(url, cancellationToken);
                if (resultMultiple != null)
                {
                    resultMultiple.Select(r => r.GenerationTime = DateTime.UtcNow).ToArray();
                    foreach (var item in resultMultiple)
                    {
                        Console.WriteLine($"{item.Latitude} {item.Longitude}");
                    }
                    return resultMultiple;
                }
            }

            return null;
        }
    }
}