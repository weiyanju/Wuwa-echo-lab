using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using WuwaAssistant.Core;

if (args.Contains("--live-login", StringComparer.Ordinal))
{
    return await LiveLoginProbeAsync();
}

var tests = new (string Name, Func<Task> Run)[]
{
    ("login stores csrf and session cookies", LoginStoresCookiesAsync),
    ("login reports invalid credentials clearly", LoginReportsInvalidCredentialsAsync),
    ("login reports html csrf failure clearly", LoginReportsHtmlCsrfFailureAsync),
    ("game accounts are loaded and locked accounts are detected", GameAccountsLoadAsync),
    ("sample recognition flow creates session, submits snapshot, and reverts", RecognitionFlowAsync),
    ("wpf shell exposes milestone seven controls", WpfShellExposesMilestoneControlsAsync),
};

var failures = 0;
foreach (var test in tests)
{
    try
    {
        await test.Run();
        Console.WriteLine($"PASS {test.Name}");
    }
    catch (Exception ex)
    {
        failures += 1;
        Console.Error.WriteLine($"FAIL {test.Name}: {ex.Message}");
    }
}

return failures;

async Task LoginStoresCookiesAsync()
{
    var handler = new FakeHttpMessageHandler(async request =>
    {
        if (request.Method == HttpMethod.Get && request.RequestUri?.PathAndQuery == "/api/health/")
        {
            if (request.Headers.TryGetValues("Cookie", out var cookies))
            {
                AssertDoesNotContain("sessionid=stale-session", cookies.Single(), "login refresh should clear stale session cookie");
            }

            var response = JsonResponse(new { status = "ok" });
            response.Headers.Add("Set-Cookie", "csrftoken=csrf-123; Path=/");
            return response;
        }

        if (request.Method == HttpMethod.Post && request.RequestUri?.PathAndQuery == "/api/auth/login/")
        {
            AssertEqual("csrf-123", request.Headers.GetValues("X-CSRFToken").Single(), "login csrf header");
            AssertContains("csrftoken=csrf-123", request.Headers.GetValues("Cookie").Single(), "login cookie header");

            using var body = await JsonDocument.ParseAsync(await request.Content!.ReadAsStreamAsync());
            AssertEqual("tester", body.RootElement.GetProperty("username").GetString(), "login username");
            AssertEqual("pw12345", body.RootElement.GetProperty("password").GetString(), "login password");

            var response = JsonResponse(new { id = 1, username = "tester" });
            response.Headers.Add("Set-Cookie", "sessionid=session-456; Path=/; HttpOnly");
            return response;
        }

        throw new InvalidOperationException($"Unexpected request {request.Method} {request.RequestUri}");
    });

    var session = new ApiSession();
    session.StoreCookie("sessionid=stale-session; Path=/; HttpOnly");
    session.StoreCookie("csrftoken=stale-csrf; Path=/");
    var client = new WuwaApiClient(new HttpClient(handler), new AssistantSettings("http://127.0.0.1:8000"), session);

    var user = await client.LoginAsync("tester", "pw12345");

    AssertEqual("tester", user.Username, "logged in username");
    AssertEqual("csrf-123", session.CsrfToken, "stored csrf token");
    AssertEqual("session-456", session.Cookies["sessionid"], "stored session cookie");
}

async Task<int> LiveLoginProbeAsync()
{
    var session = new ApiSession();
    using var handler = new HttpClientHandler { UseProxy = false };
    using var httpClient = new HttpClient(handler);
    var client = new WuwaApiClient(httpClient, new AssistantSettings("http://127.0.0.1:8000"), session);

    try
    {
        var user = await client.LoginAsync("a", "123");
        var accounts = await client.GetGameAccountsAsync();
        Console.WriteLine($"LIVE_LOGIN_OK user={user.Username} accounts={accounts.Count}");
        foreach (var account in accounts)
        {
            Console.WriteLine($"ACCOUNT id={account.Id} uid={account.Uid} locked={account.WorkspaceLocked}");
        }

        return 0;
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"LIVE_LOGIN_FAIL {ex.GetType().Name}: {ex.Message}");
        if (ex.InnerException is not null)
        {
            Console.Error.WriteLine($"INNER {ex.InnerException.GetType().Name}: {ex.InnerException.Message}");
        }

        return 1;
    }
}

