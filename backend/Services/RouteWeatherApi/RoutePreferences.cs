namespace api
{
    public enum RoutePreferencesSpeed
    {
        Slow,
        Medium,
        Fast
    }

    public class RoutePreferences
    {
        public RoutePreferencesSpeed Speed { get; set; }        
    }
}
