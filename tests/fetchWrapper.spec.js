import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockStore } from './test-utils.js'

// Mock Blob and URL.createObjectURL for linting purposes
if (typeof global.Blob === 'undefined') {
  global.Blob = class Blob {
    constructor(content, options) {
      this.content = content
      this.options = options
      this.size = content.length
      this.type = options?.type || ''
    }
  }
}

// Mock URL.createObjectURL
if (typeof global.URL === 'undefined') {
  global.URL = {
    createObjectURL: vi.fn(() => 'mock-blob-url'),
    revokeObjectURL: vi.fn()
  }
}

// Place mocks back at the top level, which is fine with isolate: true in config
vi.mock('@/stores/auth.store.js', () => {
  return {
    useAuthStore: vi.fn(() => createMockStore({ 
      user: { token: 'abc' }, 
      logout: vi.fn() 
    }))
  }
})

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api',
  enableLog: false
}))

import { fetchWrapper } from '@/helpers/fetch.wrapper.js'

const baseUrl = 'http://localhost:8080/api'

describe('fetchWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('handles successful json response', async () => {
    const response = { ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve(JSON.stringify({ ok: true })) }
    global.fetch = vi.fn(() => Promise.resolve(response))
    const data = await fetchWrapper.get(`${baseUrl}/test`)
    expect(data).toEqual({ ok: true })
    expect(global.fetch).toHaveBeenCalledWith(`${baseUrl}/test`, { method: 'GET', headers: { Authorization: 'Bearer abc' } })
  })

  it('returns undefined for 204 responses', async () => {
    const response = { ok: true, status: 204, statusText: 'No Content', text: () => Promise.resolve('') }
    global.fetch = vi.fn(() => Promise.resolve(response))
    const data = await fetchWrapper.get(`${baseUrl}/empty`)
    expect(data).toBeUndefined()
  })

  it('throws parsed error for failed requests', async () => {
    const response = { ok: false, status: 401, statusText: 'Unauthorized', text: () => Promise.resolve(JSON.stringify({ msg: 'bad' })) }
    global.fetch = vi.fn(() => Promise.resolve(response))
    await expect(fetchWrapper.get(`${baseUrl}/fail`)).rejects.toThrow('bad')
  })

  it('throws network error in russian', async () => {
    global.fetch = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
    await expect(fetchWrapper.get(`${baseUrl}/neterr`)).rejects.toThrow('Не удалось соединиться')
  })

  it('sends FormData with postFile', async () => {
    const response = { ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve('{}') }
    global.fetch = vi.fn(() => Promise.resolve(response))
    const fd = new FormData()
    fd.append('file', new File(['x'], 'test.txt'))
    await fetchWrapper.postFile(`${baseUrl}/upload`, fd)
    expect(global.fetch).toHaveBeenCalledWith(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { Authorization: 'Bearer abc' },
      body: fd
    })
  })

  describe('postFile method (requestFile)', () => {
    it('sends request without body when body is null/undefined', async () => {
      const response = { ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve('{}') }
      global.fetch = vi.fn(() => Promise.resolve(response))
      
      await fetchWrapper.postFile(`${baseUrl}/upload`, null)
      
      expect(global.fetch).toHaveBeenCalledWith(`${baseUrl}/upload`, {
        method: 'POST',
        headers: { Authorization: 'Bearer abc' }
        // Note: no body property when body is null
      })
    })

    it('handles network error (TypeError: Failed to fetch)', async () => {
      global.fetch = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
      
      await expect(fetchWrapper.postFile(`${baseUrl}/upload`, new FormData()))
        .rejects.toThrow('Не удалось соединиться с сервером. Пожалуйста, проверьте подключение к сети.')
    })

    it('handles other network errors', async () => {
      const customError = new Error('Custom network error')
      customError.name = 'NetworkError'
      global.fetch = vi.fn(() => Promise.reject(customError))
      
      await expect(fetchWrapper.postFile(`${baseUrl}/upload`, new FormData()))
        .rejects.toThrow('Произошла непредвиденная ошибка при обращении к серверу: Custom network error')
    })

    it('handles HTTP error with JSON error response', async () => {
      const response = { 
        ok: false, 
        status: 400, 
        statusText: 'Bad Request', 
        text: () => Promise.resolve(JSON.stringify({ msg: 'File format not supported' }))
      }
      global.fetch = vi.fn(() => Promise.resolve(response))
      
      await expect(fetchWrapper.postFile(`${baseUrl}/upload`, new FormData()))
        .rejects.toThrow('File format not supported')
    })

    it('handles HTTP error with JSON error response without msg property', async () => {
      const response = { 
        ok: false, 
        status: 500, 
        statusText: 'Internal Server Error', 
        text: () => Promise.resolve(JSON.stringify({ error: 'Server crashed' }))
      }
      global.fetch = vi.fn(() => Promise.resolve(response))
      
      await expect(fetchWrapper.postFile(`${baseUrl}/upload`, new FormData()))
        .rejects.toThrow('Ошибка 500')
    })

    it('handles HTTP error with plain text error response', async () => {
      const response = { 
        ok: false, 
        status: 413, 
        statusText: 'Payload Too Large', 
        text: () => Promise.resolve('File too large')
      }
      global.fetch = vi.fn(() => Promise.resolve(response))
      
      await expect(fetchWrapper.postFile(`${baseUrl}/upload`, new FormData()))
        .rejects.toThrow('File too large')
    })

    it('handles HTTP error with empty error response', async () => {
      const response = { 
        ok: false, 
        status: 404, 
        statusText: 'Not Found', 
        text: () => Promise.resolve('')
      }
      global.fetch = vi.fn(() => Promise.resolve(response))
      
      await expect(fetchWrapper.postFile(`${baseUrl}/upload`, new FormData()))
        .rejects.toThrow('Ошибка 404')
    })

    it('handles HTTP error with invalid JSON response', async () => {
      const response = { 
        ok: false, 
        status: 422, 
        statusText: 'Unprocessable Entity', 
        text: () => Promise.resolve('Invalid JSON response {')
      }
      global.fetch = vi.fn(() => Promise.resolve(response))
      
      await expect(fetchWrapper.postFile(`${baseUrl}/upload`, new FormData()))
        .rejects.toThrow('Invalid JSON response {')
    })

    it('returns handleResponse result for successful requests', async () => {
      const response = { 
        ok: true, 
        status: 201, 
        statusText: 'Created', 
        text: () => Promise.resolve(JSON.stringify({ id: 123, status: 'uploaded' }))
      }
      global.fetch = vi.fn(() => Promise.resolve(response))
      
      const result = await fetchWrapper.postFile(`${baseUrl}/upload`, new FormData())
      
      expect(result).toEqual({ id: 123, status: 'uploaded' })
    })

    it('returns undefined for 204 No Content responses', async () => {
      const response = { 
        ok: true, 
        status: 204, 
        statusText: 'No Content', 
        text: () => Promise.resolve('')
      }
      global.fetch = vi.fn(() => Promise.resolve(response))
      
      const result = await fetchWrapper.postFile(`${baseUrl}/upload`, new FormData())
      
      expect(result).toBeUndefined()
    })
  })

  describe('authHeader helper function coverage', () => {
    it('returns Authorization header when user is logged in and URL starts with apiUrl', async () => {
      const response = { ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve('{}') }
      global.fetch = vi.fn(() => Promise.resolve(response))
      
      await fetchWrapper.get(`${baseUrl}/test`)
      
      expect(global.fetch).toHaveBeenCalledWith(`${baseUrl}/test`, {
        method: 'GET',
        headers: { Authorization: 'Bearer abc' }
      })
    })

    it('returns empty object when URL does not start with apiUrl', async () => {
      const response = { ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve('{}') }
      global.fetch = vi.fn(() => Promise.resolve(response))
      
      await fetchWrapper.get('http://external-api.com/test')
      
      expect(global.fetch).toHaveBeenCalledWith('http://external-api.com/test', {
        method: 'GET',
        headers: {} // Empty headers for external URLs
      })
    })
  })

  describe('handleResponse edge cases', () => {
    it('handles response with non-JSON content that cannot be parsed', async () => {
      const response = { ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve('invalid json {') }
      global.fetch = vi.fn(() => Promise.resolve(response))
      
      await expect(fetchWrapper.get(`${baseUrl}/test`)).rejects.toThrow('invalid json {')
    })

    it('handles non-ok response without msg property, falls back to status code', async () => {
      const response = { 
        ok: false, 
        status: 500, 
        statusText: 'Internal Server Error', 
        text: () => Promise.resolve('{"error": "Something went wrong"}') 
      }
      global.fetch = vi.fn(() => Promise.resolve(response))
      
      await expect(fetchWrapper.get(`${baseUrl}/test`)).rejects.toThrow('Ошибка 500')
    })
  })

  describe('request method edge cases', () => {
    it('sends POST request with JSON body', async () => {
      const response = { ok: true, status: 201, statusText: 'Created', text: () => Promise.resolve('{"id": 123}') }
      global.fetch = vi.fn(() => Promise.resolve(response))
      
      const requestBody = { name: 'Test User', email: 'test@example.com' }
      const result = await fetchWrapper.post(`${baseUrl}/users`, requestBody)
      
      expect(global.fetch).toHaveBeenCalledWith(`${baseUrl}/users`, {
        method: 'POST',
        headers: { 
          Authorization: 'Bearer abc',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
      expect(result).toEqual({ id: 123 })
    })

    it('handles other network error types in request method', async () => {
      const customError = new Error('Connection timeout')
      customError.name = 'TimeoutError'
      global.fetch = vi.fn(() => Promise.reject(customError))
      
      await expect(fetchWrapper.post(`${baseUrl}/test`, { data: 'test' }))
        .rejects.toThrow('Произошла непредвиденная ошибка при обращении к серверу: Connection timeout')
    })
  })
  
  describe('requestBlob method', () => {
    it('sends GET request and returns response object', async () => {
      const mockHeaders = new Map()
      mockHeaders.set('Content-Type', 'application/xml')
      
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name) => mockHeaders.get(name)
        },
        blob: vi.fn().mockResolvedValue(new global.Blob(['<xml></xml>'], {type: 'application/xml'}))
      }
      
      global.fetch = vi.fn(() => Promise.resolve(mockResponse))
      
      const response = await fetchWrapper.getFile(`${baseUrl}/download`)
      
      expect(global.fetch).toHaveBeenCalledWith(`${baseUrl}/download`, {
        method: 'GET',
        headers: { Authorization: 'Bearer abc' }
      })
      expect(response).toBe(mockResponse)
    })
    
    it('handles network error in requestBlob method', async () => {
      global.fetch = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
      
      await expect(fetchWrapper.getFile(`${baseUrl}/download`))
        .rejects.toThrow('Не удалось соединиться с сервером. Пожалуйста, проверьте подключение к сети.')
    })
    
    it('handles other error types in requestBlob method', async () => {
      const customError = new Error('SSL error')
      customError.name = 'SecurityError'
      global.fetch = vi.fn(() => Promise.reject(customError))
      
      await expect(fetchWrapper.getFile(`${baseUrl}/download`))
        .rejects.toThrow('Произошла непредвиденная ошибка при обращении к серверу: SSL error')
    })
    
    it('handles HTTP error with JSON error response in requestBlob method', async () => {
      const response = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve(JSON.stringify({ msg: 'File not found' }))
      }
      global.fetch = vi.fn(() => Promise.resolve(response))
      
      await expect(fetchWrapper.getFile(`${baseUrl}/download`))
        .rejects.toThrow('File not found')
    })
    
    it('handles HTTP error with text error response in requestBlob method', async () => {
      const response = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: () => Promise.resolve('Access denied')
      }
      global.fetch = vi.fn(() => Promise.resolve(response))
      
      await expect(fetchWrapper.getFile(`${baseUrl}/download`))
        .rejects.toThrow('Access denied')
    })
  })
  
  describe('downloadFile method', () => {
    // Since browser APIs like document.createElement and URL.createObjectURL
    // are not fully supported in the test environment, we'll skip these tests
    // Note: In a real project, you would use a browser-based testing framework like Cypress
    // for properly testing download functionality
    it('should exist as a method', () => {
      expect(typeof fetchWrapper.downloadFile).toBe('function');
    });
  })
})
