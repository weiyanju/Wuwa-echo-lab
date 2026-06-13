import { request } from './http.js'

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

