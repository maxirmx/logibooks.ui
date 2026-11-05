// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockStore } from './helpers/test-utils.js'

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
    useAuthStore: vi.fn(() =>
      createMockStore({
        user: { token: 'abc' },
        logout: vi.fn()
      })
    )
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

  describe('postFile method (requestFile)', () => {
    it('sends request without body when body is null/undefined', async () => {
      const response = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve('{}')
      }
      global.fetch = vi.fn(() => Promise.resolve(response))

      await fetchWrapper.postFile(`${baseUrl}/upload`, null)

      expect(global.fetch).toHaveBeenCalledWith(`${baseUrl}/upload`, {
        method: 'POST',
        headers: { Authorization: 'Bearer abc' }
        // Note: no body property when body is null
      })
    })

    it('handles other network errors', async () => {
      const customError = new Error('Custom network error')
      customError.name = 'NetworkError'
      global.fetch = vi.fn(() => Promise.reject(customError))

      await expect(fetchWrapper.postFile(`${baseUrl}/upload`, new FormData())).rejects.toThrow(
        'Не удалось соединиться с сервером. Пожалуйста, проверьте подключение к сети.'
      )
    })

    it('handles HTTP error with JSON error response without msg property', async () => {
      const response = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve(JSON.stringify({ error: 'Server crashed' }))
      }
      global.fetch = vi.fn(() => Promise.resolve(response))

      await expect(fetchWrapper.postFile(`${baseUrl}/upload`, new FormData())).rejects.toThrow(
        'Ошибка 500'
      )
    })

    it('handles HTTP error with empty error response', async () => {
      const response = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('')
      }
      global.fetch = vi.fn(() => Promise.resolve(response))

      await expect(fetchWrapper.postFile(`${baseUrl}/upload`, new FormData())).rejects.toThrow(
        'Ошибка 404'
      )
    })

    it('preserves import recovery details from the shared ErrMessage envelope', async () => {
      const details = {
        success: false,
        requiresCurrencySelection: true,
        availableCurrencies: ['RUB', 'UZS'],
        missingHeaders: [],
        missingColumns: ['Вес']
      }
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        text: async () => JSON.stringify({ msg: 'Выберите валюту', errors: {}, details })
      })

      await expect(fetchWrapper.postFile(`${baseUrl}/upload`, new FormData())).resolves.toEqual({
        ...details,
        errMsg: 'Выберите валюту'
      })
    })

  })

  describe('handleResponse edge cases', () => {
    it('handles response with non-JSON content that cannot be parsed', async () => {
      const response = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve('invalid json {')
      }
      global.fetch = vi.fn(() => Promise.resolve(response))

      await expect(fetchWrapper.get(`${baseUrl}/test`)).rejects.toThrow('Сервер вернул данные в некорректном формате')
    })

  })

  describe('request method edge cases', () => {
    it('handles other network error types in request method', async () => {
      const customError = new Error('Connection timeout')
      customError.name = 'TimeoutError'
      global.fetch = vi.fn(() => Promise.reject(customError))

      await expect(fetchWrapper.post(`${baseUrl}/test`, { data: 'test' })).rejects.toThrow(
        'Сервер не ответил вовремя. Повторите операцию.'
      )
    })
  })

  describe('requestBlob method', () => {
    it('handles other error types in requestBlob method', async () => {
      const customError = new Error('SSL error')
      customError.name = 'SecurityError'
      global.fetch = vi.fn(() => Promise.reject(customError))

      await expect(fetchWrapper.getFile(`${baseUrl}/download`)).rejects.toThrow(
        'Не удалось установить защищённое соединение с сервером. Обратитесь к администратору.'
      )
    })

    it('handles HTTP error with text error response in requestBlob method', async () => {
      const response = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: () => Promise.resolve('Access denied')
      }
      global.fetch = vi.fn(() => Promise.resolve(response))

      await expect(fetchWrapper.getFile(`${baseUrl}/download`)).rejects.toThrow('Недостаточно прав для выполнения операции.')
    })
  })

  describe('downloadFile method', () => {
    // Setup mocks for DOM APIs needed for file download
    beforeEach(() => {
      // Mock document.createElement and related DOM methods
      global.document.createElement = vi.fn().mockImplementation((tag) => {
        if (tag === 'a') {
          return {
            href: '',
            download: '',
            click: vi.fn(),
            remove: vi.fn()
          }
        }
        return {}
      })

      global.document.body.appendChild = vi.fn()

      // Mock URL.createObjectURL and revokeObjectURL
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
      global.URL.revokeObjectURL = vi.fn()

      // Reset fetch mock
      global.fetch = vi.fn()
    })

    function mockDownloadResponse(contentDisposition) {
      const mockHeaders = new Map()
      if (contentDisposition !== undefined) {
        mockHeaders.set('Content-Disposition', contentDisposition)
      }

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name) => mockHeaders.get(name)
        },
        blob: vi.fn().mockResolvedValue(new Blob(['content'], { type: 'application/octet-stream' }))
      }

      global.fetch = vi.fn(() => Promise.resolve(mockResponse))
      return mockResponse
    }

    it('polls accepted responses and downloads only the completed file', async () => {
      const progress = { handleId: 'job-1', total: 1000, processed: 250 }
      const progressResponse = {
        ok: true,
        status: 202,
        statusText: 'Accepted',
        headers: { get: () => 'application/json' },
        json: vi.fn().mockResolvedValue(progress),
        blob: vi.fn()
      }
      const fileResponse = mockDownloadResponse(
        'attachment; filename="IndPost_ready.zip"'
      )
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(progressResponse)
        .mockResolvedValueOnce(fileResponse)
      const onProgress = vi.fn()

      const result = await fetchWrapper.downloadFile(
        `${baseUrl}/registers/1/generate`,
        'fallback.zip',
        { pollAccepted: true, pollIntervalMs: 0, onProgress }
      )

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(progressResponse.json).toHaveBeenCalledOnce()
      expect(progressResponse.blob).not.toHaveBeenCalled()
      expect(onProgress).toHaveBeenCalledWith(progress)
      expect(fileResponse.blob).toHaveBeenCalledOnce()
      const anchor = global.document.createElement.mock.results[0].value
      expect(anchor.download).toBe('IndPost_ready.zip')
      expect(anchor.click).toHaveBeenCalledOnce()
    })

    it.each([204, 200])('polls by handle until cancellation or a completed ZIP (%i)', async (status) => {
      const initialUrl = baseUrl + '/registers/1/generate-ordinary'
      const pollUrl = baseUrl + '/registers/1/xml-archives/job-1'
      const initial = { handleId: 'job-1', total: 4, processed: 1 }
      const cancelling = { ...initial, cancelling: true }
      const final = status === 204 ? { ok: true, status, blob: vi.fn() } : mockDownloadResponse()
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, status: 202, json: async () => initial })
        .mockResolvedValueOnce({ ok: true, status: 202, json: async () => cancelling })
        .mockResolvedValueOnce(final)
      const getPollUrl = vi.fn().mockReturnValue(pollUrl)
      const onProgress = vi.fn()

      await expect(fetchWrapper.downloadFile(initialUrl, 'archive.zip', {
        pollAccepted: true, pollIntervalMs: 1, getPollUrl, onProgress
      })).resolves.toBe(status === 200)
      expect(global.fetch.mock.calls.map(([url]) => url)).toEqual([initialUrl, pollUrl, pollUrl])
      expect(getPollUrl).toHaveBeenCalledExactlyOnceWith('job-1')
      expect(onProgress.mock.calls).toEqual([[initial], [cancelling]])
      expect(final.blob).toHaveBeenCalledTimes(status === 200 ? 1 : 0)
    })

    it('keeps polling the same handle after status failures during cancellation', async () => {
      const startUrl = baseUrl + '/generate'
      const statusUrl = baseUrl + '/xml-archives/job-1'
      const progress = { handleId: 'job-1', total: 4, processed: 1 }
      const firstPoll = Promise.withResolvers()
      const polling = Promise.withResolvers()
      let cancelling = false
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, status: 202, json: async () => progress })
        .mockImplementationOnce(() => {
          polling.resolve()
          return firstPoll.promise
        })
        .mockResolvedValueOnce({ ok: true, status: 202, json: async () => { throw new TypeError('Failed to read body') } })
        .mockResolvedValueOnce({ ok: true, status: 204 })

      const download = fetchWrapper.downloadFile(startUrl, 'archive.zip', {
        pollAccepted: true, pollIntervalMs: 0, getPollUrl: () => statusUrl,
        retryPoll: error => cancelling && (!error.status || error.cause instanceof TypeError)
      })
      await polling.promise
      cancelling = true
      firstPoll.reject(new Error('Failed to fetch'))

      await expect(download).resolves.toBe(false)
      expect(global.fetch.mock.calls.map(([url]) => url)).toEqual([startUrl, statusUrl, statusUrl, statusUrl])
      expect(global.document.createElement).not.toHaveBeenCalled()
    })

    it.each([undefined, ' '])('rejects an unusable handle without polling the generation endpoint (%s)', async (handleId) => {
      const progress = { handleId, total: 4, processed: 1 }
      global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 202, json: async () => progress })
      const getPollUrl = vi.fn()
      await expect(fetchWrapper.downloadFile(baseUrl + '/generate', 'archive.zip', {
        pollAccepted: true, pollIntervalMs: 0, getPollUrl
      })).rejects.toMatchObject({ status: 202, data: progress })
      expect(global.fetch).toHaveBeenCalledOnce()
      expect(getPollUrl).not.toHaveBeenCalled()
    })

    it('rejects a null accepted progress payload without invoking the callback', async () => {
      const progressResponse = {
        ok: true,
        status: 202,
        statusText: 'Accepted',
        headers: { get: () => 'application/json' },
        json: vi.fn().mockResolvedValue(null),
        blob: vi.fn()
      }
      global.fetch = vi.fn().mockResolvedValue(progressResponse)
      const onProgress = vi.fn()

      await expect(
        fetchWrapper.downloadFile(
          `${baseUrl}/registers/1/generate`,
          'must-not-download.zip',
          { pollAccepted: true, pollIntervalMs: 0, onProgress }
        )
      ).rejects.toMatchObject({
        message: 'Некорректный ответ о ходе формирования файла',
        status: 202,
        data: null
      })

      expect(global.fetch).toHaveBeenCalledOnce()
      expect(onProgress).not.toHaveBeenCalled()
      expect(progressResponse.blob).not.toHaveBeenCalled()
    })

    it('never saves an accepted progress response when polling is disabled', async () => {
      const progressResponse = {
        ok: true,
        status: 202,
        statusText: 'Accepted',
        headers: { get: () => 'application/json' },
        json: vi.fn().mockResolvedValue({ handleId: 'job-2', total: 1000, processed: 0 }),
        blob: vi.fn()
      }
      global.fetch = vi.fn().mockResolvedValue(progressResponse)

      await expect(
        fetchWrapper.downloadFile(`${baseUrl}/registers/2/generate`, 'must-not-download.zip')
      ).rejects.toMatchObject({ status: 202 })

      expect(progressResponse.blob).not.toHaveBeenCalled()
      expect(global.document.createElement).not.toHaveBeenCalled()
    })

    it('rejects polling for non-GET methods before sending a request', async () => {
      await expect(
        fetchWrapper.downloadFile(`${baseUrl}/registers/7/download-cmr`, 'CMR_7.docx', {
          method: 'post',
          body: { documentDate: '2026-07-19', senderCompanyId: 4 },
          pollAccepted: true
        })
      ).rejects.toThrow('downloadFile polling supports GET requests only')

      expect(global.fetch).not.toHaveBeenCalled()
      expect(global.document.createElement).not.toHaveBeenCalled()
    })

    it('supports authenticated JSON POST downloads without changing GET defaults', async () => {
      const mockResponse = mockDownloadResponse(null)
      const payload = { documentDate: '2026-07-19', senderCompanyId: 4 }

      await fetchWrapper.downloadFile(`${baseUrl}/registers/7/download-cmr`, 'CMR_7.docx', {
        method: 'post',
        body: payload
      })

      expect(global.fetch).toHaveBeenCalledWith(`${baseUrl}/registers/7/download-cmr`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer abc',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      expect(mockResponse.blob).toHaveBeenCalled()
    })

    it('should parse filename correctly when Content-Disposition format varies', async () => {
      // Test different Content-Disposition header formats
      const mockHeadersWithQuotes = new Map()
      mockHeadersWithQuotes.set(
        'Content-Disposition',
        'attachment; filename="file with spaces.pdf"'
      )

      const mockResponseWithQuotes = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name) => mockHeadersWithQuotes.get(name)
        },
        blob: vi.fn().mockResolvedValue(new Blob(['content'], { type: 'application/pdf' }))
      }

      global.fetch = vi.fn(() => Promise.resolve(mockResponseWithQuotes))

      await fetchWrapper.downloadFile(`${baseUrl}/download/file`, 'fallback.pdf')

      // Get the created anchor element
      const anchor = global.document.createElement.mock.results[0].value
      expect(anchor.download).toBe('file with spaces.pdf')

      // Test single quotes
      const mockHeadersSingleQuotes = new Map()
      mockHeadersSingleQuotes.set('Content-Disposition', "attachment; filename='single-quote.xlsx'")

      const mockResponseSingleQuotes = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name) => mockHeadersSingleQuotes.get(name)
        },
        blob: vi.fn().mockResolvedValue(new Blob(['content'], { type: 'application/excel' }))
      }

      global.fetch = vi.fn(() => Promise.resolve(mockResponseSingleQuotes))

      await fetchWrapper.downloadFile(`${baseUrl}/download/file`, 'fallback.xlsx')

      // Get the created anchor element (second call to createElement)
      const anchor2 = global.document.createElement.mock.results[1].value
      expect(anchor2.download).toBe('single-quote.xlsx')
    })

    it('should decode filename star with language tag', async () => {
      mockDownloadResponse(
        "attachment; filename*=utf-8'en'%D0%94%D0%BE%D0%BF%D0%BE%D0%BB%D0%BD%D0%B8%D1%82%D0%B5%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5_%D0%B8%D0%B7%D1%8A%D1%8F%D1%82%D0%B8%D1%8F.xlsx"
      )

      await fetchWrapper.downloadFile(`${baseUrl}/download/file`, 'fallback.xlsx')

      const anchor = global.document.createElement.mock.results[0].value
      expect(anchor.download).toBe('Дополнительные_изъятия.xlsx')
    })

    it('should fall back when filename star is malformed', async () => {
      mockDownloadResponse(
        'attachment; filename="header-fallback.xlsx"; filename*=UTF-8\'\'%E0%A4%A'
      )

      await fetchWrapper.downloadFile(`${baseUrl}/download/file`, 'default-fallback.xlsx')

      const anchor = global.document.createElement.mock.results[0].value
      expect(anchor.download).toBe('header-fallback.xlsx')
      expect(anchor.download).not.toContain('filename')
      expect(anchor.download).not.toContain('UTF-8')
    })

    it('should handle HTTP error responses', async () => {
      // Mock response with HTTP error
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve(JSON.stringify({ msg: 'File not found' })),
        headers: {
          get: () => null // Mock headers.get method
        }
      }

      global.fetch = vi.fn(() => Promise.resolve(mockResponse))

      // Mock console.error to prevent test output clutter
      const originalConsoleError = console.error
      console.error = vi.fn()

      try {
        await expect(
          fetchWrapper.downloadFile(`${baseUrl}/download/file`, 'fallback.txt')
        ).rejects.toThrow('Ошибка 404')
      } finally {
        // Restore console.error
        console.error = originalConsoleError
      }
    })
  })
})
