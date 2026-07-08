using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VoucherCodes.Api.Data;
using VoucherCodes.Api.Dtos;
using VoucherCodes.Api.Filters;
using VoucherCodes.Api.Models;

namespace VoucherCodes.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly AppDbContext _db;

    public CategoriesController(AppDbContext db) => _db = db;

    /// <summary>Counts live codes: approved and not past their expiry date.</summary>
    private Task<int> LiveVoucherCountAsync(int categoryId)
    {
        var today = DateTime.UtcNow.Date;
        return _db.Vouchers.CountAsync(v =>
            v.Site!.CategoryId == categoryId &&
            v.IsApproved &&
            (v.ExpiresOn == null || v.ExpiresOn >= today));
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> Get()
    {
        var today = DateTime.UtcNow.Date;
        var categories = await _db.Categories
            .OrderBy(c => c.Name)
            .Select(c => new CategoryDto(
                c.Id, c.Name, c.Slug, c.Color, c.Description,
                c.Sites.Count,
                c.Sites.SelectMany(s => s.Vouchers)
                    .Count(v => v.IsApproved && (v.ExpiresOn == null || v.ExpiresOn >= today))))
            .ToListAsync();
        return Ok(categories);
    }

    [HttpGet("by-slug/{slug}")]
    public async Task<ActionResult<CategoryDto>> GetBySlug(string slug)
    {
        var today = DateTime.UtcNow.Date;
        var category = await _db.Categories
            .Where(c => c.Slug == slug)
            .Select(c => new CategoryDto(
                c.Id, c.Name, c.Slug, c.Color, c.Description,
                c.Sites.Count,
                c.Sites.SelectMany(s => s.Vouchers)
                    .Count(v => v.IsApproved && (v.ExpiresOn == null || v.ExpiresOn >= today))))
            .FirstOrDefaultAsync();
        return category is null ? NotFound() : Ok(category);
    }

    [HttpPost]
    [AdminOnly]
    public async Task<ActionResult<CategoryDto>> Create([FromBody] CreateCategoryRequest request)
    {
        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new { error = "Name is required." });

        var slug = await UniqueSlugAsync(name);
        var exists = await _db.Categories.AnyAsync(c => c.Name.ToLower() == name.ToLower());
        if (exists)
            return Conflict(new { error = "A category with that name already exists." });

        var category = new Category
        {
            Name = name,
            Slug = slug,
            Color = request.Color,
            Description = request.Description?.Trim() ?? string.Empty,
        };
        _db.Categories.Add(category);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = category.Id },
            new CategoryDto(category.Id, category.Name, category.Slug, category.Color, category.Description, 0, 0));
    }

    [HttpPut("{id}")]
    [AdminOnly]
    public async Task<ActionResult<CategoryDto>> Update(int id, [FromBody] UpdateCategoryRequest request)
    {
        var category = await _db.Categories.Include(c => c.Sites).FirstOrDefaultAsync(c => c.Id == id);
        if (category is null) return NotFound();

        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new { error = "Name is required." });

        var clash = await _db.Categories
            .AnyAsync(c => c.Id != id && c.Name.ToLower() == name.ToLower());
        if (clash)
            return Conflict(new { error = "Another category already has that name." });

        if (!string.Equals(category.Name, name, StringComparison.OrdinalIgnoreCase))
        {
            category.Slug = await UniqueSlugAsync(name, id);
        }
        category.Name = name;
        category.Color = request.Color;
        category.Description = request.Description?.Trim() ?? string.Empty;
        await _db.SaveChangesAsync();

        return Ok(new CategoryDto(
            category.Id, category.Name, category.Slug, category.Color, category.Description,
            category.Sites.Count, await LiveVoucherCountAsync(category.Id)));
    }

    [HttpDelete("{id}")]
    [AdminOnly]
    public async Task<IActionResult> Delete(int id)
    {
        var category = await _db.Categories.Include(c => c.Sites).FirstOrDefaultAsync(c => c.Id == id);
        if (category is null) return NotFound();

        if (category.Sites.Count > 0)
        {
            var names = string.Join(", ", category.Sites.Select(s => s.Name).OrderBy(n => n).Take(3));
            var more = category.Sites.Count > 3 ? $" and {category.Sites.Count - 3} more" : "";
            return Conflict(new
            {
                error = $"\"{category.Name}\" still contains {(category.Sites.Count == 1 ? "the store" : "stores")} {names}{more}. " +
                        "Open the store's page and use Delete store (or Edit store to move it to another category) first.",
            });
        }

        _db.Categories.Remove(category);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<string> UniqueSlugAsync(string name, int? excludeId = null)
    {
        var baseSlug = Slug.From(name);
        if (string.IsNullOrEmpty(baseSlug)) baseSlug = "category";
        var candidate = baseSlug;
        var suffix = 2;
        while (await _db.Categories.AnyAsync(c => c.Slug == candidate && c.Id != (excludeId ?? -1)))
        {
            candidate = $"{baseSlug}-{suffix++}";
        }
        return candidate;
    }
}
