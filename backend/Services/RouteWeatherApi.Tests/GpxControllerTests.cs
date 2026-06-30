using System.Net.Http.Headers;
using Microsoft.AspNetCore.Mvc.Testing;

namespace RouteWeatherApi.Tests
{
    public class GpxControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        public GpxControllerTests(WebApplicationFactory<Program> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task UploadAnon_WithValidGpx_ReturnsOk()
        {
            // Arrange
            var client = _factory.CreateClient();
            var gpxContent = await File.ReadAllTextAsync("gpx_samples/RGT - The Wall.gpx");

            using var content = new MultipartFormDataContent();
            var fileContent = new StringContent(gpxContent);
            fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/octet-stream");

            // The parameter name in UploadAnon is "file"
            content.Add(fileContent, "file", "RGT - The Wall.gpx");

            // Act
            var response = await client.PostAsync("/api/gpx/uploadAnon", content);

            // Assert
            response.EnsureSuccessStatusCode(); // Status Code 200-299
            
            var responseString = await response.Content.ReadAsStringAsync();
            Assert.NotEmpty(responseString);
        }
    }
}