async Task LoginReportsInvalidCredentialsAsync()
{
    var handler = new FakeHttpMessageHandler(request =>
    {
        if (request.Method == HttpMethod.Get && request.RequestUri?.PathAndQuery == "/api/health/")
        {
            var response = JsonResponse(new { status = "ok" });
            response.Headers.Add("Set-Cookie", "csrftoken=csrf-123; Path=/");
            return Task.FromResult(response);
        }

        if (request.Method == HttpMethod.Post && request.RequestUri?.PathAndQuery == "/api/auth/login/")
        {
            return Task.FromResult(JsonResponse(new { error = "用户名或密码错误。" }, HttpStatusCode.BadRequest));
        }

        throw new InvalidOperationException($"Unexpected request {request.Method} {request.RequestUri}");
    });

    var client = new WuwaApiClient(new HttpClient(handler), new AssistantSettings("http://127.0.0.1:8000"), new ApiSession());

    var ex = await AssertThrowsAsync<InvalidOperationException>(() => client.LoginAsync("aaa", "wrong-password"));
    AssertEqual("登录失败：用户名或密码错误。", ex.Message, "invalid credential message");
}

async Task LoginReportsHtmlCsrfFailureAsync()
{
    var handler = new FakeHttpMessageHandler(request =>
    {
        if (request.Method == HttpMethod.Get && request.RequestUri?.PathAndQuery == "/api/health/")
        {
            return Task.FromResult(JsonResponse(new { status = "ok" }));
        }

        if (request.Method == HttpMethod.Post && request.RequestUri?.PathAndQuery == "/api/auth/login/")
        {
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.Forbidden)
            {
                Content = new StringContent("<html><body>CSRF verification failed</body></html>"),
            });
        }

        throw new InvalidOperationException($"Unexpected request {request.Method} {request.RequestUri}");
    });

    var client = new WuwaApiClient(new HttpClient(handler), new AssistantSettings("http://127.0.0.1:8000"), new ApiSession());

    var ex = await AssertThrowsAsync<InvalidOperationException>(() => client.LoginAsync("aaa", "pw12345"));
    AssertContains("后端拒绝了登录请求", ex.Message, "csrf failure message");
    AssertContains("HTTP 403", ex.Message, "csrf failure status");
}

async Task GameAccountsLoadAsync()
{
    var handler = new FakeHttpMessageHandler(request =>
    {
        AssertEqual(HttpMethod.Get, request.Method, "game account method");
        AssertEqual("/api/game-accounts/", request.RequestUri?.PathAndQuery, "game account path");
        return Task.FromResult(JsonResponse(new
        {
            results = new[]
            {
                new
                {
                    id = 7,
                    uid = "123456",
                    server = "",
                    nickname = "",
                    is_default = true,
                    workspace_locked = false,
                    next_echo_sequence = 4,
                    created_at = "2026-06-13T00:00:00+08:00",
                    updated_at = "2026-06-13T00:00:00+08:00",
                },
            },
        }));
    });

    var client = NewAuthenticatedClient(handler);
    var accounts = await client.GetGameAccountsAsync();

    AssertEqual(1, accounts.Count, "account count");
    AssertEqual(7, accounts[0].Id, "account id");
    AssertEqual("123456", accounts[0].Uid, "account uid");
    AssertEqual(false, accounts[0].WorkspaceLocked, "workspace lock");
}

