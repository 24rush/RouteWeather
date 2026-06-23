using System.Threading.Channels;

namespace route_scoring_engine
{ 
    public interface IBackgroundTaskQueue
    {
        ValueTask QueueAsync(Guid routeId);
        ValueTask<Guid> DequeueAsync(CancellationToken cancellationToken);
    }

    public class BackgroundTaskQueue : IBackgroundTaskQueue
    {
        private readonly Channel<Guid> _queue = Channel.CreateUnbounded<Guid>();

        public ValueTask QueueAsync(Guid routeId)
        {
            return _queue.Writer.WriteAsync(routeId);
        }

        public ValueTask<Guid> DequeueAsync(CancellationToken cancellationToken)
        {
            return _queue.Reader.ReadAsync(cancellationToken);
        }
    }
}