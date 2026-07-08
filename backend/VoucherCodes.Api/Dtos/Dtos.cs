using System.ComponentModel.DataAnnotations;

namespace VoucherCodes.Api.Dtos;

public record CategoryDto(
    int Id, string Name, string Slug, string Color, string Description,
    int SiteCount,
    // Live codes only: approved and not expired. This is what the sidebar badges show.
    int VoucherCount);

public record SiteDto(
    int Id, string Name, string Slug, string Url, string Description,
    int CategoryId, string CategoryName, string CategorySlug, string CategoryColor,
    int VoucherCount);

public record VoucherDto(
    int Id,
    string Code,
    string LinkUrl,
    string Description,
    DateTime? ExpiresOn,
    DateTime SubmittedOn,
    string SubmittedBy,
    int Upvotes,
    int Downvotes,
    int RedeemCount,
    bool IsApproved,
    int SiteId,
    string SiteName,
    string SiteSlug,
    string SiteUrl,
    int CategoryId,
    string CategoryName,
    string CategorySlug,
    string CategoryColor);

public class CreateCategoryRequest
{
    [Required, MaxLength(80)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Color { get; set; } = "#64748b";

    [MaxLength(1000)]
    public string Description { get; set; } = string.Empty;
}

public class CreateSiteRequest
{
    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(300)]
    [Url]
    public string Url { get; set; } = string.Empty;

    [Required]
    public int CategoryId { get; set; }

    [MaxLength(2000)]
    public string Description { get; set; } = string.Empty;
}

public class CreateVoucherRequest
{
    /// <summary>Optional when LinkUrl is provided (link-only deal).</summary>
    [MaxLength(60)]
    public string Code { get; set; } = string.Empty;

    /// <summary>Optional deal link with the discount embedded.</summary>
    [MaxLength(500)]
    public string LinkUrl { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    public DateTime? ExpiresOn { get; set; }

    [MaxLength(80)]
    public string SubmittedBy { get; set; } = "anonymous";

    [Required]
    public int SiteId { get; set; }
}

public class VoteRequest
{
    [Required]
    public string Direction { get; set; } = "up";
}

public class UpdateCategoryRequest
{
    [Required, MaxLength(80)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Color { get; set; } = "#64748b";

    [MaxLength(1000)]
    public string Description { get; set; } = string.Empty;
}

public class UpdateSiteRequest
{
    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(300)]
    [Url]
    public string Url { get; set; } = string.Empty;

    [Required]
    public int CategoryId { get; set; }

    [MaxLength(2000)]
    public string Description { get; set; } = string.Empty;
}

public class UpdateVoucherRequest
{
    /// <summary>Optional when LinkUrl is provided (link-only deal).</summary>
    [MaxLength(60)]
    public string Code { get; set; } = string.Empty;

    /// <summary>Optional deal link with the discount embedded.</summary>
    [MaxLength(500)]
    public string LinkUrl { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    public DateTime? ExpiresOn { get; set; }

    [Required]
    public int SiteId { get; set; }
}
