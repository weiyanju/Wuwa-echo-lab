namespace WuwaAssistant.Core;

public sealed record ApiUser(int Id, string Username);

public sealed record GameAccount(
    int Id,
    string Uid,
    string Server,
    string Nickname,
    bool IsDefault,
    bool WorkspaceLocked,
    int NextEchoSequence,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record RecognitionSessionResult(
    int Id,
    int GameAccountId,
    string ClientName,
    string ClientVersion,
    string GameWindowTitle,
    string ScreenResolution,
    DateTimeOffset StartedAt,
    DateTimeOffset? EndedAt,
    string Status,
    int SnapshotCount,
    int SavedRollCount,
    int CreatedEchoCount,
    int UpdatedEchoCount,
    int ConflictCount,
    int RevertedCount,
    DateTimeOffset? LastSnapshotAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record RecognitionSnapshotResult(
    int SnapshotId,
    int SessionId,
    int GameAccountId,
    string Status,
    string MatchStatus,
    int? CreatedEchoId,
    int[] CreatedRollIds,
    int CreatedRollCount,
    string[] Warnings,
    string ErrorCode,
    DateTimeOffset? AppliedAt,
    DateTimeOffset? RevertedAt,
    DateTimeOffset CreatedAt,
    string ClientEventId,
    string TriggerType,
    DateTimeOffset CapturedAt);

public sealed record ResultsEnvelope<T>(List<T> Results);
