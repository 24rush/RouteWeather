using api.BackgroundService.OpenMeteo;
using Microsoft.EntityFrameworkCore;
using route_scoring_engine;
using Shared.Domain.Persistance;
using Shared.Domain.Persistance.Repositories;

var builder = WebApplication.CreateBuilder(args);

// BackgroundService
builder.Services.AddHostedService<RouteScoringBackgroundService>();

builder.Services.AddSingleton<IBackgroundTaskQueue, BackgroundTaskQueue>();

// Repos
builder.Services.AddScoped<IGPXTracksRepo, GPXTracksRepo>();
builder.Services.AddScoped<IWeatherForecastRepo, WeatherForecastRepo>();

builder.Services.AddScoped<RouteScoringEngine>();
builder.Services.AddDbContext<RouteWeatherDbContext>(options =>
{
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("Postgres"),
        o => o.UseNetTopologySuite());
});

builder.Services.AddControllers();

builder.Services.AddHttpClient<OpenMeteoClient>(client =>
{
    client.BaseAddress = new Uri("https://api.open-meteo.com/");
});

// Allow the Vite frontend to call the API
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.

app.UseHttpsRedirection();

app.UseAuthorization();

app.UseCors("AllowFrontend");

app.MapControllers();

app.Run();
