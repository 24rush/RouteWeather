using api.BackgroundService.OpenMeteo;
using api.Services;
using Microsoft.EntityFrameworkCore;
using route_scoring_engine;
using Shared.Domain.Converters;
using Shared.Domain.Persistance;
using Shared.Domain.Persistance.Repositories;

var builder = WebApplication.CreateBuilder(args);

// BackgroundService
builder.Services.AddHostedService<RouteScoringBackgroundService>();

// API
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(new PointJsonConverter());
}); ;

builder.Services.AddHttpClient<OpenMeteoClient>(client =>
{
    client.BaseAddress = new Uri("https://api.open-meteo.com/");
});

// Allow the Vite frontend to call the API
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://zealous-plant-0db608010.7.azurestaticapps.net")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddSingleton<IBackgroundTaskQueue, BackgroundTaskQueue>();

builder.Services.AddScoped<IGPXTracksRepo, GPXTracksRepo>();
builder.Services.AddScoped<IWeatherForecastRepo, WeatherForecastRepo>();

builder.Services.AddScoped<GPXTrackService>();

builder.Services.AddScoped<RouteScoringEngine>();
builder.Services.AddDbContext<RouteWeatherDbContext>(options =>
{
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("Postgres"),
        o =>
        {
            o.UseNetTopologySuite();
            o.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(60), errorCodesToAdd: null);
        });
});

var app = builder.Build();

// Automatically run EF Core migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<Shared.Domain.Persistance.RouteWeatherDbContext>();
    db.Database.Migrate();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowFrontend");

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
public partial class Program { }
