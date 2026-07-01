using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace VoucherCodes.Api.Data;

public static partial class Slug
{
    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NonAlnumRegex();

    public static string From(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;

        // Fold accents (é → e), then strip anything that isn't lowercase alnum.
        var normalized = input.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalized.Length);
        foreach (var ch in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                sb.Append(ch);
        }
        var stripped = NonAlnumRegex().Replace(sb.ToString(), "-");
        return stripped.Trim('-');
    }
}
