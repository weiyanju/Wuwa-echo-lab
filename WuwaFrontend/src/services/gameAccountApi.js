import { request } from './http.js'

export function listGameAccounts() {
  return request('/game-accounts/')
}

export function createGameAccount(payload) {
  return request('/game-accounts/', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateGameAccount(accountId, payload) {
  return request(`/game-accounts/${accountId}/`, { method: 'PATCH', body: JSON.stringify(payload) })
}

