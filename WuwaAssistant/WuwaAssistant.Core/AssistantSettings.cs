namespace WuwaAssistant.Core;

public sealed record AssistantSettings(string BackendBaseUrl)
{
    public Uri ApiBaseUri
    {
        get
        {
            var baseUrl = string.IsNullOrWhiteSpace(BackendBaseUrl)
                ? "http://127.0.0.1:8000"
                : BackendBaseUrl.Trim();
            return new Uri(baseUrl.TrimEnd('/') + "/api/");
        }
    }
}
