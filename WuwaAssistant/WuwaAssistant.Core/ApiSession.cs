using System.Net.Http.Headers;
using System.Text.Json;

namespace WuwaAssistant.Core;

public sealed class ApiSession
{
    public Dictionary<string, string> Cookies { get; } = new(StringComparer.Ordinal);

    public string? CsrfToken => Cookies.TryGetValue("csrftoken", out var value) ? value : null;

    public void Clear()
    {
        Cookies.Clear();
    }

    public void StoreFromResponse(HttpResponseMessage response)
    {
        if (!response.Headers.TryGetValues("Set-Cookie", out var values))
        {
            return;
        }

        foreach (var value in values)
        {
            StoreCookie(value);
        }
    }

    public void StoreCookie(string setCookieHeader)
    {
        var firstPart = setCookieHeader.Split(';', 2)[0];
        var separator = firstPart.IndexOf('=', StringComparison.Ordinal);
        if (separator <= 0)
        {
            return;
        }

        var name = firstPart[..separator].Trim();
        var value = firstPart[(separator + 1)..].Trim();
        if (!string.IsNullOrWhiteSpace(name))
        {
            Cookies[name] = value;
        }
    }

    public void ApplyTo(HttpRequestMessage request)
    {
        if (Cookies.Count > 0)
        {
            request.Headers.Remove("Cookie");
            request.Headers.Add("Cookie", string.Join("; ", Cookies.Select(pair => $"{pair.Key}={pair.Value}")));
        }

        if (!IsSafeMethod(request.Method) && !string.IsNullOrWhiteSpace(CsrfToken))
        {
            request.Headers.Remove("X-CSRFToken");
            request.Headers.Add("X-CSRFToken", CsrfToken);
        }
    }

    public void Save(string path)
    {
        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        File.WriteAllText(path, JsonSerializer.Serialize(Cookies));
    }

    public static ApiSession Load(string path)
    {
        var session = new ApiSession();
        if (!File.Exists(path))
        {
            return session;
        }

        var values = JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(path)) ?? [];
        foreach (var pair in values)
        {
            session.Cookies[pair.Key] = pair.Value;
        }

        return session;
    }

    private static bool IsSafeMethod(HttpMethod method)
    {
        return method == HttpMethod.Get || method == HttpMethod.Head || method == HttpMethod.Options || method == HttpMethod.Trace;
    }
}
