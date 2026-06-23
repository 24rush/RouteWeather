using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace route_scoring_engine
{
    public class RouteScoringBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IBackgroundTaskQueue _queue;

        public RouteScoringBackgroundService(IServiceScopeFactory scopeFactory, IBackgroundTaskQueue queue)
        {
            _queue = queue;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var routeId = await _queue.DequeueAsync(stoppingToken);

                    using var scope = _scopeFactory.CreateScope();

                    var routeService =
                        scope.ServiceProvider.GetRequiredService<RouteScoringEngine>();

                    await routeService.ScoreRouteToday(routeId);
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex.Message);
                }
            }
        }
    }
}
