from django.db import transaction
from django.utils import timezone

from accounts.models import GameAccount
from echoes.constants import MAIN_STATS_BY_COST, SUBSTAT_TYPES, TIER_TABLES
from echoes.models import EchoRecord, SubstatRoll

from .models import RecognitionSession, RecognitionSnapshot
from .service_support import (
    RecognitionPayloadError,
    SnapshotSubmissionResult,
    SnapshotValidationResult,
    captured_at,
    game_account_for_user,
    normalized_string,
    payload_dict,
    payload_string,
    session_for_user,
)


def list_snapshots(user, game_account_id, statuses=None, limit=20):
    account = game_account_for_user(user, game_account_id)
    queryset = RecognitionSnapshot.objects.filter(game_account=account, user=user).select_related("session")
    if statuses:
        allowed_statuses = set(RecognitionSnapshot.Status.values)
        normalized_statuses = [status for status in statuses if status in allowed_statuses]
        if normalized_statuses:
            queryset = queryset.filter(status__in=normalized_statuses)
    return list(queryset[:limit])


def validate_normalized_snapshot(normalized):
    if not isinstance(normalized, dict):
        return SnapshotValidationResult(False, "invalid_normalized_snapshot", ("invalid_normalized_snapshot",))

    cost = normalized.get("cost")
    if cost not in MAIN_STATS_BY_COST:
        return SnapshotValidationResult(False, "invalid_cost", ("invalid_cost",))

    main_stat = normalized.get("main_stat")
    if main_stat not in MAIN_STATS_BY_COST[cost]:
        return SnapshotValidationResult(False, "invalid_main_stat", ("invalid_main_stat",))

    substats = normalized.get("substats")
    if not isinstance(substats, list) or not substats:
        return SnapshotValidationResult(False, "missing_substats", ("missing_substats",))
    if len(substats) > 5:
        return SnapshotValidationResult(False, "too_many_substats", ("too_many_substats",))

    seen_positions = set()
    seen_types = set()
    for item in substats:
        if not isinstance(item, dict):
            return SnapshotValidationResult(False, "invalid_substat", ("invalid_substat",))
        position = item.get("position")
        if not isinstance(position, int) or position < 1 or position > 5 or position in seen_positions:
            return SnapshotValidationResult(False, "invalid_substat_position", ("invalid_substat_position",))
        seen_positions.add(position)

        substat_type = item.get("substat_type")
        if substat_type not in SUBSTAT_TYPES or substat_type in seen_types:
            return SnapshotValidationResult(False, "invalid_substat_type", ("invalid_substat_type",))
        seen_types.add(substat_type)

        legal_values = {row["value"] for row in TIER_TABLES[substat_type]}
        if item.get("tier_value") not in legal_values:
            return SnapshotValidationResult(False, "invalid_substat_tier", ("invalid_substat_tier",))

    return SnapshotValidationResult(True)


