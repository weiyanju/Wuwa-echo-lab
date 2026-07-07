import { request, withGameAccount } from './http.js'

export function getPrediction(echoId, options = {}) {
  const { mode = 'fast', ...requestOptions } = options
  const query = mode ? `?mode=${encodeURIComponent(mode)}` : ''
  return request(`/echoes/${echoId}/prediction/${query}`, requestOptions)
}

export function getStats(gameAccountId = null) {
  return request(withGameAccount('/stats/', gameAccountId))
}

export function getModelEvaluation(gameAccountId = null) {
  return request(withGameAccount('/model-evaluation/', gameAccountId))
}
