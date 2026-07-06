using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VoucherCodes.Api.Data;
using VoucherCodes.Api.Dtos;
using VoucherCodes.Api.Filters;
using VoucherCodes.Api.Models;
using VoucherCodes.Api.Services;

namespace VoucherCodes.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VouchersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AdminAuthService _auth;

    public VouchersController(AppDbContext db, AdminAuthService auth)
    {
        _db = db;
        _auth = auth;
    }

    private bool IsAdmin() => _auth.Validate(AdminAuthService.ExtractToken(HttpContext));

    [HttpGet]
    public async Task<ActionResult<IEnumerable<VoucherDto>>> Get(
        [FromQuery] int? siteId,
        [FromQuery] int? categoryId,
        [FromQuery] string? search,
        [FromQuery] bool includeExpired = false,
        [FromQuery] string sort = "top",
        [FromQuery] string status = "approved")
    {
        var query = _db.Vouchers
            .Include(v => v.Site)!
                .ThenInclude(s => s!.Category)
            .AsQueryable();

        var statusLower = status.ToLowerInvariant();
        if ((statusLower == "pending" || statusLower == "all") && !IsAdmin())
            return Unauthorized(new { error = "Admin authentication required to view pending vouchers." });

        query = statusLower switch
        {
            "pending" => query.Where(v => !v.IsApproved),
            "all" => query,
            _ => query.Where(v => v.IsApproved),
        };

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
            "popular" => query.OrderByDescending(v => v.RedeemCount).ThenByDescending(v => v.Upvotes - v.Downvotes),
            _ => query.OrderByDescending(v => v.Upvotes - v.Downvotes).ThenByDescending(v => v.SubmittedOn),
        };

        var rows = await query.Take(200).ToListAsync();
        return Ok(rows.Select(ToDto));
    }

    [HttpGet("pending-count")]
    [AdminOnly]
    public async Task<ActionResult<object>> PendingCount()
    {
        var count = await _db.Vouchers.CountAsync(v => !v.IsApproved);
        return Ok(new { count });
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
            IsApproved = IsAdmin(),
        };

        _db.Vouchers.Add(voucher);
        await _db.SaveChangesAsync();

        voucher.Site = site;
        return CreatedAtAction(nameof(Get), new { id = voucher.Id }, ToDto(voucher));
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

        return Ok(ToDto(voucher));
    }

    /// <summary>
    /// Records an anonymous "code copied" event by bumping the redeem counter.
    /// No identifiers are stored — just the aggregate count.
    /// </summary>
    [HttpPost("{id}/redeem")]
    public async Task<ActionResult<VoucherDto>> Redeem(int id)
    {
        var voucher = await _db.Vouchers.Include(v => v.Site)!
            .ThenInclude(s => s!.Category)
            .FirstOrDefaultAsync(v => v.Id == id);
        if (voucher is null) return NotFound();

        voucher.RedeemCount++;
        await _db.SaveChangesAsync();

        return Ok(ToDto(voucher));
    }

    [HttpPost("{id}/approve")]
    [AdminOnly]
    public async Task<ActionResult<VoucherDto>> Approve(int id)
    {
        var voucher = await _db.Vouchers.Include(v => v.Site)!
            .ThenInclude(s => s!.Category)
            .FirstOrDefaultAsync(v => v.Id == id);
        if (voucher is null) return NotFound();

        voucher.IsApproved = true;
        await _db.SaveChangesAsync();
        return Ok(ToDto(voucher));
    }

    [HttpPut("{id}")]
    [AdminOnly]
    public async Task<ActionResult<VoucherDto>> Update(int id, [FromBody] UpdateVoucherRequest request)
    {
        var voucher = await _db.Vouchers.Include(v => v.Site)!
            .ThenInclude(s => s!.Category)
            .FirstOrDefaultAsync(v => v.Id == id);
        if (voucher is null) return NotFound();

        var code = request.Code.Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(code))
            return BadRequest(new { error = "Voucher code is required." });

        // If the site is changing, load it (and its category) so the DTO is complete.
        Site? newSite = null;
        if (request.SiteId != voucher.SiteId)
        {
            newSite = await _db.Sites.Include(s => s.Category)
                .FirstOrDefaultAsync(s => s.Id == request.SiteId);
            if (newSite is null)
                return BadRequest(new { error = "Site not found." });
        }

        var dup = await _db.Vouchers.AnyAsync(v =>
            v.Id != id &&
            v.SiteId == request.SiteId &&
            v.Code.ToUpper() == code);
        if (dup)
            return Conflict(new { error = "Another voucher with that code already exists for that site." });

        voucher.Code = code;
        voucher.Description = request.Description?.Trim() ?? string.Empty;
        voucher.ExpiresOn = request.ExpiresOn;
        if (newSite is not null)
        {
            voucher.SiteId = newSite.Id;
            voucher.Site = newSite;
        }

        await _db.SaveChangesAsync();
        return Ok(ToDto(voucher));
    }

    [HttpDelete("{id}")]
    [AdminOnly]
    public async Task<IActionResult> Delete(int id)
    {
        var voucher = await _db.Vouchers.FindAsync(id);
        if (voucher is null) return NotFound();
        _db.Vouchers.Remove(voucher);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static VoucherDto ToDto(Voucher v) => new(
        v.Id, v.Code, v.Description, v.ExpiresOn, v.SubmittedOn,
        v.SubmittedBy, v.Upvotes, v.Downvotes, v.RedeemCount, v.IsApproved,
        v.SiteId, v.Site!.Name, v.Site!.Slug, v.Site!.Url,
        v.Site!.CategoryId, v.Site!.Category!.Name, v.Site!.Category!.Slug, v.Site!.Category!.Color);
}
