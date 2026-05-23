using System.ComponentModel.DataAnnotations;

namespace VoucherCodes.Api.Models;

public class Category
{
    public int Id { get; set; }

    [Required]
    [MaxLength(80)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Color { get; set; } = "#64748b";

    public List<Site> Sites { get; set; } = new();
}
