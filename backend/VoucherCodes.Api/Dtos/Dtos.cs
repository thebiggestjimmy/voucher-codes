using System.ComponentModel.DataAnnotations;

namespace VoucherCodes.Api.Dtos;

public record CategoryDto(int Id, string Name, string Color, int SiteCount);

public record SiteDto(int Id, string Name, string Url, int CategoryId, string CategoryName, string CategoryColor, int VoucherCount);

public record VoucherDto(
    int Id,
    string Code,
    string Description,
    DateTime? ExpiresOn,
    DateTime SubmittedOn,
    string SubmittedBy,
    int Upvotes,
    int Downvotes,
    int RedeemCount,
    int SiteId,
    string SiteName,
    string SiteUrl,
    int CategoryId,
    string CategoryName,
    string CategoryColor);

public class CreateCategoryRequest
{
    [Required, MaxLength(80)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Color { get; set; } = "#64748b";
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
}

public class CreateVoucherRequest
{
    [Required, MaxLength(60)]
    public string Code { get; set; } = string.Empty;

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
