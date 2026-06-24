# See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080
EXPOSE 8081
RUN apt-get update && apt-get install -y libgssapi-krb5-2 && rm -rf /var/lib/apt/lists/*

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["Services/RouteWeatherApi/RouteWeatherApi.csproj", "Services/RouteWeatherApi/"]
COPY ["Shared/RouteScoringEngine/RouteScoringEngine.csproj", "Shared/RouteScoringEngine/"]
COPY ["Shared/Shared.Domain/Shared.Domain.csproj", "Shared/Shared.Domain/"]
RUN dotnet restore "./Services/RouteWeatherApi/RouteWeatherApi.csproj"
COPY . .
WORKDIR "/src/Services/RouteWeatherApi"
RUN dotnet build "./RouteWeatherApi.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./RouteWeatherApi.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "RouteWeatherApi.dll"]