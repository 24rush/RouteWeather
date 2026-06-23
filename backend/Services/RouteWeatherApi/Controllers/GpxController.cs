using api.Services;
using Microsoft.AspNetCore.Mvc;
using route_scoring_engine;
using Shared.Domain.Domain;
using System.Xml.Linq;

namespace api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GpxController : ControllerBase
    {
        private readonly GPXTrackService _service;
        private readonly RouteScoringEngine _routeScoring;
        private readonly IBackgroundTaskQueue _queue;

        public GpxController(GPXTrackService service, RouteScoringEngine scoringEngine, IBackgroundTaskQueue queue)
        {
            _queue = queue;
            _service = service;
            _routeScoring = scoringEngine;
        }
        private List<TrackPoint> parseGpxFile(IFormFile file)
        {
            var doc = XDocument.Load(file.OpenReadStream());
            XNamespace ns = doc.Root!.Name.Namespace;

            var points = doc
                .Descendants(ns + "trkpt")
                .Select(p => new TrackPoint()
                {
                    Latitude = double.Parse(p.Attribute("lat")!.Value),
                    Longitude = double.Parse(p.Attribute("lon")!.Value),
                    Elevation = p.Element(ns + "ele") is { } ele
                        ? double.Parse(ele.Value)
                        : 0
                })
                .ToList();

            return points;
        }

        /// <summary>
        /// Accepts a GPX file upload and returns the parsed XML content.
        /// </summary>
        [HttpPost("upload")]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { error = "No file provided." });

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (extension != ".gpx")
                return BadRequest(new { error = "Only .gpx files are accepted." });

            var points = parseGpxFile(file);

            if (points.Count < 2)
                return BadRequest(new { error = "No track points found." });

            var gpxTrack = await _service.CreateGPXTrack(file.FileName, points);
            await _service.SaveGpxTrack(gpxTrack);

            _ = _queue.QueueAsync(gpxTrack.Id);

            return Ok(new
            {
                fileName = file.FileName,
                sizeBytes = file.Length,
            });
        }

        /// <summary>
        /// Accepts a GPX file upload and returns the parsed XML content.
        /// </summary>
        [HttpPost("uploadAnon")]
        public async Task<ActionResult<RouteScoringDetails>> UploadAnon(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { error = "No file provided." });

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (extension != ".gpx")
                return BadRequest(new { error = "Only .gpx files are accepted." });

            var points = parseGpxFile(file);

            if (points.Count < 2)
                return BadRequest(new { error = "No track points found." });

            var gpxTrack = await _service.CreateGPXTrack(file.FileName, points);

            return Ok(await _routeScoring.ScoreRouteToday(gpxTrack));
        }
    }
}
