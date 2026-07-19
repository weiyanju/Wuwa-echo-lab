namespace WuwaAssistant.ViewModels;

public sealed class RecognitionViewModel
{
    public string RunState { get; set; } = "Stopped";
    public int? LastSnapshotId { get; set; }
}
