using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using route_scoring_engine;
using Shared.Domain.Domain;

namespace RouteWeatherApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HomepageController : ControllerBase
    {
        private RouteScoringEngine _scoringEngine;

        public HomepageController(RouteScoringEngine scoringEngine)
        {
            _scoringEngine = scoringEngine;
        }

        [HttpGet()]
        public async Task<RouteScoringDetails?> Get(Guid id)
        {
            return await _scoringEngine.ScoreRouteToday(id);
        }
    }
}
