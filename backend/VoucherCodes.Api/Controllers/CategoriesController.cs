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

    private static CategoryDto ToDto(Category c) =>
        new(c.Id, c.Name, c.Slug, c.Color, c.Description, c.Sites.Count);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> Get()
    {
        var categories = await _db.Categories
            .Include(c => c.Sites)
            .OrderBy(c => c.Name)
            .ToListAsync();
        return Ok(categories.Select(ToDto));
    }

    [HttpGet("by-slug/{slug}")]
    public async Task<ActionResult<CategoryDto>> GetBySlug(string slug)
    {
        var category = await _db.Categories
            .Include(c => c.Sites)
            .FirstOrDefaultAsync(c => c.Slug == slug);
        return category is null ? NotFound() : Ok(ToDto(category));
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

        return CreatedAtAction(nameof(Get), new { id = category.Id }, ToDto(category));
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

        return Ok(ToDto(category));
    }

    [HttpDelete("{id}")]
    [AdminOnly]
    public async Task<IActionResult> Delete(int id)
    {
        var category = await _db.Categories.Include(c => c.Sites).FirstOrDefaultAsync(c => c.Id == id);
        if (category is null) return NotFound();

        if (category.Sites.Count > 0)
            return Conflict(new
            {
                error = $"Cannot delete: {category.Sites.Count} site(s) are in this category. Move or delete them first.",
            });

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
