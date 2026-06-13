namespace WuwaAssistant.Core;

public static class SampleSnapshotPayloadFactory
{
    public static object Create(int gameAccountId, int sessionId)
    {
        return new
        {
            game_account_id = gameAccountId,
            session_id = sessionId,
            trigger_type = "sample_payload",
            client_event_id = "sample-echo-001",
            captured_at = DateTimeOffset.Now.ToString("O"),
            hashes = new
            {
                detail = $"sample-detail-hash-{gameAccountId}-{sessionId}",
            },
            detail_snapshot_raw = new
            {
                name_text = "Sample Echo",
                sonata_text = "Sierra Gale",
                cost_text = "4",
                main_stat_text = "crit_rate",
                substats = new[]
                {
                    new
                    {
                        position = 1,
                        label_text = "crit_rate",
                        value_text = "6.3",
                        confidence = 1.0,
                    },
                },
            },
            normalized_snapshot = new
            {
                display_name = "Sample Echo",
                set_name = "Sierra Gale",
                cost = 4,
                main_stat = "crit_rate",
                substats = new[]
                {
                    new
                    {
                        position = 1,
                        substat_type = "crit_rate",
                        tier_value = 6.3,
                    },
                },
            },
            field_confidence = new
            {
                detail_page = 1.0,
            },
        };
    }
}
