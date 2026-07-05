using Microsoft.AspNetCore.Mvc;
using VoucherCodes.Api.Filters;
using VoucherCodes.Api.Services;

namespace VoucherCodes.Api.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly AdminAuthService _auth;

    public AdminController(AdminAuthService auth) => _auth = auth;

    public record LoginRequest(string Password);

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        var token = _auth.TryLogin(request?.Password ?? string.Empty);
        if (token is null)
            return Unauthorized(new { error = "Invalid password." });
        return Ok(new { token });
    }

    [HttpGet("me")]
    [AdminOnly]
    public IActionResult Me() => Ok(new { authenticated = true });

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        _auth.Logout(AdminAuthService.ExtractToken(HttpContext));
        return NoContent();
    }
}
