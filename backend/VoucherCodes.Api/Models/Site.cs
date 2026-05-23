using System.ComponentModel.DataAnnotations;

namespace VoucherCodes.Api.Models;

public class Site
{
    public int Id { get; set; }

    [Required]
    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(300)]
    public string Url { get; set; } = string.Empty;

    public int CategoryId { get; set; }
    public Category? Category { get; set; }

    public List<Voucher> Vouchers { get; set; } = new();
}
