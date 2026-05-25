const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

function getCookie(name) {
  return document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}

async function ensureCsrfCookie() {
  if (getCookie('csrftoken')) {
    return
  }
  await fetch(`${API_BASE_URL}/health/`, {
    credentials: 'include',
  })
}

async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
    await ensureCsrfCookie()
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(getCookie('csrftoken') ? { 'X-CSRFToken': getCookie('csrftoken') } : {}),
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || `Backend responded with ${response.status}`)
  }

  return data
}

export function getBackendHealth() {
  return request('/health/')
}

export function register(payload) {
  return request('/auth/register/', { method: 'POST', body: JSON.stringify(payload) })
}

export function login(payload) {
  return request('/auth/login/', { method: 'POST', body: JSON.stringify(payload) })
}

export function logout() {
  return request('/auth/logout/', { method: 'POST', body: JSON.stringify({}) })
}

export function getMe() {
  return request('/me/')
}

export function listEchoes() {
  return request('/echoes/')
}

export function createEcho(payload) {
  return request('/echoes/', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateEcho(echoId, payload) {
  return request(`/echoes/${echoId}/`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export function addSubstat(echoId, payload) {
  return request(`/echoes/${echoId}/substats/`, { method: 'POST', body: JSON.stringify(payload) })
}

export function undoLastSubstat(echoId) {
  return request(`/echoes/${echoId}/substats/latest/`, { method: 'DELETE' })
}

export function getPrediction(echoId) {
  return request(`/echoes/${echoId}/prediction/`)
}

export function getStats() {
  return request('/stats/')
}

export function getModelEvaluation() {
  return request('/model-evaluation/')
}
