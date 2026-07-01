using System.ComponentModel.DataAnnotations;

namespace VoucherCodes.Api.Models;

public class Voucher
{
    public int Id { get; set; }

    [Required]
    [MaxLength(60)]
    public string Code { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    public DateTime? ExpiresOn { get; set; }

    public DateTime SubmittedOn { get; set; } = DateTime.UtcNow;

    [MaxLength(80)]
    public string SubmittedBy { get; set; } = "anonymous";

    public int Upvotes { get; set; }
    public int Downvotes { get; set; }

    /// <summary>Anonymous count of how many times this code has been copied.</summary>
    public int RedeemCount { get; set; }

    /// <summary>Whether the code has been reviewed by an admin. Anonymous submissions default to false.</summary>
    public bool IsApproved { get; set; }

    public int SiteId { get; set; }
    public Site? Site { get; set; }
}
