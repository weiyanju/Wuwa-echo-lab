using System.Text.Json;
using System.Text;

namespace WuwaAssistant.Core;

public sealed class WuwaApiClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient httpClient;
    private readonly AssistantSettings settings;
    private readonly ApiSession session;

    public WuwaApiClient(HttpClient httpClient, AssistantSettings settings, ApiSession session)
    {
        this.httpClient = httpClient;
        this.settings = settings;
        this.session = session;
    }

    public async Task<ApiUser> LoginAsync(string username, string password, CancellationToken cancellationToken = default)
    {
        session.Clear();
        await EnsureCsrfCookieAsync(cancellationToken);
        return await SendAsync<ApiUser>(
            HttpMethod.Post,
            "auth/login/",
            new { username, password },
            cancellationToken);
    }

    public async Task<ApiUser> RegisterAsync(string username, string password, CancellationToken cancellationToken = default)
    {
        session.Clear();
        await EnsureCsrfCookieAsync(cancellationToken);
        return await SendAsync<ApiUser>(
            HttpMethod.Post,
            "auth/register/",
            new { username, password },
            cancellationToken);
    }

    public async Task<IReadOnlyList<GameAccount>> GetGameAccountsAsync(CancellationToken cancellationToken = default)
    {
        var envelope = await SendAsync<ResultsEnvelope<GameAccount>>(
            HttpMethod.Get,
            "game-accounts/",
            body: null,
            cancellationToken);
        return envelope.Results;
    }

    public Task<GameAccount> CreateGameAccountAsync(string uid, string server = "", string nickname = "", bool isDefault = false, CancellationToken cancellationToken = default)
    {
        return SendAsync<GameAccount>(
            HttpMethod.Post,
            "game-accounts/",
            new
            {
                uid,
                server,
                nickname,
                is_default = isDefault,
            },
            cancellationToken);
    }

    public Task<GameAccount> UpdateGameAccountAsync(int accountId, string uid, string server = "", string nickname = "", bool isDefault = true, CancellationToken cancellationToken = default)
    {
        return SendAsync<GameAccount>(
            HttpMethod.Patch,
            $"game-accounts/{accountId}/",
            new
            {
                uid,
                server,
                nickname,
                is_default = isDefault,
            },
            cancellationToken);
    }

    public Task<RecognitionSessionResult> CreateRecognitionSessionAsync(int gameAccountId, CancellationToken cancellationToken = default)
    {
        return SendAsync<RecognitionSessionResult>(
            HttpMethod.Post,
            "recognition/sessions/",
            new
            {
                game_account_id = gameAccountId,
                client_name = "WuwaAssistant",
                client_version = "0.1.0",
                game_window_title = "",
                screen_resolution = "",
            },
            cancellationToken);
    }

    public Task<RecognitionSnapshotResult> SubmitSampleSnapshotAsync(object payload, CancellationToken cancellationToken = default)
    {
        return SendAsync<RecognitionSnapshotResult>(
            HttpMethod.Post,
            "recognition/snapshots/",
            payload,
            cancellationToken);
    }

    public Task<RecognitionSnapshotResult> RevertSnapshotAsync(int snapshotId, CancellationToken cancellationToken = default)
    {
        return SendAsync<RecognitionSnapshotResult>(
            HttpMethod.Post,
            $"recognition/snapshots/{snapshotId}/revert/",
            body: null,
            cancellationToken);
    }

    private async Task EnsureCsrfCookieAsync(CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(session.CsrfToken))
        {
            return;
        }

        using var request = CreateRequest(HttpMethod.Get, "health/");
        using var response = await SendRequestAsync(request, cancellationToken);
        session.StoreFromResponse(response);
        await EnsureSuccessAsync(response, "health/", cancellationToken);
    }

    private async Task<T> SendAsync<T>(HttpMethod method, string path, object? body, CancellationToken cancellationToken)
    {
        using var request = CreateRequest(method, path);
        if (body is not null)
        {
            var json = JsonSerializer.Serialize(body, body.GetType(), JsonOptions);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        }

        using var response = await SendRequestAsync(request, cancellationToken);
        session.StoreFromResponse(response);
        await EnsureSuccessAsync(response, path, cancellationToken);

        T? result;
        try
        {
            result = await System.Net.Http.Json.HttpContentJsonExtensions.ReadFromJsonAsync<T>(
                response.Content,
                JsonOptions,
                cancellationToken);
        }
        catch (JsonException ex)
        {
            throw new InvalidOperationException($"后端响应格式异常：接口 {NormalizePath(path)} 返回的内容不是有效 JSON。", ex);
        }

        return result ?? throw new InvalidOperationException("Backend returned an empty response.");
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string path)
    {
        var request = new HttpRequestMessage(method, new Uri(settings.ApiBaseUri, path));
        session.ApplyTo(request);
        return request;
    }

    private async Task<HttpResponseMessage> SendRequestAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        try
        {
            return await httpClient.SendAsync(request, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            throw new InvalidOperationException(
                "无法连接服务：请确认本地服务已启动，然后重试。",
                ex);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            throw new InvalidOperationException(
                "连接服务超时：请确认本地服务正在运行，然后重试。",
                ex);
        }
    }

    private static async Task EnsureSuccessAsync(HttpResponseMessage response, string path, CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        var error = TryReadApiError(body);
        var status = (int)response.StatusCode;
        throw new InvalidOperationException(BuildFriendlyError(path, status, error, body));
    }

    private static string BuildFriendlyError(string path, int status, string? apiError, string body)
    {
        if (IsLoginPath(path))
        {
            if (status == 400)
            {
                return string.IsNullOrWhiteSpace(apiError)
                    ? "登录失败：用户名或密码错误。"
                    : $"登录失败：{apiError}";
            }

            if (status == 403)
            {
                return "服务拒绝了登录请求 (HTTP 403)。请重新打开助手后再试。";
            }
        }

        if (!string.IsNullOrWhiteSpace(apiError))
        {
            return $"后端请求失败 (HTTP {status})：{apiError}";
        }

        return status switch
        {
            401 => "尚未登录或登录已过期，请重新登录后再试。",
            403 => "服务拒绝了请求 (HTTP 403)：请重新登录后再试。",
            404 => "服务接口不可用 (HTTP 404)：请确认本地服务版本正确。",
            >= 500 => $"后端内部错误 (HTTP {status})：请查看 Django 后端控制台日志。",
            _ => string.IsNullOrWhiteSpace(body)
                ? $"后端请求失败 (HTTP {status})：响应内容为空。"
                : $"后端请求失败 (HTTP {status})：返回内容不是 JSON，可能是后端错误页。",
        };
    }

    private static string? TryReadApiError(string body)
    {
        if (string.IsNullOrWhiteSpace(body))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(body);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            if (document.RootElement.TryGetProperty("error", out var error) && error.ValueKind == JsonValueKind.String)
            {
                return error.GetString();
            }

            if (document.RootElement.TryGetProperty("detail", out var detail) && detail.ValueKind == JsonValueKind.String)
            {
                return detail.GetString();
            }
        }
        catch (JsonException)
        {
            return null;
        }

        return null;
    }

    private static bool IsLoginPath(string path)
    {
        return NormalizePath(path).Equals("auth/login/", StringComparison.OrdinalIgnoreCase);
    }

    private static string NormalizePath(string path)
    {
        return path.TrimStart('/');
    }
}
