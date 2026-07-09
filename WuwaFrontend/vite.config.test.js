import assert from 'node:assert/strict'
import test from 'node:test'

async function loadConfig(caseName) {
  return (await import(`./vite.config.js?case=${caseName}-${Date.now()}`)).default
}

test('vite api proxy target defaults to backend port 8001', async () => {
  const previousTarget = process.env.VITE_BACKEND_TARGET
  delete process.env.VITE_BACKEND_TARGET

  try {
    const config = await loadConfig('default-backend-target')

    assert.equal(config.server.proxy['/api'].target, 'http://127.0.0.1:8001')
  } finally {
    if (previousTarget !== undefined) {
      process.env.VITE_BACKEND_TARGET = previousTarget
    }
  }
})

test('vite api proxy target follows VITE_BACKEND_TARGET', async () => {
  const previousTarget = process.env.VITE_BACKEND_TARGET
  process.env.VITE_BACKEND_TARGET = 'http://127.0.0.1:8001'

  try {
    const config = await loadConfig('custom-backend-target')

    assert.equal(config.server.proxy['/api'].target, 'http://127.0.0.1:8001')
  } finally {
    if (previousTarget === undefined) {
      delete process.env.VITE_BACKEND_TARGET
    } else {
      process.env.VITE_BACKEND_TARGET = previousTarget
    }
  }
})
