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

    public async Task<IReadOnlyList<GameAccount>> GetGameAccountsAsync(CancellationToken cancellationToken = default)
    {
        var envelope = await SendAsync<ResultsEnvelope<GameAccount>>(
            HttpMethod.Get,
            "game-accounts/",
            body: null,
            cancellationToken);
        return envelope.Results;
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
                $"无法连接后端：请确认后端已启动，并且地址填写正确。当前地址：{settings.BackendBaseUrl}",
                ex);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            throw new InvalidOperationException(
                $"连接后端超时：请确认后端已启动，并且地址填写正确。当前地址：{settings.BackendBaseUrl}",
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
                return "后端拒绝了登录请求 (HTTP 403)。请确认后端地址正确、服务已启动，然后重新点击登录。";
            }
        }

        if (!string.IsNullOrWhiteSpace(apiError))
        {
            return $"后端请求失败 (HTTP {status})：{apiError}";
        }

        return status switch
        {
            401 => "尚未登录或登录已过期，请重新登录后再试。",
            403 => $"后端拒绝了请求 (HTTP 403)：请重新登录，或确认后端地址是否正确。",
            404 => $"接口不存在 (HTTP 404)：请确认后端地址是否填写为服务根地址，例如 http://127.0.0.1:8000。",
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
