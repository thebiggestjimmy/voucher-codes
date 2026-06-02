using Microsoft.EntityFrameworkCore;
using VoucherCodes.Api.Data;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
                      ?? "Data Source=vouchers.db";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));

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
    // Idempotent top-up so categories added after the initial seed (e.g.
    // Fitness Trackers / WHOOP) also reach already-populated databases.
    DbSeeder.EnsureFitnessTrackers(db);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(CorsPolicy);
app.MapControllers();

app.Run();
