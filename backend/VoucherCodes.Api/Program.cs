using Microsoft.EntityFrameworkCore;
using VoucherCodes.Api.Data;
using VoucherCodes.Api.Services;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
                      ?? "Data Source=vouchers.db";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));

builder.Services.AddSingleton<AdminAuthService>();

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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(CorsPolicy);
app.MapControllers();

app.Run();
