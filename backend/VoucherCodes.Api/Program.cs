using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using VoucherCodes.Api.Data;
using VoucherCodes.Api.Services;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
                      ?? "Data Source=vouchers.db";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));

builder.Services.AddSingleton<AdminAuthService>();

// Trust X-Forwarded-For / X-Forwarded-Proto from the reverse proxy chain
// (Caddy → nginx → this container). We only listen on the internal Docker
// network — external traffic can't reach us except through those proxies —
// so it's safe to accept the header from any upstream.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// Rate limit /api/admin/login to kill password brute force. Partitioned by
// client IP; 5 attempts per 15 minutes per IP, then 429 with Retry-After.
// Every other endpoint is unlimited.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (ctx, cancellationToken) =>
    {
        if (ctx.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            ctx.HttpContext.Response.Headers.RetryAfter =
                ((int)retryAfter.TotalSeconds).ToString();
        }
        await ctx.HttpContext.Response.WriteAsJsonAsync(
            new { error = "Too many login attempts. Please try again later." },
            cancellationToken);
    };

    options.AddPolicy("admin-login", ctx =>
    {
        var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(15),
            QueueLimit = 0,
            AutoReplenishment = true,
        });
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

const string CorsPolicy = "AllowFrontend";
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, policy =>
        policy.WithOrigins(
                // Local dev
                "http://localhost:5173",
                "http://localhost:4173",
                "http://127.0.0.1:5173",
                // Production (SirSavings — regional domains)
                "https://sirsavings.com",
                "https://www.sirsavings.com",
                "https://sirsavings.co.uk",
                "https://www.sirsavings.co.uk")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    DbSeeder.Seed(db);
    // Idempotent top-ups so schema/data added after the initial seed also reach
    // already-populated production databases. Order matters: add the column
    // before any insert (EnsureFitnessTrackers) references it.
    DbSeeder.EnsureSchema(db);
    DbSeeder.EnsureFitnessTrackers(db);
    DbSeeder.EnsurePersonalFinance(db);
}

var adminPasswordConfigured = Environment.GetEnvironmentVariable("ADMIN_PASSWORD")
    ?? builder.Configuration["Admin:Password"];
if (string.IsNullOrEmpty(adminPasswordConfigured) || adminPasswordConfigured == "changeme")
{
    app.Logger.LogWarning(
        "Admin password not set (or still 'changeme'). Set ADMIN_PASSWORD env var or Admin:Password in appsettings.json.");
}

// Forwarded headers must come before anything that reads Connection.RemoteIpAddress
// (i.e. the rate limiter), so the partition key is the real client IP.
app.UseForwardedHeaders();
app.UseRateLimiter();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(CorsPolicy);
app.MapControllers();

app.Run();
