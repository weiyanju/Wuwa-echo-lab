namespace WuwaAssistant.ViewModels;

public sealed class ConnectionViewModel
{
    public string BackendBaseUrl { get; set; } = "http://127.0.0.1:8000";
    public string StatusText { get; set; } = "未登录";
}
