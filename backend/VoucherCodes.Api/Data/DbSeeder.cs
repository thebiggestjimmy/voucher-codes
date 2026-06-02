using VoucherCodes.Api.Models;

namespace VoucherCodes.Api.Data;

public static class DbSeeder
{
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
            new Voucher { Code = "SUMMER20", Description = "20% off summer collection", SiteId = asos.Id, SubmittedBy = "alex", Upvotes = 12 },
            new Voucher { Code = "FREESHIP", Description = "Free shipping on orders over £50", SiteId = asos.Id, SubmittedBy = "sam", Upvotes = 4 },
            new Voucher { Code = "PRIME10", Description = "£10 off your next Prime order", SiteId = amazon.Id, SubmittedBy = "jo", Upvotes = 9, ExpiresOn = DateTime.UtcNow.AddDays(30) },
            new Voucher { Code = "TWOFORONE", Description = "Buy one get one free on large pizzas", SiteId = domino.Id, SubmittedBy = "pat", Upvotes = 21 },
            new Voucher { Code = "STAY15", Description = "15% off stays in Europe", SiteId = booking.Id, SubmittedBy = "ren", Upvotes = 7 },
            new Voucher { Code = "HOME5", Description = "£5 off a £25 spend", SiteId = ikea.Id, SubmittedBy = "kai", Upvotes = 3 }
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
            new Voucher { Code = "WHOOPFREE", Description = "One month free WHOOP membership for new members", SiteId = whoop.Id, SubmittedBy = "ada", Upvotes = 18 },
            new Voucher { Code = "JOIN30", Description = "30-day free trial plus a free band on a 12-month membership", SiteId = whoop.Id, SubmittedBy = "marco", Upvotes = 11, ExpiresOn = DateTime.UtcNow.AddDays(45) },
            new Voucher { Code = "GARMIN10", Description = "10% off your first Garmin wearable", SiteId = garmin.Id, SubmittedBy = "lena", Upvotes = 6 },
            new Voucher { Code = "OURA40", Description = "£40 off the Oura Ring 4", SiteId = oura.Id, SubmittedBy = "sam", Upvotes = 8 }
        );
        db.SaveChanges();
    }
}
