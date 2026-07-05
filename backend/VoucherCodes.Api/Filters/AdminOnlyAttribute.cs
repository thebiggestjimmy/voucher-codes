using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using VoucherCodes.Api.Services;

namespace VoucherCodes.Api.Filters;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class AdminOnlyAttribute : Attribute, IAuthorizationFilter
{
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var svc = context.HttpContext.RequestServices.GetRequiredService<AdminAuthService>();
        var token = AdminAuthService.ExtractToken(context.HttpContext);
        if (!svc.Validate(token))
        {
            context.Result = new UnauthorizedObjectResult(new { error = "Admin authentication required." });
        }
    }
}
