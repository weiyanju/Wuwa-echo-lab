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
    ("register stores csrf and session cookies", RegisterStoresCookiesAsync),
    ("game accounts are loaded and locked accounts are detected", GameAccountsLoadAsync),
    ("game account uid can be initialized", GameAccountUidCanBeInitializedAsync),
    ("sample recognition flow creates session, submits snapshot, and reverts", RecognitionFlowAsync),
    ("login window owns auth only and auto opens assistant", LoginWindowOwnsAuthOnlyAndAutoOpensAssistantAsync),
    ("main shell exposes assistant feature tabs only", MainShellExposesAssistantFeatureTabsOnlyAsync),
    ("main shell home owns uid initialization", MainShellHomeOwnsUidInitializationAsync),
    ("assistant shell styles use rounded controls and navigation states", AssistantShellStylesUseRoundedControlsAndNavigationStatesAsync),
    ("phase eight project structure separates pages view models and styles", PhaseEightProjectStructureAsync),
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
    AssertContains("服务拒绝了登录请求", ex.Message, "csrf failure message");
    AssertContains("HTTP 403", ex.Message, "csrf failure status");
}

async Task RegisterStoresCookiesAsync()
{
    var handler = new FakeHttpMessageHandler(async request =>
    {
        if (request.Method == HttpMethod.Get && request.RequestUri?.PathAndQuery == "/api/health/")
        {
            var response = JsonResponse(new { status = "ok" });
            response.Headers.Add("Set-Cookie", "csrftoken=csrf-123; Path=/");
            return response;
        }

        if (request.Method == HttpMethod.Post && request.RequestUri?.PathAndQuery == "/api/auth/register/")
        {
            AssertEqual("csrf-123", request.Headers.GetValues("X-CSRFToken").Single(), "register csrf header");
            using var body = await JsonDocument.ParseAsync(await request.Content!.ReadAsStreamAsync());
            AssertEqual("new-user", body.RootElement.GetProperty("username").GetString(), "register username");
            AssertEqual("pw12345", body.RootElement.GetProperty("password").GetString(), "register password");

            var response = JsonResponse(new
            {
                id = 10,
                username = "new-user",
                default_game_account = new
                {
                    id = 44,
                    uid = "",
                    server = "",
                    nickname = "",
                    is_default = true,
                    workspace_locked = true,
                    next_echo_sequence = 1,
                    created_at = "2026-06-13T00:00:00+08:00",
                    updated_at = "2026-06-13T00:00:00+08:00",
                },
                workspace_locked = true,
            });
            response.Headers.Add("Set-Cookie", "sessionid=session-456; Path=/; HttpOnly");
            return response;
        }

        throw new InvalidOperationException($"Unexpected request {request.Method} {request.RequestUri}");
    });

    var session = new ApiSession();
    var client = new WuwaApiClient(new HttpClient(handler), new AssistantSettings("http://127.0.0.1:8000"), session);

    var user = await client.RegisterAsync("new-user", "pw12345");

    AssertEqual("new-user", user.Username, "registered username");
    AssertEqual("session-456", session.Cookies["sessionid"], "stored session cookie");
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
                    uid = "123456789",
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
    AssertEqual("123456789", accounts[0].Uid, "account uid");
    AssertEqual(false, accounts[0].WorkspaceLocked, "workspace lock");
}

