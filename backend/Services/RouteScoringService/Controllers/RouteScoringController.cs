using Microsoft.AspNetCore.Mvc;
using route_scoring_engine;

namespace routescoringservice.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class RouteScoringController : ControllerBase
    {
        private readonly IBackgroundTaskQueue _queue;

        public RouteScoringController(IBackgroundTaskQueue queue)
        {
            _queue = queue;
        }

        [HttpGet("scoreroute")]
        public async Task ScoreRoute(Guid routeId)
        {
            await _queue.QueueAsync(routeId);

            Ok();
        }
    }
}