def submit_snapshot(user, payload):
    account = game_account_for_user(user, payload.get("game_account_id"))
    session = session_for_user(user, payload.get("session_id"))
    if session.game_account_id != account.id:
        raise RecognitionPayloadError("session_id does not belong to game_account_id.")

    hashes = payload_dict(payload, "hashes")
    normalized = payload_dict(payload, "normalized_snapshot")
    client_event_id = payload_string(payload, "client_event_id", max_length=120)
    detail_hash = payload_string(hashes, "detail", max_length=128)
    validation_result = validate_normalized_snapshot(normalized)

    with transaction.atomic():
        account = GameAccount.objects.select_for_update().get(pk=account.pk)
        session = RecognitionSession.objects.select_for_update().get(pk=session.pk)

        if client_event_id:
            existing_snapshot = RecognitionSnapshot.objects.filter(
                session=session,
                client_event_id=client_event_id,
            ).first()
            if existing_snapshot is not None:
                return SnapshotSubmissionResult(snapshot=existing_snapshot, created=False)

        if detail_hash:
            duplicate_snapshot = RecognitionSnapshot.objects.filter(
                game_account=account,
                detail_screenshot_hash=detail_hash,
            ).first()
            if duplicate_snapshot is not None:
                snapshot = _create_snapshot(
                    user=user,
                    account=account,
                    session=session,
                    payload=payload,
                    status=RecognitionSnapshot.Status.IGNORED_DUPLICATE,
                    match_status=RecognitionSnapshot.MatchStatus.CONFLICT,
                    warnings=["duplicate_detail_screenshot_hash"],
                    error_code="duplicate_detail_screenshot_hash",
                    hashes={**hashes, "detail": ""},
                    normalized=normalized,
                )
                _increment_session(session, snapshot, roll_count=0, created_echo_count=0)
                return SnapshotSubmissionResult(snapshot=snapshot, created=True)

        if not validation_result.is_valid:
            snapshot = _create_snapshot(
                user=user,
                account=account,
                session=session,
                payload=payload,
                status=RecognitionSnapshot.Status.CONFLICT,
                match_status=RecognitionSnapshot.MatchStatus.CONFLICT,
                warnings=list(validation_result.warnings),
                error_code=validation_result.error_code,
                hashes=hashes,
                normalized=normalized,
            )
            _increment_session(session, snapshot, roll_count=0, created_echo_count=0)
            return SnapshotSubmissionResult(snapshot=snapshot, created=True)

        snapshot = _create_snapshot(
            user=user,
            account=account,
            session=session,
            payload=payload,
            status=RecognitionSnapshot.Status.SAVED,
            match_status=RecognitionSnapshot.MatchStatus.CREATED,
            hashes=hashes,
            normalized=normalized,
        )
        echo = EchoRecord.objects.create(
            user=user,
            game_account=account,
            display_name=normalized_string(normalized, "display_name", default="Recognized Echo"),
            echo_asset_id=normalized_string(normalized, "echo_asset_id", default=""),
            echo_name=normalized_string(normalized, "display_name", default="Recognized Echo"),
            echo_image=normalized_string(normalized, "echo_image", default=""),
            cost=normalized["cost"],
            set_name=normalized_string(normalized, "set_name", default=""),
            main_stat=normalized["main_stat"],
            source_type=EchoRecord.SourceType.ASSISTANT,
            source="recognition",
            auto_imported=True,
        )
        roll_ids = []
        for item in sorted(normalized["substats"], key=lambda row: row["position"]):
            roll = SubstatRoll.objects.create(
                echo=echo,
                recognition_snapshot=snapshot,
                position=item["position"],
                substat_type=item["substat_type"],
                tier_value=item["tier_value"],
                tuned_at=snapshot.captured_at,
                source_type=SubstatRoll.SourceType.ASSISTANT,
            )
            roll_ids.append(roll.id)

        snapshot.created_echo = echo
        snapshot.created_roll_ids = roll_ids
        snapshot.created_roll_count = len(roll_ids)
        snapshot.applied_at = timezone.now()
        snapshot.save(
            update_fields=[
                "created_echo",
                "created_roll_ids",
                "created_roll_count",
                "applied_at",
            ]
        )
        _increment_session(session, snapshot, roll_count=len(roll_ids), created_echo_count=1)
        return SnapshotSubmissionResult(snapshot=snapshot, created=True)


def revert_snapshot(user, snapshot_id):
    with transaction.atomic():
        snapshot = (
            RecognitionSnapshot.objects.select_for_update()
            .select_related("session")
            .get(id=snapshot_id, user=user)
        )
        if snapshot.status == RecognitionSnapshot.Status.REVERTED:
            return snapshot
        if snapshot.status != RecognitionSnapshot.Status.SAVED:
            raise RecognitionPayloadError("Only saved recognition snapshots can be reverted.")

        roll_ids = [roll_id for roll_id in snapshot.created_roll_ids if isinstance(roll_id, int)]
        if not roll_ids and snapshot.created_roll_count:
            raise RecognitionPayloadError("Snapshot created roll ids are missing.")

        rolls = list(
            SubstatRoll.objects.select_related("echo").filter(
                id__in=roll_ids,
                recognition_snapshot=snapshot,
            )
        )
        affected_echo_ids = {roll.echo_id for roll in rolls}
        removed_roll_count = len(rolls)
        SubstatRoll.objects.filter(id__in=roll_ids, recognition_snapshot=snapshot).delete()

        deleted_created_echo_count = _delete_empty_created_echo(snapshot)
        _recalculate_affected_echoes(affected_echo_ids)

        snapshot.status = RecognitionSnapshot.Status.REVERTED
        snapshot.reverted_at = timezone.now()
        snapshot.save(update_fields=["status", "reverted_at", "created_echo"])
        _decrement_session_after_revert(
            snapshot.session,
            removed_roll_count=removed_roll_count,
            deleted_created_echo_count=deleted_created_echo_count,
        )
        snapshot.refresh_from_db()
        return snapshot