async Task GameAccountUidCanBeInitializedAsync()
{
    var handler = new FakeHttpMessageHandler(async request =>
    {
        AssertEqual(HttpMethod.Patch, request.Method, "uid init method");
        AssertEqual("/api/game-accounts/7/", request.RequestUri?.PathAndQuery, "uid init path");
        using var body = await JsonDocument.ParseAsync(await request.Content!.ReadAsStreamAsync());
        AssertEqual("123456789", body.RootElement.GetProperty("uid").GetString(), "uid init value");
        AssertEqual(true, body.RootElement.GetProperty("is_default").GetBoolean(), "uid init default");

        return JsonResponse(new
        {
            id = 7,
            uid = "123456789",
            server = "",
            nickname = "",
            is_default = true,
            workspace_locked = false,
            next_echo_sequence = 1,
            created_at = "2026-06-13T00:00:00+08:00",
            updated_at = "2026-06-13T00:00:00+08:00",
        });
    });

    var client = NewAuthenticatedClient(handler);
    var account = await client.UpdateGameAccountAsync(7, "123456789", isDefault: true);

    AssertEqual("123456789", account.Uid, "initialized uid");
    AssertEqual(false, account.WorkspaceLocked, "initialized workspace lock");
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

Task LoginWindowOwnsAuthOnlyAndAutoOpensAssistantAsync()
{
    var appXaml = File.ReadAllText(Path.Combine(AppProjectRoot(), "App.xaml"));
    var loginXaml = File.ReadAllText(Path.Combine(AppProjectRoot(), "LoginWindow.xaml"));
    var loginCode = File.ReadAllText(Path.Combine(AppProjectRoot(), "LoginWindow.xaml.cs"));

    foreach (var name in new[]
    {
        "UsernameBox",
        "PasswordBox",
        "LoginButton",
        "RegisterButton",
    })
    {
        AssertContains(name, loginXaml, $"login xaml control {name}");
    }

    AssertContains("StartupUri=\"LoginWindow.xaml\"", appXaml, "app starts with login window");
    AssertDoesNotContain("BackendUrlBox", loginXaml, "backend address hidden from user login UI");
    AssertDoesNotContain("AccountSection", loginXaml, "uid selection removed from login UI");
    AssertDoesNotContain("AccountCombo", loginXaml, "uid combo removed from login UI");
    AssertDoesNotContain("InitialUidBox", loginXaml, "uid input removed from login UI");
    AssertDoesNotContain("EnterAssistantButton", loginXaml, "enter assistant button removed from login UI");
    AssertContains("RegisterAsync", loginCode, "login window supports registration");
    AssertContains("OpenAssistantAfterAuthAsync", loginCode, "login window auto opens assistant after auth");
    AssertContains("ResolveStartupAccountAsync", loginCode, "login window resolves startup game account");
    AssertContains("SelectStartupAccount", loginCode, "login window keeps startup account selection explicit");
    AssertContains("account.IsDefault && !account.WorkspaceLocked", loginCode, "default ready account is preferred");
    AssertContains("account => !account.WorkspaceLocked", loginCode, "first ready account is fallback");
    AssertContains("account => account.IsDefault", loginCode, "locked default account is final fallback");
    AssertContains("后端账号状态异常", loginCode, "empty account list reports backend account state error");
    AssertDoesNotContain("CreateGameAccountAsync(\"\",", loginCode, "login window does not create empty startup accounts");
    AssertDoesNotContain("UpdateGameAccountAsync", loginCode, "login window no longer initializes UID");
    AssertContains("new MainWindow", loginCode, "login window opens assistant shell");
    return Task.CompletedTask;
}

Task MainShellExposesAssistantFeatureTabsOnlyAsync()
{
    var xaml = File.ReadAllText(Path.Combine(AppProjectRoot(), "MainWindow.xaml"));
    var code = File.ReadAllText(Path.Combine(AppProjectRoot(), "MainWindow.xaml.cs"));

    AssertContains("MinWidth=\"820\"", xaml, "compact minimum width");
    AssertContains("MinHeight=\"560\"", xaml, "compact minimum height");
    AssertContains("AssistantNav", xaml, "left navigation container");
    AssertContains("HomeTabButton", xaml, "home tab button");
    AssertContains("RecognitionTabButton", xaml, "recognition tab button");
    AssertContains("CaptureOcrTabButton", xaml, "capture ocr tab button");
    AssertContains("DiagnosticsTabButton", xaml, "diagnostics tab button");
    AssertContains("SettingsTabButton", xaml, "settings tab button");
    AssertContains("HomePagePanel", xaml, "home page panel");
    AssertContains("ShellStatusText", xaml, "always visible shell status");
    AssertContains("RecognitionStateText", xaml, "always visible recognition status");
    AssertContains("CreateSessionButton", xaml, "recognition session button");
    AssertContains("SubmitSampleButton", xaml, "sample snapshot button");
    AssertContains("RevertButton", xaml, "revert button");
    AssertContains("DiagnosticsBox", xaml, "diagnostics box");
    AssertDoesNotContain("ConnectionTabButton", xaml, "connection removed from assistant tabs");
    AssertDoesNotContain("GameAccountTabButton", xaml, "game account removed from assistant tabs");
    AssertDoesNotContain("BackendUrlBox", xaml, "backend address hidden from assistant shell");
    AssertContains("SampleSnapshotPayloadFactory.Create", code, "sample payload button");
    AssertContains("selectedAccount", code, "assistant shell receives selected account");
    AssertContains("LastSnapshotId", code, "last snapshot state");
    return Task.CompletedTask;
}

Task MainShellHomeOwnsUidInitializationAsync()
{
    var xaml = File.ReadAllText(Path.Combine(AppProjectRoot(), "MainWindow.xaml"));
    var code = File.ReadAllText(Path.Combine(AppProjectRoot(), "MainWindow.xaml.cs"));

    AssertContains("SelectPage(\"Home\")", code, "main shell starts on home");
    AssertContains("CurrentUidText", xaml, "home shows selected uid");
    AssertContains("AccountSummaryText", xaml, "home shows account summary");
    AssertContains("RecognitionSummaryText", xaml, "home shows recognition summary");
    AssertContains("UidSetupPanel", xaml, "home owns uid setup panel");
    AssertContains("InitialUidBox", xaml, "home owns uid input");
    AssertContains("BindUidButton", xaml, "home owns uid initialization button");
    AssertContains("BindUidButton_Click", code, "uid initialization click handler");
    AssertContains("InitialUidBox.Text.Trim()", code, "uid input is trimmed without unicode digit normalization");
    AssertDoesNotContain("NormalizeInput(InitialUidBox.Text)", code, "uid input must not normalize unicode digits before validation");
    AssertDoesNotContain("NormalizationForm.FormKC", code, "uid input must not fold fullwidth digits to ascii");
    AssertContains("uid.Length != 9 || !uid.All(static character => character is >= '0' and <= '9')", code, "uid input requires nine ascii digits");
    AssertDoesNotContain("uid.All(char.IsDigit)", code, "uid input must not accept unicode digits");
    AssertContains("游戏 UID 必须由 9 位数字组成。", code, "uid validation error message");
    AssertContains("UpdateGameAccountAsync(selectedAccount.Id, uid, isDefault: true)", code, "uid initialization persists to backend");
    AssertContains("RefreshAccountState", code, "account state refreshes after uid changes");
    AssertContains("UidSetupPanel.Visibility", code, "uid setup visibility follows lock state");
    AssertContains("SetActionButtonsEnabled(IsSelectedAccountReady())", code, "recognition buttons follow selected account readiness");
    return Task.CompletedTask;
}

Task AssistantShellStylesUseRoundedControlsAndNavigationStatesAsync()
{
    var controls = File.ReadAllText(Path.Combine(AppProjectRoot(), "Styles", "Controls.xaml"));
    var layout = File.ReadAllText(Path.Combine(AppProjectRoot(), "Styles", "Layout.xaml"));
    var xaml = File.ReadAllText(Path.Combine(AppProjectRoot(), "MainWindow.xaml"));
    var code = File.ReadAllText(Path.Combine(AppProjectRoot(), "MainWindow.xaml.cs"));

    AssertContains("CornerRadius=\"8\"", controls, "buttons use assistant rounded corners");
    AssertContains("FocusVisualStyle\" Value=\"{x:Null}\"", controls, "default focus rectangles are removed");
    AssertContains("x:Key=\"NavButtonActive\"", controls, "navigation has selected style");
    AssertContains("x:Key=\"CautionButton\"", controls, "revert action has cautious secondary style");
    AssertContains("x:Key=\"StatusChip\"", layout, "status chips are rounded borders");
    AssertContains("Style=\"{StaticResource StatusChip}\"", xaml, "header status uses rounded chip border");
    AssertContains("Style=\"{StaticResource CautionButton}\"", xaml, "revert button uses caution style");
    AssertContains("SetActiveNavButton", code, "nav selection updates active style");
    return Task.CompletedTask;
}

Task PhaseEightProjectStructureAsync()
{
    var appRoot = AppProjectRoot();
    var coreRoot = CoreProjectRoot();

    foreach (var relativePath in new[]
    {
        Path.Combine("Views", "ConnectionPage.xaml"),
        Path.Combine("Views", "GameAccountPage.xaml"),
        Path.Combine("Views", "RecognitionPage.xaml"),
        Path.Combine("Views", "CaptureOcrPage.xaml"),
        Path.Combine("Views", "DiagnosticsPage.xaml"),
        Path.Combine("Views", "SettingsPage.xaml"),
        Path.Combine("ViewModels", "ShellViewModel.cs"),
        Path.Combine("ViewModels", "ConnectionViewModel.cs"),
        Path.Combine("ViewModels", "GameAccountViewModel.cs"),
        Path.Combine("ViewModels", "RecognitionViewModel.cs"),
        Path.Combine("ViewModels", "CaptureOcrViewModel.cs"),
        Path.Combine("ViewModels", "DiagnosticsViewModel.cs"),
        Path.Combine("ViewModels", "SettingsViewModel.cs"),
        Path.Combine("Styles", "Colors.xaml"),
        Path.Combine("Styles", "Controls.xaml"),
        Path.Combine("Styles", "Layout.xaml"),
    })
    {
        AssertFileExists(Path.Combine(appRoot, relativePath), $"app structure {relativePath}");
    }

    foreach (var directory in new[]
    {
        "Auth",
        "Connection",
        "GameAccounts",
        "Recognition",
        "Capture",
        "Ocr",
        "Diagnostics",
        "Settings",
        "Storage",
        "Api",
    })
    {
        AssertDirectoryExists(Path.Combine(coreRoot, directory), $"core module {directory}");
    }

    return Task.CompletedTask;
}

string AppProjectRoot()
{
    return Path.Combine(SolutionRoot(), "WuwaAssistant", "WuwaAssistant");
}

string CoreProjectRoot()
{
    return Path.Combine(SolutionRoot(), "WuwaAssistant", "WuwaAssistant.Core");
}

string SolutionRoot()
{
    var directory = new DirectoryInfo(Environment.CurrentDirectory);
    while (directory is not null)
    {
        if (Directory.Exists(Path.Combine(directory.FullName, "WuwaAssistant", "WuwaAssistant")))
        {
            return directory.FullName;
        }

        directory = directory.Parent;
    }

    throw new InvalidOperationException($"Could not locate solution root from {Environment.CurrentDirectory}.");
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

void AssertFileExists(string path, string label)
{
    if (!File.Exists(path))
    {
        throw new InvalidOperationException($"{label}: expected file {path} to exist");
    }
}

void AssertDirectoryExists(string path, string label)
{
    if (!Directory.Exists(path))
    {
        throw new InvalidOperationException($"{label}: expected directory {path} to exist");
    }
}

sealed class FakeHttpMessageHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> sendAsync) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        return sendAsync(request);
    }
}
