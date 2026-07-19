const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api'

export class ApiError extends Error {
  constructor(message, { status, code = '' } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

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

export async function request(path, options = {}) {
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
    throw new ApiError(
      data.error || `Backend responded with ${response.status}`,
      { status: response.status, code: data.code || '' },
    )
  }

  return data
}

export function withGameAccount(path, gameAccountId) {
  if (!gameAccountId) {
    return path
  }
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}game_account_id=${encodeURIComponent(gameAccountId)}`
}
