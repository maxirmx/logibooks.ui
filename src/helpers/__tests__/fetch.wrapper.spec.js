import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { fetchWrapper } from '../fetch.wrapper.js'

let originalFetch

beforeEach(() => {
  setActivePinia(createPinia())
  originalFetch = global.fetch
})

afterEach(() => {
  global.fetch = originalFetch
})

describe('fetchWrapper.handleResponse', () => {
  it('returns detail message from server response', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ detail: 'Invalid credentials' }),
          { status: 400, statusText: 'Bad Request' }
        )
      )
    )

    await expect(
      fetchWrapper.post('http://example.com/login', { email: 'a', password: 'b' })
    ).rejects.toBe('Invalid credentials')
  })
})
