using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;

namespace VoucherCodes.Api.Services;

public class AdminAuthService
{
    private readonly ConcurrentDictionary<string, DateTime> _tokens = new();
    private readonly byte[] _expectedPasswordBytes;
    private static readonly TimeSpan SessionTtl = TimeSpan.FromHours(12);

    public AdminAuthService(IConfiguration config)
    {
        var configured = Environment.GetEnvironmentVariable("ADMIN_PASSWORD")
                          ?? config["Admin:Password"]
                          ?? "changeme";
        _expectedPasswordBytes = Encoding.UTF8.GetBytes(configured);
    }

    public string? TryLogin(string password)
    {
        var provided = Encoding.UTF8.GetBytes(password ?? string.Empty);
        if (!CryptographicOperations.FixedTimeEquals(provided, _expectedPasswordBytes))
            return null;

        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        _tokens[token] = DateTime.UtcNow.Add(SessionTtl);
        return token;
    }

    public bool Validate(string? token)
    {
        if (string.IsNullOrEmpty(token)) return false;
        if (!_tokens.TryGetValue(token, out var expiry)) return false;
        if (expiry < DateTime.UtcNow)
        {
            _tokens.TryRemove(token, out _);
            return false;
        }
        return true;
    }

    public void Logout(string? token)
    {
        if (string.IsNullOrEmpty(token)) return;
        _tokens.TryRemove(token, out _);
    }

    public static string? ExtractToken(HttpContext ctx)
    {
        var header = ctx.Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrEmpty(header)) return null;
        const string prefix = "Bearer ";
        if (!header.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return null;
        return header[prefix.Length..].Trim();
    }
}
