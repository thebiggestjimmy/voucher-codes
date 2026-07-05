using Microsoft.EntityFrameworkCore;
using VoucherCodes.Api.Models;

namespace VoucherCodes.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Site> Sites => Set<Site>();
    public DbSet<Voucher> Vouchers => Set<Voucher>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Site>()
            .HasOne(s => s.Category)
            .WithMany(c => c.Sites)
            .HasForeignKey(s => s.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Voucher>()
            .HasOne(v => v.Site)
            .WithMany(s => s.Vouchers)
            .HasForeignKey(v => v.SiteId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Category>().HasIndex(c => c.Name).IsUnique();
        modelBuilder.Entity<Category>().HasIndex(c => c.Slug).IsUnique();
        modelBuilder.Entity<Site>().HasIndex(s => s.Name);
        modelBuilder.Entity<Site>().HasIndex(s => s.Slug).IsUnique();
    }
}
