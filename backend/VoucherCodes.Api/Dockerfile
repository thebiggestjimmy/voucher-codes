# syntax=docker/dockerfile:1

# ── Build stage ─────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore first (cached unless the csproj changes).
COPY VoucherCodes.Api.csproj ./
RUN dotnet restore VoucherCodes.Api.csproj

COPY . ./
RUN dotnet publish VoucherCodes.Api.csproj -c Release -o /app /p:UseAppHost=false

# ── Runtime stage ───────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# SQLite database lives on a mounted volume so data survives redeploys.
RUN mkdir -p /data

ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_URLS=http://+:8080 \
    ConnectionStrings__Default="Data Source=/data/vouchers.db"

COPY --from=build /app ./

EXPOSE 8080
ENTRYPOINT ["dotnet", "VoucherCodes.Api.dll"]