async Task RecognitionFlowAsync()
{
    var seen = new List<string>();
    var handler = new FakeHttpMessageHandler(async request =>
    {
        seen.Add($"{request.Method} {request.RequestUri?.PathAndQuery}");

        if (request.Method == HttpMethod.Post && request.RequestUri?.PathAndQuery == "/api/recognition/sessions/")
        {
            AssertEqual("csrf-token", request.Headers.GetValues("X-CSRFToken").Single(), "session csrf header");
            using var body = await JsonDocument.ParseAsync(await request.Content!.ReadAsStreamAsync());
            AssertEqual(7, body.RootElement.GetProperty("game_account_id").GetInt32(), "session game account");
            AssertEqual("WuwaAssistant", body.RootElement.GetProperty("client_name").GetString(), "session client name");

            return JsonResponse(new
            {
                id = 22,
                game_account_id = 7,
                client_name = "WuwaAssistant",
                client_version = "0.1.0",
                game_window_title = "",
                screen_resolution = "",
                started_at = "2026-06-13T00:00:00+08:00",
                ended_at = (string?)null,
                status = "active",
                snapshot_count = 0,
                saved_roll_count = 0,
                created_echo_count = 0,
                updated_echo_count = 0,
                conflict_count = 0,
                reverted_count = 0,
                last_snapshot_at = (string?)null,
                created_at = "2026-06-13T00:00:00+08:00",
                updated_at = "2026-06-13T00:00:00+08:00",
            });
        }

        if (request.Method == HttpMethod.Post && request.RequestUri?.PathAndQuery == "/api/recognition/snapshots/")
        {
            using var body = await JsonDocument.ParseAsync(await request.Content!.ReadAsStreamAsync());
            AssertEqual(7, body.RootElement.GetProperty("game_account_id").GetInt32(), "snapshot game account");
            AssertEqual(22, body.RootElement.GetProperty("session_id").GetInt32(), "snapshot session");
            AssertEqual("sample_payload", body.RootElement.GetProperty("trigger_type").GetString(), "snapshot trigger");
            AssertEqual("crit_rate", body.RootElement.GetProperty("normalized_snapshot").GetProperty("main_stat").GetString(), "snapshot main stat");

            return JsonResponse(new
            {
                snapshot_id = 55,
                session_id = 22,
                game_account_id = 7,
                status = "saved",
                match_status = "created_echo",
                created_echo_id = 99,
                created_roll_ids = new[] { 101 },
                created_roll_count = 1,
                warnings = Array.Empty<string>(),
                error_code = "",
                applied_at = "2026-06-13T00:00:01+08:00",
                reverted_at = (string?)null,
                created_at = "2026-06-13T00:00:01+08:00",
                client_event_id = "sample-echo-001",
                trigger_type = "sample_payload",
                captured_at = "2026-06-13T00:00:01+08:00",
            });
        }

        if (request.Method == HttpMethod.Post && request.RequestUri?.PathAndQuery == "/api/recognition/snapshots/55/revert/")
        {
            return JsonResponse(new
            {
                snapshot_id = 55,
                session_id = 22,
                game_account_id = 7,
                status = "reverted",
                match_status = "created_echo",
                created_echo_id = (int?)null,
                created_roll_ids = new[] { 101 },
                created_roll_count = 1,
                warnings = Array.Empty<string>(),
                error_code = "",
                applied_at = "2026-06-13T00:00:01+08:00",
                reverted_at = "2026-06-13T00:00:02+08:00",
                created_at = "2026-06-13T00:00:01+08:00",
                client_event_id = "sample-echo-001",
                trigger_type = "sample_payload",
                captured_at = "2026-06-13T00:00:01+08:00",
            });
        }

        throw new InvalidOperationException($"Unexpected request {request.Method} {request.RequestUri}");
    });

    var client = NewAuthenticatedClient(handler);
    var session = await client.CreateRecognitionSessionAsync(7);
    var payload = SampleSnapshotPayloadFactory.Create(7, session.Id);
    var snapshot = await client.SubmitSampleSnapshotAsync(payload);
    var reverted = await client.RevertSnapshotAsync(snapshot.SnapshotId);

    AssertEqual(22, session.Id, "session id");
    AssertEqual(55, snapshot.SnapshotId, "snapshot id");
    AssertEqual("saved", snapshot.Status, "snapshot status");
    AssertEqual("reverted", reverted.Status, "reverted status");
    AssertEqual("POST /api/recognition/sessions/,POST /api/recognition/snapshots/,POST /api/recognition/snapshots/55/revert/", string.Join(",", seen), "recognition request order");
}

