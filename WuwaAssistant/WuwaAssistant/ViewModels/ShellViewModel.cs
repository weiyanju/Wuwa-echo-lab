namespace WuwaAssistant.ViewModels;

public sealed class ShellViewModel
{
    public string CurrentPage { get; private set; } = "Connection";

    public void SelectPage(string page)
    {
        CurrentPage = page;
    }
}