def _create_snapshot(
    *,
    user,
    account,
    session,
    payload,
    status,
    match_status,
    hashes,
    normalized,
    warnings=None,
    error_code="",
):
    trigger_type = payload_string(
        payload,
        "trigger_type",
        default=RecognitionSnapshot.TriggerType.SAMPLE_PAYLOAD,
        max_length=24,
    )
    if trigger_type not in RecognitionSnapshot.TriggerType.values:
        raise RecognitionPayloadError("trigger_type is invalid.")

    return RecognitionSnapshot.objects.create(
        session=session,
        user=user,
        game_account=account,
        trigger_type=trigger_type,
        client_event_id=payload_string(payload, "client_event_id", max_length=120),
        captured_at=captured_at(payload),
        popup_delta_raw=payload_dict(payload, "popup_delta_raw"),
        detail_snapshot_raw=payload_dict(payload, "detail_snapshot_raw"),
        normalized_snapshot=normalized,
        field_confidence=payload_dict(payload, "field_confidence"),
        popup_screenshot_hash=payload_string(hashes, "popup", max_length=128),
        detail_screenshot_hash=payload_string(hashes, "detail", max_length=128),
        match_status=match_status,
        status=status,
        warnings=warnings or [],
        error_code=error_code,
    )


def _delete_empty_created_echo(snapshot):
    echo = snapshot.created_echo
    if echo is None or echo.substat_rolls.exists() or not echo.auto_imported:
        return 0
    deleted_count, _ = EchoRecord.objects.filter(pk=echo.pk, auto_imported=True).delete()
    if deleted_count:
        snapshot.created_echo = None
        return 1
    return 0


def _recalculate_affected_echoes(echo_ids):
    for echo in EchoRecord.objects.filter(id__in=echo_ids):
        echo.recalculate_status()


def _increment_session(session, snapshot, roll_count, created_echo_count):
    locked_session = RecognitionSession.objects.select_for_update().get(pk=session.pk)
    locked_session.snapshot_count += 1
    locked_session.saved_roll_count += roll_count
    locked_session.created_echo_count += created_echo_count
    if snapshot.status == RecognitionSnapshot.Status.CONFLICT:
        locked_session.conflict_count += 1
    locked_session.last_snapshot_at = snapshot.captured_at
    locked_session.save(
        update_fields=[
            "snapshot_count",
            "saved_roll_count",
            "created_echo_count",
            "conflict_count",
            "last_snapshot_at",
            "updated_at",
        ]
    )

    session.snapshot_count = locked_session.snapshot_count
    session.saved_roll_count = locked_session.saved_roll_count
    session.created_echo_count = locked_session.created_echo_count
    session.conflict_count = locked_session.conflict_count
    session.last_snapshot_at = locked_session.last_snapshot_at


def _decrement_session_after_revert(session, removed_roll_count, deleted_created_echo_count):
    locked_session = RecognitionSession.objects.select_for_update().get(pk=session.pk)
    locked_session.saved_roll_count = max(0, locked_session.saved_roll_count - removed_roll_count)
    locked_session.created_echo_count = max(0, locked_session.created_echo_count - deleted_created_echo_count)
    locked_session.reverted_count += 1
    locked_session.save(
        update_fields=[
            "saved_roll_count",
            "created_echo_count",
            "reverted_count",
            "updated_at",
        ]
    )