Task WpfShellExposesMilestoneControlsAsync()
{
    var xaml = File.ReadAllText(Path.Combine(Environment.CurrentDirectory, "WuwaAssistant", "MainWindow.xaml"));
    var code = File.ReadAllText(Path.Combine(Environment.CurrentDirectory, "WuwaAssistant", "MainWindow.xaml.cs"));

    foreach (var name in new[]
    {
        "BackendUrlBox",
        "UsernameBox",
        "PasswordBox",
        "LoginButton",
        "LoadAccountsButton",
        "AccountCombo",
        "CreateSessionButton",
        "SubmitSampleButton",
        "RevertButton",
        "DiagnosticsBox",
    })
    {
        AssertContains(name, xaml, $"xaml control {name}");
    }

    AssertContains("ApiSession.Load", code, "session persistence load");
    AssertContains("session.Save", code, "session persistence save");
    AssertContains("UseProxy = false", code, "local backend bypasses system proxy");
    AssertContains("NormalizeLoginInput(rawPassword)", code, "login trims accidental password whitespace");
    AssertContains("NormalizationForm.FormKC", code, "login normalizes full-width input");
    AssertContains("password length=", code, "login logs password length for diagnostics");
    AssertContains("new WuwaApiClient", code, "api client creation");
    AssertContains("SampleSnapshotPayloadFactory.Create", code, "sample payload button");
    AssertContains("LastSnapshotId", code, "last snapshot state");
    return Task.CompletedTask;
}

WuwaApiClient NewAuthenticatedClient(HttpMessageHandler handler)
{
    var session = new ApiSession();
    session.StoreCookie("csrftoken=csrf-token; Path=/");
    session.StoreCookie("sessionid=session-token; Path=/; HttpOnly");
    return new WuwaApiClient(new HttpClient(handler), new AssistantSettings("http://127.0.0.1:8000"), session);
}

HttpResponseMessage JsonResponse(object payload, HttpStatusCode statusCode = HttpStatusCode.OK)
{
    return new HttpResponseMessage(statusCode)
    {
        Content = JsonContent.Create(payload),
    };
}

async Task<TException> AssertThrowsAsync<TException>(Func<Task> action)
    where TException : Exception
{
    try
    {
        await action();
    }
    catch (TException ex)
    {
        return ex;
    }

    throw new InvalidOperationException($"Expected exception {typeof(TException).Name}.");
}

void AssertEqual<T>(T expected, T actual, string label)
{
    if (!EqualityComparer<T>.Default.Equals(expected, actual))
    {
        throw new InvalidOperationException($"{label}: expected {expected}, got {actual}");
    }
}

void AssertContains(string expected, string actual, string label)
{
    if (!actual.Contains(expected, StringComparison.Ordinal))
    {
        throw new InvalidOperationException($"{label}: expected to contain {expected}, got {actual}");
    }
}

void AssertDoesNotContain(string expected, string actual, string label)
{
    if (actual.Contains(expected, StringComparison.Ordinal))
    {
        throw new InvalidOperationException($"{label}: expected not to contain {expected}, got {actual}");
    }
}

sealed class FakeHttpMessageHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> sendAsync) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        return sendAsync(request);
    }
}
