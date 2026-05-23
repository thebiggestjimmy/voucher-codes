using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VoucherCodes.Api.Data;
using VoucherCodes.Api.Dtos;
using VoucherCodes.Api.Models;

namespace VoucherCodes.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SitesController : ControllerBase
{
    private readonly AppDbContext _db;

    public SitesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SiteDto>>> Get([FromQuery] int? categoryId, [FromQuery] string? search)
    {
        var query = _db.Sites.Include(s => s.Category).AsQueryable();

        if (categoryId.HasValue)
            query = query.Where(s => s.CategoryId == categoryId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(s => s.Name.ToLower().Contains(term) || s.Url.ToLower().Contains(term));
        }

        var sites = await query
            .OrderBy(s => s.Name)
            .Select(s => new SiteDto(
                s.Id, s.Name, s.Url, s.CategoryId,
                s.Category!.Name, s.Category!.Color, s.Vouchers.Count))
            .ToListAsync();

        return Ok(sites);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SiteDto>> GetOne(int id)
    {
        var site = await _db.Sites.Include(s => s.Category)
            .Where(s => s.Id == id)
            .Select(s => new SiteDto(
                s.Id, s.Name, s.Url, s.CategoryId,
                s.Category!.Name, s.Category!.Color, s.Vouchers.Count))
            .FirstOrDefaultAsync();

        return site is null ? NotFound() : Ok(site);
    }

    [HttpPost]
    public async Task<ActionResult<SiteDto>> Create([FromBody] CreateSiteRequest request)
    {
        var name = request.Name.Trim();
        var url = request.Url.Trim();

        var category = await _db.Categories.FindAsync(request.CategoryId);
        if (category is null)
            return BadRequest(new { error = "Category not found." });

        var existing = await _db.Sites.FirstOrDefaultAsync(s => s.Name.ToLower() == name.ToLower());
        if (existing is not null)
            return Conflict(new { error = "A site with that name already exists.", siteId = existing.Id });

        var site = new Site { Name = name, Url = url, CategoryId = request.CategoryId };
        _db.Sites.Add(site);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetOne), new { id = site.Id },
            new SiteDto(site.Id, site.Name, site.Url, category.Id, category.Name, category.Color, 0));
    }
}
