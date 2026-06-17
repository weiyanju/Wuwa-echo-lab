using System.IO;
using System.Net.Http;
using System.Text;
using System.Windows;
using WuwaAssistant.Core;

namespace WuwaAssistant;

public partial class LoginWindow : Window
{
    private readonly string sessionPath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "WuwaAssistant",
        "session.json");

    private readonly ApiSession session;
    private readonly WuwaApiClient client;

    public LoginWindow()
    {
        InitializeComponent();
        session = ApiSession.Load(sessionPath);
        client = CreateClient(session);
    }

    private async void LoginButton_Click(object sender, RoutedEventArgs e)
    {
        await RunLoginActionAsync(async () =>
        {
            var user = await client.LoginAsync(NormalizeInput(UsernameBox.Text), NormalizeInput(PasswordBox.Password));
            session.Save(sessionPath);
            LoginStatusText.Text = "登录成功，正在进入助手...";
            await OpenAssistantAfterAuthAsync(user);
        });
    }

    private async void RegisterButton_Click(object sender, RoutedEventArgs e)
    {
        await RunLoginActionAsync(async () =>
        {
            var user = await client.RegisterAsync(NormalizeInput(UsernameBox.Text), NormalizeInput(PasswordBox.Password));
            session.Save(sessionPath);
            LoginStatusText.Text = "注册成功，正在进入助手...";
            await OpenAssistantAfterAuthAsync(user);
        });
    }

    private async Task OpenAssistantAfterAuthAsync(ApiUser user)
    {
        var account = await ResolveStartupAccountAsync();
        var mainWindow = new MainWindow(client, session, user, account);
        mainWindow.Show();
        Close();
    }

    private async Task<GameAccount> ResolveStartupAccountAsync()
    {
        var accounts = await client.GetGameAccountsAsync();
        if (accounts.Count == 0)
        {
            return await client.CreateGameAccountAsync("", isDefault: true);
        }

        return SelectStartupAccount(accounts);
    }

    private static GameAccount SelectStartupAccount(IReadOnlyList<GameAccount> accounts)
    {
        return accounts.FirstOrDefault(account => account.IsDefault && !account.WorkspaceLocked)
            ?? accounts.FirstOrDefault(account => !account.WorkspaceLocked)
            ?? accounts.FirstOrDefault(account => account.IsDefault)
            ?? accounts[0];
    }

    private async Task RunLoginActionAsync(Func<Task> run)
    {
        SetBusy(true);
        try
        {
            await run();
        }
        catch (Exception ex)
        {
            LoginStatusText.Text = ex.Message;
        }
        finally
        {
            SetBusy(false);
        }
    }

    private void SetBusy(bool busy)
    {
        LoginButton.IsEnabled = !busy;
        RegisterButton.IsEnabled = !busy;
    }

    private static WuwaApiClient CreateClient(ApiSession session)
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
