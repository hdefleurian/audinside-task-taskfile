# ── Build stage ───────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

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
RUN addgroup --system --gid 1001 appgroup \
    && adduser  --system --uid 1001 --ingroup appgroup appuser

COPY --from=build --chown=appuser:appgroup /app/publish .

USER appuser

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "TaskApi.dll"]
