using System.Data;
using Microsoft.EntityFrameworkCore;
using VoucherCodes.Api.Models;

namespace VoucherCodes.Api.Data;

public static class DbSeeder
{
    /// <summary>
    /// Applies columns added to the model after the database was first created.
    /// EnsureCreated() never alters an existing schema, so on production
    /// databases we add new columns ourselves. SQLite ADD COLUMN is cheap and
    /// this is guarded to run at most once per column.
    /// </summary>
    public static void EnsureSchema(AppDbContext db)
    {
        db.Database.EnsureCreated();

        if (!ColumnExists(db, "Vouchers", "RedeemCount"))
        {
            db.Database.ExecuteSqlRaw(
                "ALTER TABLE \"Vouchers\" ADD COLUMN \"RedeemCount\" INTEGER NOT NULL DEFAULT 0;");
        }
        if (!ColumnExists(db, "Vouchers", "IsApproved"))
        {
            // Rows that already exist are historical / seeded, so back-fill them as approved.
            db.Database.ExecuteSqlRaw(
                "ALTER TABLE \"Vouchers\" ADD COLUMN \"IsApproved\" INTEGER NOT NULL DEFAULT 1;");
        }
    }

    private static bool ColumnExists(AppDbContext db, string table, string column)
    {
        var conn = db.Database.GetDbConnection();
        var opened = false;
        if (conn.State != ConnectionState.Open)
        {
            conn.Open();
            opened = true;
        }
        try
        {
            using var cmd = conn.CreateCommand();
            cmd.CommandText = $"PRAGMA table_info(\"{table}\");";
            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                // PRAGMA table_info columns: cid, name, type, ...
                if (string.Equals(reader.GetString(1), column, StringComparison.OrdinalIgnoreCase))
                    return true;
            }
            return false;
        }
        finally
        {
            if (opened) conn.Close();
        }
    }

    public static void Seed(AppDbContext db)
    {
        db.Database.EnsureCreated();
        if (db.Categories.Any()) return;

        var fashion = new Category { Name = "Fashion", Color = "#ec4899" };
        var tech = new Category { Name = "Technology", Color = "#3b82f6" };
        var food = new Category { Name = "Food & Drink", Color = "#f97316" };
        var travel = new Category { Name = "Travel", Color = "#10b981" };
        var home = new Category { Name = "Home & Garden", Color = "#8b5cf6" };

        db.Categories.AddRange(fashion, tech, food, travel, home);
        db.SaveChanges();

        var asos = new Site { Name = "ASOS", Url = "https://asos.com", CategoryId = fashion.Id };
        var amazon = new Site { Name = "Amazon", Url = "https://amazon.com", CategoryId = tech.Id };
        var domino = new Site { Name = "Domino's Pizza", Url = "https://dominos.com", CategoryId = food.Id };
        var booking = new Site { Name = "Booking.com", Url = "https://booking.com", CategoryId = travel.Id };
        var ikea = new Site { Name = "IKEA", Url = "https://ikea.com", CategoryId = home.Id };

        db.Sites.AddRange(asos, amazon, domino, booking, ikea);
        db.SaveChanges();

        db.Vouchers.AddRange(
            new Voucher { Code = "SUMMER20", Description = "20% off summer collection", SiteId = asos.Id, SubmittedBy = "alex", Upvotes = 12, IsApproved = true },
            new Voucher { Code = "FREESHIP", Description = "Free shipping on orders over £50", SiteId = asos.Id, SubmittedBy = "sam", Upvotes = 4, IsApproved = true },
            new Voucher { Code = "PRIME10", Description = "£10 off your next Prime order", SiteId = amazon.Id, SubmittedBy = "jo", Upvotes = 9, ExpiresOn = DateTime.UtcNow.AddDays(30), IsApproved = true },
            new Voucher { Code = "TWOFORONE", Description = "Buy one get one free on large pizzas", SiteId = domino.Id, SubmittedBy = "pat", Upvotes = 21, IsApproved = true },
            new Voucher { Code = "STAY15", Description = "15% off stays in Europe", SiteId = booking.Id, SubmittedBy = "ren", Upvotes = 7, IsApproved = true },
            new Voucher { Code = "HOME5", Description = "£5 off a £25 spend", SiteId = ikea.Id, SubmittedBy = "kai", Upvotes = 3, IsApproved = true }
        );
        db.SaveChanges();
    }

    /// <summary>
    /// Idempotently adds the "Fitness Trackers" category (WHOOP + peers) so it
    /// lands on databases that were seeded before this category existed. Safe to
    /// run on every startup: it no-ops once the category is present and never
    /// touches existing data.
    /// </summary>
    public static void EnsureFitnessTrackers(AppDbContext db)
    {
        db.Database.EnsureCreated();
        if (db.Categories.Any(c => c.Name == "Fitness Trackers")) return;

        var fitness = new Category { Name = "Fitness Trackers", Color = "#14b8a6" };
        db.Categories.Add(fitness);
        db.SaveChanges();

        var whoop = new Site { Name = "WHOOP", Url = "https://www.whoop.com", CategoryId = fitness.Id };
        var garmin = new Site { Name = "Garmin", Url = "https://www.garmin.com", CategoryId = fitness.Id };
        var oura = new Site { Name = "Oura Ring", Url = "https://ouraring.com", CategoryId = fitness.Id };
        db.Sites.AddRange(whoop, garmin, oura);
        db.SaveChanges();

        db.Vouchers.AddRange(
            new Voucher { Code = "WHOOPFREE", Description = "One month free WHOOP membership for new members", SiteId = whoop.Id, SubmittedBy = "ada", Upvotes = 18, IsApproved = true },
            new Voucher { Code = "JOIN30", Description = "30-day free trial plus a free band on a 12-month membership", SiteId = whoop.Id, SubmittedBy = "marco", Upvotes = 11, ExpiresOn = DateTime.UtcNow.AddDays(45), IsApproved = true },
            new Voucher { Code = "GARMIN10", Description = "10% off your first Garmin wearable", SiteId = garmin.Id, SubmittedBy = "lena", Upvotes = 6, IsApproved = true },
            new Voucher { Code = "OURA40", Description = "£40 off the Oura Ring 4", SiteId = oura.Id, SubmittedBy = "sam", Upvotes = 8, IsApproved = true }
        );
        db.SaveChanges();
    }

    /// <summary>
    /// Idempotently adds the "Personal Finance" category (Tide + Monzo + Starling)
    /// with sample codes. Same shape as EnsureFitnessTrackers — safe to run every
    /// startup, no-ops once the category is present.
    /// </summary>
    public static void EnsurePersonalFinance(AppDbContext db)
    {
        db.Database.EnsureCreated();
        if (db.Categories.Any(c => c.Name == "Personal Finance")) return;

        var finance = new Category { Name = "Personal Finance", Color = "#14b8a6" };
        db.Categories.Add(finance);
        db.SaveChanges();

        var tide = new Site { Name = "Tide", Url = "https://tide.co", CategoryId = finance.Id };
        var monzo = new Site { Name = "Monzo", Url = "https://monzo.com", CategoryId = finance.Id };
        var starling = new Site { Name = "Starling Bank", Url = "https://starlingbank.com", CategoryId = finance.Id };
        db.Sites.AddRange(tide, monzo, starling);
        db.SaveChanges();

        db.Vouchers.AddRange(
            new Voucher { Code = "TIDE100", Description = "£100 cashback when you open a Tide business account", SiteId = tide.Id, SubmittedBy = "team", Upvotes = 18, ExpiresOn = DateTime.UtcNow.AddDays(60), IsApproved = true },
            new Voucher { Code = "TIDEFREE", Description = "Free company formation when you open a Tide account", SiteId = tide.Id, SubmittedBy = "team", Upvotes = 11, IsApproved = true },
            new Voucher { Code = "TIDEREF50", Description = "£50 referral bonus on a new Tide account", SiteId = tide.Id, SubmittedBy = "rae", Upvotes = 6, ExpiresOn = DateTime.UtcNow.AddDays(45), IsApproved = true },
            new Voucher { Code = "MONZO5", Description = "£5 sign-up bonus on a new Monzo current account", SiteId = monzo.Id, SubmittedBy = "team", Upvotes = 8, IsApproved = true },
            new Voucher { Code = "STARLING10", Description = "£10 cashback on first card spend with Starling", SiteId = starling.Id, SubmittedBy = "team", Upvotes = 5, ExpiresOn = DateTime.UtcNow.AddDays(90), IsApproved = true }
        );
        db.SaveChanges();
    }
}
