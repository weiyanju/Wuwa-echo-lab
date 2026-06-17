using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using WuwaAssistant.Core;

namespace WuwaAssistant;

public partial class MainWindow : Window
{
    private readonly string sessionPath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "WuwaAssistant",
        "session.json");

    private ApiSession session;
    private WuwaApiClient? client;
    private ApiUser? user;
    private GameAccount? selectedAccount;
    private RecognitionSessionResult? currentSession;
    private int? LastSnapshotId;

    public MainWindow()
    {
        InitializeComponent();
        session = ApiSession.Load(sessionPath);
        client = CreateDefaultClient(session);
        InitializeShell();
        AppendLog("请先登录系统账号。");
    }

    public MainWindow(WuwaApiClient client, ApiSession session, ApiUser user, GameAccount selectedAccount)
    {
        InitializeComponent();
        this.client = client;
        this.session = session;
        this.user = user;
        this.selectedAccount = selectedAccount;
        InitializeShell();
        AppendLog(selectedAccount.WorkspaceLocked
            ? "已进入助手。当前账号还没有绑定 UID，请在首页初始化。"
            : $"已进入助手。当前 UID：{selectedAccount.Uid}。");
    }

    private void InitializeShell()
    {
        SelectPage("Home");
        RefreshAccountState();
    }

    private async void BindUidButton_Click(object sender, RoutedEventArgs e)
    {
        await RunUiActionAsync("Initialize game UID", async () =>
        {
            if (selectedAccount is null)
            {
                throw new InvalidOperationException("请先登录系统账号。");
            }

            var uid = NormalizeInput(InitialUidBox.Text);
            if (string.IsNullOrWhiteSpace(uid))
            {
                throw new InvalidOperationException("请输入游戏 UID。");
            }

            selectedAccount = await RequireClient().UpdateGameAccountAsync(selectedAccount.Id, uid, isDefault: true);
            InitialUidBox.Text = "";
            RefreshAccountState();
            AppendLog($"UID 已初始化：{selectedAccount.Uid}。");
        });
    }

    private async void CreateSessionButton_Click(object sender, RoutedEventArgs e)
    {
        await RunUiActionAsync("Create recognition session", async () =>
        {
            var account = SelectedAccountOrThrow();
            EnsureWorkspaceUnlocked(account);
            currentSession = await RequireClient().CreateRecognitionSessionAsync(account.Id);
            RecognitionStateText.Text = $"会话 #{currentSession.Id}";
            RecognitionSummaryText.Text = $"会话 #{currentSession.Id}";
            AppendLog($"Created recognition session #{currentSession.Id} for UID {account.Uid}.");
        });
    }

    private async void SubmitSampleButton_Click(object sender, RoutedEventArgs e)
    {
        await RunUiActionAsync("Submit sample snapshot", async () =>
        {
            var account = SelectedAccountOrThrow();
            EnsureWorkspaceUnlocked(account);
            currentSession ??= await RequireClient().CreateRecognitionSessionAsync(account.Id);
            var payload = SampleSnapshotPayloadFactory.Create(account.Id, currentSession.Id);
            var snapshot = await RequireClient().SubmitSampleSnapshotAsync(payload);
            LastSnapshotId = snapshot.SnapshotId;
            LastSnapshotText.Text = $"Last snapshot #{snapshot.SnapshotId}: {snapshot.Status}";
            RecognitionStateText.Text = $"快照 #{snapshot.SnapshotId}: {snapshot.Status}";
            RecognitionSummaryText.Text = $"快照 #{snapshot.SnapshotId}: {snapshot.Status}";
            AppendLog($"Submitted sample snapshot #{snapshot.SnapshotId}. Status: {snapshot.Status}.");
            AppendJson(snapshot);
        });
    }

    private async void RevertButton_Click(object sender, RoutedEventArgs e)
    {
        await RunUiActionAsync("Revert last snapshot", async () =>
        {
            if (LastSnapshotId is null)
            {
                throw new InvalidOperationException("No submitted snapshot to revert.");
            }

            var snapshot = await RequireClient().RevertSnapshotAsync(LastSnapshotId.Value);
            LastSnapshotText.Text = $"Last snapshot #{snapshot.SnapshotId}: {snapshot.Status}";
            RecognitionStateText.Text = $"快照 #{snapshot.SnapshotId}: {snapshot.Status}";
            RecognitionSummaryText.Text = $"快照 #{snapshot.SnapshotId}: {snapshot.Status}";
            AppendLog($"Reverted snapshot #{snapshot.SnapshotId}. Status: {snapshot.Status}.");
            AppendJson(snapshot);
        });
    }

    private void NavButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button { Tag: string page })
        {
            SelectPage(page);
        }
    }

    private void SelectPage(string page)
    {
        HomePagePanel.Visibility = page == "Home" ? Visibility.Visible : Visibility.Collapsed;
        RecognitionPagePanel.Visibility = page == "Recognition" ? Visibility.Visible : Visibility.Collapsed;
        CaptureOcrPagePanel.Visibility = page == "CaptureOcr" ? Visibility.Visible : Visibility.Collapsed;
        DiagnosticsPagePanel.Visibility = page == "Diagnostics" ? Visibility.Visible : Visibility.Collapsed;
        SettingsPagePanel.Visibility = page == "Settings" ? Visibility.Visible : Visibility.Collapsed;
        SetActiveNavButton(page);
    }

    private void SetActiveNavButton(string page)
    {
        foreach (var button in new[] { HomeTabButton, RecognitionTabButton, CaptureOcrTabButton, DiagnosticsTabButton, SettingsTabButton })
        {
            var isActive = button.Tag as string == page;
            button.Style = (Style)FindResource(isActive ? "NavButtonActive" : "NavButton");
        }
    }

    private void RefreshAccountState()
    {
        StatusText.Text = user is null ? "未登录" : $"账号：{user.Username}";
        AccountSummaryText.Text = user?.Username ?? "未登录";

        if (selectedAccount is null)
        {
            ShellStatusText.Text = "UID 未选择";
            CurrentUidText.Text = "未选择";
            RecognitionSummaryText.Text = "等待登录";
            UidSetupPanel.Visibility = Visibility.Collapsed;
        }
        else if (selectedAccount.WorkspaceLocked)
        {
            ShellStatusText.Text = "UID 未绑定";
            CurrentUidText.Text = "未绑定";
            RecognitionSummaryText.Text = "等待绑定 UID";
            UidSetupPanel.Visibility = Visibility.Visible;
        }
        else
        {
            ShellStatusText.Text = $"UID {selectedAccount.Uid}";
            CurrentUidText.Text = selectedAccount.Uid;
            RecognitionSummaryText.Text = "可创建识别会话";
            UidSetupPanel.Visibility = Visibility.Collapsed;
        }

        SetActionButtonsEnabled(IsSelectedAccountReady());
    }

    private WuwaApiClient RequireClient()
    {
        client ??= CreateDefaultClient(session);
        return client;
    }

    private GameAccount SelectedAccountOrThrow()
    {
        return selectedAccount
            ?? throw new InvalidOperationException("请先登录并选择游戏 UID。");
    }

    private static void EnsureWorkspaceUnlocked(GameAccount account)
    {
        if (account.WorkspaceLocked)
        {
            throw new InvalidOperationException("Selected GameAccount has no bound UID.");
        }
    }

    private async Task RunUiActionAsync(string action, Func<Task> run)
    {
        SetBusy(true);
        try
        {
            AppendLog($"> {action}");
            await run();
        }
        catch (Exception ex)
        {
            AppendLog($"ERROR: {ex.Message}");
        }
        finally
        {
            SetBusy(false);
        }
    }

    private void SetBusy(bool busy)
    {
        BindUidButton.IsEnabled = !busy && selectedAccount is { WorkspaceLocked: true };
        CreateSessionButton.IsEnabled = !busy && IsSelectedAccountReady();
        SubmitSampleButton.IsEnabled = !busy && IsSelectedAccountReady();
        RevertButton.IsEnabled = !busy && LastSnapshotId is not null;
    }

    private void SetActionButtonsEnabled(bool enabled)
    {
        BindUidButton.IsEnabled = selectedAccount is { WorkspaceLocked: true };
        CreateSessionButton.IsEnabled = enabled;
        SubmitSampleButton.IsEnabled = enabled;
        RevertButton.IsEnabled = enabled && LastSnapshotId is not null;
    }

    private bool IsSelectedAccountReady()
    {
        return selectedAccount is { WorkspaceLocked: false };
    }

    private void AppendLog(string message)
    {
        DiagnosticsBox.AppendText($"[{DateTime.Now:HH:mm:ss}] {message}{Environment.NewLine}");
        DiagnosticsBox.ScrollToEnd();
    }

    private void AppendJson(object value)
    {
        DiagnosticsBox.AppendText(JsonSerializer.Serialize(value, new JsonSerializerOptions { WriteIndented = true }));
        DiagnosticsBox.AppendText(Environment.NewLine);
        DiagnosticsBox.ScrollToEnd();
    }

    private static WuwaApiClient CreateDefaultClient(ApiSession session)
    {
        var handler = new HttpClientHandler
        {
            UseProxy = false,
        };
        return new WuwaApiClient(new HttpClient(handler), new AssistantSettings("http://127.0.0.1:8000"), session);
    }

    private static string NormalizeInput(string value)
    {
        return value.Normalize(NormalizationForm.FormKC).Trim();
    }
}
