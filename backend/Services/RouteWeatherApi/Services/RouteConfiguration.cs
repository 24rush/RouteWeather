namespace RouteWeatherApi.Services
{
    public enum ActivityProfile
    {
        RoadCycling,        
        TrailRunning
    }

    public class RouteConfiguration
    {
        public double MaxDistanceInterval { get; set; }
        public double ElevationThreshold { get; set; }
        public double BearingThreshold { get; set; }
        public string ActivityType { get; set; } = default!;
    }

    public static class RouteConfigFactory
    {
        public static RouteConfiguration GetParameters(ActivityProfile profile)
        {
            return profile switch
            {
                ActivityProfile.RoadCycling => new RouteConfiguration
                {
                    MaxDistanceInterval = 250.0,
                    ElevationThreshold = 4.0,
                    BearingThreshold = 15.0,
                    ActivityType = "Cycling"
                },     
                ActivityProfile.TrailRunning => new RouteConfiguration
                {
                    MaxDistanceInterval = 50.0,
                    ElevationThreshold = 1.5,
                    BearingThreshold = 12.0,
                    ActivityType = "TrailRunning"
                },
                _ => throw new ArgumentOutOfRangeException(nameof(profile), $"Profile {profile} is not supported.")
            };
        }
    }
}
