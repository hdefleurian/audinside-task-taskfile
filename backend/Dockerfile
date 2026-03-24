# ── Build stage ───────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Directory.Packages.props .
COPY NuGet.Config .
COPY src/TaskApi/TaskApi.csproj src/TaskApi/
RUN dotnet restore src/TaskApi/TaskApi.csproj

COPY src/ src/
RUN dotnet publish src/TaskApi/TaskApi.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish \
    /p:UseAppHost=false

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Create a non-root user
RUN groupadd --system --gid 1001 appgroup \
    && useradd  --system --uid 1001 --gid appgroup appuser

COPY --from=build --chown=appuser:appgroup /app/publish .

USER appuser

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
    CMD bash -c '{ printf "GET /health HTTP/1.0\r\n\r\n" >&0; grep -q "200"; } 0<>/dev/tcp/localhost/8080'

ENTRYPOINT ["dotnet", "TaskApi.dll"]
