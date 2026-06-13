const RECENT_PLAYER_UIDS_KEY = 'wuwa-recent-player-uids'
const MAX_RECENT_PLAYER_UIDS = 5

export function normalizePlayerUid(value) {
  return String(value || '').replace(/\D/g, '')
}

export function readRecentPlayerUids(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(RECENT_PLAYER_UIDS_KEY) || '[]')
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .map((uid) => normalizePlayerUid(uid))
      .filter(Boolean)
      .filter((uid, index, uids) => uids.indexOf(uid) === index)
      .slice(0, MAX_RECENT_PLAYER_UIDS)
  } catch {
    return []
  }
}

export function addRecentPlayerUid(uid, storage = globalThis.localStorage) {
  const normalizedUid = normalizePlayerUid(uid)
  const nextUids = [
    normalizedUid,
    ...readRecentPlayerUids(storage).filter((recentUid) => recentUid !== normalizedUid),
  ].filter(Boolean).slice(0, MAX_RECENT_PLAYER_UIDS)
  storage.setItem(RECENT_PLAYER_UIDS_KEY, JSON.stringify(nextUids))
  return nextUids
}
