import { isValidPlayerUid, normalizePlayerUid } from '../../services/playerUid.js'

export const UID_BINDING_ERROR = '请输入 9 位数字 UID。'

export function validateUidBinding(value) {
  const uid = normalizePlayerUid(value)
  return {
    uid,
    error: isValidPlayerUid(uid) ? '' : UID_BINDING_ERROR,
  }
}
