using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Windows;
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
    private RecognitionSessionResult? currentSession;
    private int? LastSnapshotId;

    public MainWindow()
    {
        InitializeComponent();
        session = ApiSession.Load(sessionPath);
        SetActionButtonsEnabled(false);
        AppendLog("Ready. Set backend URL and log in.");
    }

    private async void LoginButton_Click(object sender, RoutedEventArgs e)
    {
        await RunUiActionAsync("Login", async () =>
        {
            var rawUsername = UsernameBox.Text;
            var rawPassword = PasswordBox.Password;
            var username = NormalizeLoginInput(rawUsername);
            var password = NormalizeLoginInput(rawPassword);
            AppendLog($"Login input: username='{username}', password length={password.Length}, normalized={HasNormalized(rawUsername, username) || HasNormalized(rawPassword, password)}.");
            client = CreateClient();
            var user = await client.LoginAsync(username, password);
            session.Save(sessionPath);
            StatusText.Text = $"Logged in: {user.Username}";
            AppendLog($"Logged in as {user.Username}.");
            await LoadAccountsAsync();
        });
    }

    private async void LoadAccountsButton_Click(object sender, RoutedEventArgs e)
    {
        await RunUiActionAsync("Load accounts", LoadAccountsAsync);
    }

    private async void CreateSessionButton_Click(object sender, RoutedEventArgs e)
    {
        await RunUiActionAsync("Create recognition session", async () =>
        {
            var account = SelectedAccountOrThrow();
            EnsureWorkspaceUnlocked(account);
            currentSession = await RequireClient().CreateRecognitionSessionAsync(account.Account.Id);
            AppendLog($"Created recognition session #{currentSession.Id} for UID {account.Account.Uid}.");
        });
    }

    private async void SubmitSampleButton_Click(object sender, RoutedEventArgs e)
    {
        await RunUiActionAsync("Submit sample snapshot", async () =>
        {
            var account = SelectedAccountOrThrow();
            EnsureWorkspaceUnlocked(account);
            currentSession ??= await RequireClient().CreateRecognitionSessionAsync(account.Account.Id);
            var payload = SampleSnapshotPayloadFactory.Create(account.Account.Id, currentSession.Id);
            var snapshot = await RequireClient().SubmitSampleSnapshotAsync(payload);
            LastSnapshotId = snapshot.SnapshotId;
            LastSnapshotText.Text = $"Last snapshot #{snapshot.SnapshotId}: {snapshot.Status}";
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
            AppendLog($"Reverted snapshot #{snapshot.SnapshotId}. Status: {snapshot.Status}.");
            AppendJson(snapshot);
        });
    }

    private void AccountCombo_SelectionChanged(object sender, System.Windows.Controls.SelectionChangedEventArgs e)
    {
        if (AccountCombo.SelectedItem is not AccountListItem item)
        {
            AccountHintText.Text = "Select a GameAccount.";
            SetActionButtonsEnabled(false);
            return;
        }

        AccountHintText.Text = item.Account.WorkspaceLocked
            ? "This account has no bound UID. Bind UID in the web app first."
            : $"UID {item.Account.Uid} is ready.";
        SetActionButtonsEnabled(!item.Account.WorkspaceLocked);
    }

    private async Task LoadAccountsAsync()
    {
        var accounts = await RequireClient().GetGameAccountsAsync();
        AccountCombo.ItemsSource = accounts.Select(account => new AccountListItem(account)).ToList();
        AccountCombo.SelectedIndex = accounts.Count > 0 ? 0 : -1;
        AppendLog($"Loaded {accounts.Count} GameAccount record(s).");
        if (accounts.Count == 0)
        {
            AccountHintText.Text = "No GameAccount found. Register or log in from the web app first.";
        }
    }

    private WuwaApiClient CreateClient()
    {
        session = ApiSession.Load(sessionPath);
        var handler = new HttpClientHandler
        {
            UseProxy = false,
        };
        return new WuwaApiClient(new HttpClient(handler), new AssistantSettings(BackendUrlBox.Text), session);
    }

    private WuwaApiClient RequireClient()
    {
        client ??= CreateClient();
        return client;
    }

    private AccountListItem SelectedAccountOrThrow()
    {
        return AccountCombo.SelectedItem as AccountListItem
            ?? throw new InvalidOperationException("Load and select a GameAccount first.");
    }

    private static void EnsureWorkspaceUnlocked(AccountListItem item)
    {
        if (item.Account.WorkspaceLocked)
        {
            throw new InvalidOperationException("Selected GameAccount has no bound UID. Bind UID in the web app first.");
        }
    }

    private static string NormalizeLoginInput(string value)
    {
        return value.Normalize(NormalizationForm.FormKC).Trim();
    }

    private static bool HasNormalized(string original, string normalized)
    {
        return !string.Equals(original, normalized, StringComparison.Ordinal);
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
        LoginButton.IsEnabled = !busy;
        LoadAccountsButton.IsEnabled = !busy;
        CreateSessionButton.IsEnabled = !busy && IsSelectedAccountReady();
        SubmitSampleButton.IsEnabled = !busy && IsSelectedAccountReady();
        RevertButton.IsEnabled = !busy && LastSnapshotId is not null;
    }

    private void SetActionButtonsEnabled(bool enabled)
    {
        CreateSessionButton.IsEnabled = enabled;
        SubmitSampleButton.IsEnabled = enabled;
        RevertButton.IsEnabled = enabled && LastSnapshotId is not null;
    }

    private bool IsSelectedAccountReady()
    {
        return AccountCombo.SelectedItem is AccountListItem { Account.WorkspaceLocked: false };
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

    private sealed record AccountListItem(GameAccount Account)
    {
        public string DisplayName => Account.WorkspaceLocked
            ? $"#{Account.Id} - UID not bound"
            : $"#{Account.Id} - UID {Account.Uid}";
    }
}
