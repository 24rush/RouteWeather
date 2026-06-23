using api.BackgroundService.OpenMeteo;
using api.Services;
using Microsoft.EntityFrameworkCore;
using route_scoring_engine;
using Shared.Domain.Converters;
using Shared.Domain.Persistance;
using Shared.Domain.Persistance.Repositories;
using System.Text.Json.Serialization;

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
        policy.WithOrigins("http://localhost:5173")
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
        o => o.UseNetTopologySuite());
});

var app = builder.Build();

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
