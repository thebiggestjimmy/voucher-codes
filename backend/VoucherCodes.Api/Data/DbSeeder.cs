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
        if (!ColumnExists(db, "Vouchers", "LinkUrl"))
        {
            db.Database.ExecuteSqlRaw(
                "ALTER TABLE \"Vouchers\" ADD COLUMN \"LinkUrl\" TEXT NOT NULL DEFAULT '';");
        }

        // SEO columns: Category and Site slugs + editorial descriptions. Slugs
        // are back-filled from Name via a follow-up UPDATE below so existing
        // rows immediately serve /category/:slug and /site/:slug URLs.
        if (!ColumnExists(db, "Categories", "Slug"))
        {
            db.Database.ExecuteSqlRaw(
                "ALTER TABLE \"Categories\" ADD COLUMN \"Slug\" TEXT NOT NULL DEFAULT '';");
        }
        if (!ColumnExists(db, "Categories", "Description"))
        {
            db.Database.ExecuteSqlRaw(
                "ALTER TABLE \"Categories\" ADD COLUMN \"Description\" TEXT NOT NULL DEFAULT '';");
        }
        if (!ColumnExists(db, "Sites", "Slug"))
        {
            db.Database.ExecuteSqlRaw(
                "ALTER TABLE \"Sites\" ADD COLUMN \"Slug\" TEXT NOT NULL DEFAULT '';");
        }
        if (!ColumnExists(db, "Sites", "Description"))
        {
            db.Database.ExecuteSqlRaw(
                "ALTER TABLE \"Sites\" ADD COLUMN \"Description\" TEXT NOT NULL DEFAULT '';");
        }

        // Back-fill any missing slugs from Name (idempotent — rows that already
        // have a slug are untouched).
        foreach (var c in db.Categories.Where(c => c.Slug == "").ToList())
        {
            c.Slug = Slug.From(c.Name);
        }
        foreach (var s in db.Sites.Where(s => s.Slug == "").ToList())
        {
            s.Slug = Slug.From(s.Name);
        }
        db.SaveChanges();
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

        var fashion = new Category { Name = "Fashion", Slug = "fashion", Color = "#ec4899", Description = "Discount codes for online fashion retailers — women's and men's clothing, shoes, accessories and beauty brands from the biggest online stores." };
        var tech = new Category { Name = "Technology", Slug = "technology", Color = "#3b82f6", Description = "Voucher codes for consumer technology — laptops, phones, gaming, headphones, wearables and software subscriptions." };
        var food = new Category { Name = "Food & Drink", Slug = "food-drink", Color = "#f97316", Description = "Deals and promo codes for restaurants, food delivery, meal kit services, coffee subscriptions and drinks brands." };
        var travel = new Category { Name = "Travel", Slug = "travel", Color = "#10b981", Description = "Voucher codes for hotels, flights, car hire, holiday parks and travel booking sites — from short weekend breaks to long-haul trips." };
        var home = new Category { Name = "Home & Garden", Slug = "home-garden", Color = "#8b5cf6", Description = "Discount codes for furniture, homeware, kitchen appliances, DIY tools and garden supplies." };

        db.Categories.AddRange(fashion, tech, food, travel, home);
        db.SaveChanges();

        var asos = new Site { Name = "ASOS", Slug = "asos", Url = "https://asos.com", CategoryId = fashion.Id, Description = "ASOS is a UK-based online fashion retailer selling men's and women's clothing, shoes and accessories from over 850 brands, with next-day delivery across the UK." };
        var amazon = new Site { Name = "Amazon", Slug = "amazon", Url = "https://amazon.com", CategoryId = tech.Id, Description = "Amazon is a global online marketplace covering electronics, home essentials, books, groceries and streaming. Prime members get fast delivery and access to Prime Video." };
        var domino = new Site { Name = "Domino's Pizza", Slug = "dominos-pizza", Url = "https://dominos.com", CategoryId = food.Id, Description = "Domino's Pizza offers takeaway and delivery from over 1,300 UK stores. Regular promo codes and \"two for one\" Tuesdays make it a favourite for cheap family pizza nights." };
        var booking = new Site { Name = "Booking.com", Slug = "booking-com", Url = "https://booking.com", CategoryId = travel.Id, Description = "Booking.com lists over 28 million accommodation options worldwide — hotels, apartments and holiday homes — with free cancellation on most bookings and a loyalty programme (Genius) giving members 10-20% off." };
        var ikea = new Site { Name = "IKEA", Slug = "ikea", Url = "https://ikea.com", CategoryId = home.Id, Description = "IKEA is the Swedish flat-pack furniture retailer, well-known for its affordable Scandi-style homeware, kitchens and storage, plus the IKEA Family free membership scheme." };

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

        var fitness = new Category { Name = "Fitness Trackers", Slug = "fitness-trackers", Color = "#14b8a6", Description = "Discount codes, referral bonuses and free-trial offers for wearable fitness devices — WHOOP straps, Garmin watches, Oura rings and the subscriptions that go with them." };
        db.Categories.Add(fitness);
        db.SaveChanges();

        var whoop = new Site { Name = "WHOOP", Slug = "whoop", Url = "https://www.whoop.com", CategoryId = fitness.Id, Description = "WHOOP is a subscription-based fitness and recovery tracker worn 24/7. It measures heart rate variability, sleep, strain and recovery, and pairs with a companion app that suggests daily training targets." };
        var garmin = new Site { Name = "Garmin", Slug = "garmin", Url = "https://www.garmin.com", CategoryId = fitness.Id, Description = "Garmin makes GPS-first smartwatches for running, cycling, swimming and multi-sport athletes, plus outdoor / marine devices — no subscription required." };
        var oura = new Site { Name = "Oura Ring", Slug = "oura-ring", Url = "https://ouraring.com", CategoryId = fitness.Id, Description = "Oura Ring is a titanium smart ring that tracks sleep, activity and readiness. It pairs with a companion app and (optionally) a Premium membership for deeper insights." };
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

        var finance = new Category { Name = "Personal Finance", Slug = "personal-finance", Color = "#0ea5e9", Description = "Sign-up bonuses, cashback offers and referral codes for UK banks, business accounts, credit cards, investing apps and money-saving tools." };
        db.Categories.Add(finance);
        db.SaveChanges();

        var tide = new Site { Name = "Tide", Slug = "tide", Url = "https://tide.co", CategoryId = finance.Id, Description = "Tide is a UK business banking platform built for freelancers, sole traders and small businesses. It offers free company formation, integrated expense management, invoicing, and connections to accounting software like Xero and QuickBooks. Tide accounts are FSCS-protected via ClearBank." };
        var monzo = new Site { Name = "Monzo", Slug = "monzo", Url = "https://monzo.com", CategoryId = finance.Id, Description = "Monzo is a UK digital bank with over 10 million customers, offering current accounts, joint accounts, savings pots and business banking. It's known for instant spending notifications, fee-free spending abroad on the standard account, and its bright coral debit card." };
        var starling = new Site { Name = "Starling Bank", Slug = "starling-bank", Url = "https://starlingbank.com", CategoryId = finance.Id, Description = "Starling Bank is a UK digital bank with personal, joint and business accounts. It's consistently rated top for customer service, has no fees on overseas card spending and cash withdrawals, and offers Kite (a card for kids) and a highly-rated mobile app." };
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
