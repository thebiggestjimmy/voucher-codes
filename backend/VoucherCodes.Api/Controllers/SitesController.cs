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

    private static SiteDto ToDto(Site s) => new(
        s.Id, s.Name, s.Slug, s.Url, s.Description,
        s.CategoryId, s.Category!.Name, s.Category!.Slug, s.Category!.Color,
        s.Vouchers.Count(v => v.IsApproved));

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SiteDto>>> Get([FromQuery] int? categoryId, [FromQuery] string? search)
    {
        var query = _db.Sites.Include(s => s.Category).Include(s => s.Vouchers).AsQueryable();

        if (categoryId.HasValue)
            query = query.Where(s => s.CategoryId == categoryId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(s => s.Name.ToLower().Contains(term) || s.Url.ToLower().Contains(term));
        }

        var sites = await query.OrderBy(s => s.Name).ToListAsync();
        return Ok(sites.Select(ToDto));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SiteDto>> GetOne(int id)
    {
        var site = await _db.Sites.Include(s => s.Category).Include(s => s.Vouchers)
            .FirstOrDefaultAsync(s => s.Id == id);
        return site is null ? NotFound() : Ok(ToDto(site));
    }

    [HttpGet("by-slug/{slug}")]
    public async Task<ActionResult<SiteDto>> GetBySlug(string slug)
    {
        var site = await _db.Sites.Include(s => s.Category).Include(s => s.Vouchers)
            .FirstOrDefaultAsync(s => s.Slug == slug);
        return site is null ? NotFound() : Ok(ToDto(site));
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

        var site = new Site
        {
            Name = name,
            Slug = await UniqueSlugAsync(name),
            Url = url,
            Description = request.Description?.Trim() ?? string.Empty,
            CategoryId = request.CategoryId,
            Category = category,
        };
        _db.Sites.Add(site);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetOne), new { id = site.Id }, ToDto(site));
    }

    private async Task<string> UniqueSlugAsync(string name)
    {
        var baseSlug = Slug.From(name);
        if (string.IsNullOrEmpty(baseSlug)) baseSlug = "site";
        var candidate = baseSlug;
        var suffix = 2;
        while (await _db.Sites.AnyAsync(s => s.Slug == candidate))
        {
            candidate = $"{baseSlug}-{suffix++}";
        }
        return candidate;
    }
}
