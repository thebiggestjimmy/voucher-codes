using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VoucherCodes.Api.Data;
using VoucherCodes.Api.Dtos;
using VoucherCodes.Api.Models;

namespace VoucherCodes.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VouchersController : ControllerBase
{
    private readonly AppDbContext _db;

    public VouchersController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<VoucherDto>>> Get(
        [FromQuery] int? siteId,
        [FromQuery] int? categoryId,
        [FromQuery] string? search,
        [FromQuery] bool includeExpired = false,
        [FromQuery] string sort = "top")
    {
        var query = _db.Vouchers
            .Include(v => v.Site)!
                .ThenInclude(s => s!.Category)
            .AsQueryable();

        if (siteId.HasValue)
            query = query.Where(v => v.SiteId == siteId.Value);

        if (categoryId.HasValue)
            query = query.Where(v => v.Site!.CategoryId == categoryId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(v =>
                v.Code.ToLower().Contains(term) ||
                v.Description.ToLower().Contains(term) ||
                v.Site!.Name.ToLower().Contains(term));
        }

        if (!includeExpired)
        {
            var today = DateTime.UtcNow.Date;
            query = query.Where(v => v.ExpiresOn == null || v.ExpiresOn >= today);
        }

        query = sort switch
        {
            "new" => query.OrderByDescending(v => v.SubmittedOn),
            "expiring" => query.OrderBy(v => v.ExpiresOn == null).ThenBy(v => v.ExpiresOn),
            _ => query.OrderByDescending(v => v.Upvotes - v.Downvotes).ThenByDescending(v => v.SubmittedOn),
        };

        var results = await query
            .Take(200)
            .Select(v => new VoucherDto(
                v.Id, v.Code, v.Description, v.ExpiresOn, v.SubmittedOn,
                v.SubmittedBy, v.Upvotes, v.Downvotes,
                v.SiteId, v.Site!.Name, v.Site!.Url,
                v.Site!.CategoryId, v.Site!.Category!.Name, v.Site!.Category!.Color))
            .ToListAsync();

        return Ok(results);
    }

    [HttpPost]
    public async Task<ActionResult<VoucherDto>> Create([FromBody] CreateVoucherRequest request)
    {
        var code = request.Code.Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(code))
            return BadRequest(new { error = "Voucher code is required." });

        var site = await _db.Sites.Include(s => s.Category)
            .FirstOrDefaultAsync(s => s.Id == request.SiteId);
        if (site is null)
            return BadRequest(new { error = "Site not found." });

        var dup = await _db.Vouchers
            .AnyAsync(v => v.SiteId == site.Id && v.Code.ToUpper() == code);
        if (dup)
            return Conflict(new { error = "This code already exists for that site." });

        var voucher = new Voucher
        {
            Code = code,
            Description = request.Description?.Trim() ?? string.Empty,
            ExpiresOn = request.ExpiresOn,
            SubmittedBy = string.IsNullOrWhiteSpace(request.SubmittedBy) ? "anonymous" : request.SubmittedBy.Trim(),
            SiteId = site.Id,
            SubmittedOn = DateTime.UtcNow,
        };

        _db.Vouchers.Add(voucher);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = voucher.Id },
            new VoucherDto(
                voucher.Id, voucher.Code, voucher.Description, voucher.ExpiresOn,
                voucher.SubmittedOn, voucher.SubmittedBy, voucher.Upvotes, voucher.Downvotes,
                site.Id, site.Name, site.Url,
                site.CategoryId, site.Category!.Name, site.Category!.Color));
    }

    [HttpPost("{id}/vote")]
    public async Task<ActionResult<VoucherDto>> Vote(int id, [FromBody] VoteRequest request)
    {
        var voucher = await _db.Vouchers.Include(v => v.Site)!
            .ThenInclude(s => s!.Category)
            .FirstOrDefaultAsync(v => v.Id == id);
        if (voucher is null) return NotFound();

        if (request.Direction.Equals("up", StringComparison.OrdinalIgnoreCase))
            voucher.Upvotes++;
        else if (request.Direction.Equals("down", StringComparison.OrdinalIgnoreCase))
            voucher.Downvotes++;
        else
            return BadRequest(new { error = "Direction must be 'up' or 'down'." });

        await _db.SaveChangesAsync();

        return Ok(new VoucherDto(
            voucher.Id, voucher.Code, voucher.Description, voucher.ExpiresOn,
            voucher.SubmittedOn, voucher.SubmittedBy, voucher.Upvotes, voucher.Downvotes,
            voucher.SiteId, voucher.Site!.Name, voucher.Site!.Url,
            voucher.Site!.CategoryId, voucher.Site!.Category!.Name, voucher.Site!.Category!.Color));
    }
}
