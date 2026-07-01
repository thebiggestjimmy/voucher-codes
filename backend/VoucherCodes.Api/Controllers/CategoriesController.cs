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

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> Get()
    {
        var categories = await _db.Categories
            .OrderBy(c => c.Name)
            .Select(c => new CategoryDto(c.Id, c.Name, c.Color, c.Sites.Count))
            .ToListAsync();
        return Ok(categories);
    }

    [HttpPost]
    [AdminOnly]
    public async Task<ActionResult<CategoryDto>> Create([FromBody] CreateCategoryRequest request)
    {
        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new { error = "Name is required." });

        var exists = await _db.Categories.AnyAsync(c => c.Name.ToLower() == name.ToLower());
        if (exists)
            return Conflict(new { error = "A category with that name already exists." });

        var category = new Category { Name = name, Color = request.Color };
        _db.Categories.Add(category);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = category.Id },
            new CategoryDto(category.Id, category.Name, category.Color, 0));
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

        category.Name = name;
        category.Color = request.Color;
        await _db.SaveChangesAsync();

        return Ok(new CategoryDto(category.Id, category.Name, category.Color, category.Sites.Count));
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
}
