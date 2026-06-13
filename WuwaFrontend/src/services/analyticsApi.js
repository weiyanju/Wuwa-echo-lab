import { request, withGameAccount } from './http.js'

export function getPrediction(echoId) {
  return request(`/echoes/${echoId}/prediction/`)
}

export function getStats(gameAccountId = null) {
  return request(withGameAccount('/stats/', gameAccountId))
}

export function getModelEvaluation(gameAccountId = null) {
  return request(withGameAccount('/model-evaluation/', gameAccountId))
}

