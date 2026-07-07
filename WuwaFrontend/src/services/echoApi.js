import { request, withGameAccount } from './http.js'

export function listEchoes(gameAccountId = null) {
  return request(withGameAccount('/echoes/', gameAccountId))
}

export function createEcho(payload, gameAccountId = null) {
  const body = gameAccountId ? { ...payload, game_account_id: gameAccountId } : payload
  return request('/echoes/', { method: 'POST', body: JSON.stringify(body) })
}

export function updateEcho(echoId, payload, options = {}) {
  return request(`/echoes/${echoId}/`, { ...options, method: 'PATCH', body: JSON.stringify(payload) })
}

export function addSubstat(echoId, payload) {
  return request(`/echoes/${echoId}/substats/`, { method: 'POST', body: JSON.stringify(payload) })
}

export function undoLastSubstat(echoId) {
  return request(`/echoes/${echoId}/substats/latest/`, { method: 'DELETE' })
}
