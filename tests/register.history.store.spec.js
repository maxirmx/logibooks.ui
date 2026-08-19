/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRegisterHistoryStore } from '@/stores/register.history.store.js'

const mockGet = vi.hoisted(() => vi.fn())

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: mockGet }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:3000/api'
}))

describe('register.history.store.js', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads a paged register history', async () => {
    const response = {
      items: [{ id: 5, registerId: 42, reason: 'Сохранение изменений' }],
      pagination: { totalCount: 7 },
      filterOptions: {
        users: [{ userId: 3, userName: 'Иванов Иван', userEmail: 'ivan@example.com' }],
        reasons: ['Сохранение изменений']
      }
    }
    mockGet.mockResolvedValue(response)
    const store = useRegisterHistoryStore()

    const result = await store.getHistory(42, { page: 2, pageSize: 25 })

    expect(mockGet).toHaveBeenCalledWith(
      'http://localhost:3000/api/registers/42/history?page=2&pageSize=25&sortBy=changedAt&sortOrder=desc'
    )
    expect(result).toEqual(response)
    expect(store.items).toEqual(response.items)
    expect(store.totalCount).toBe(7)
    expect(store.userOptions).toEqual(response.filterOptions.users)
    expect(store.reasonOptions).toEqual(response.filterOptions.reasons)
    expect(store.loading).toBe(false)
  })

  it('adds server sorting and optional user and reason filters to the request', async () => {
    mockGet.mockResolvedValue({ items: [], pagination: { totalCount: 0 } })
    const store = useRegisterHistoryStore()

    await store.getHistory(42, {
      page: 1,
      pageSize: 50,
      sortBy: 'reason',
      sortOrder: 'asc',
      userId: 0,
      reason: 'Проверка по стоп-словам'
    })

    expect(mockGet).toHaveBeenCalledWith(
      'http://localhost:3000/api/registers/42/history?page=1&pageSize=50&sortBy=reason&sortOrder=asc&userId=0&reason=%D0%9F%D1%80%D0%BE%D0%B2%D0%B5%D1%80%D0%BA%D0%B0+%D0%BF%D0%BE+%D1%81%D1%82%D0%BE%D0%BF-%D1%81%D0%BB%D0%BE%D0%B2%D0%B0%D0%BC'
    )
  })

  it('ignores a stale response that completes after the latest request', async () => {
    let resolveFirst
    let resolveSecond
    mockGet
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve
          })
      )
    const store = useRegisterHistoryStore()

    const firstRequest = store.getHistory(42, { page: 1 })
    const secondRequest = store.getHistory(42, { page: 2 })
    resolveSecond({
      items: [{ id: 2 }],
      pagination: { totalCount: 2 },
      filterOptions: { users: [{ userId: 2 }], reasons: ['Новая причина'] }
    })
    await secondRequest
    resolveFirst({
      items: [{ id: 1 }],
      pagination: { totalCount: 1 },
      filterOptions: { users: [{ userId: 1 }], reasons: ['Старая причина'] }
    })
    await firstRequest

    expect(store.items).toEqual([{ id: 2 }])
    expect(store.totalCount).toBe(2)
    expect(store.userOptions).toEqual([{ userId: 2 }])
    expect(store.reasonOptions).toEqual(['Новая причина'])
    expect(store.loading).toBe(false)
  })

  it('does not let a stale rejection clear the latest successful result', async () => {
    let rejectFirst
    mockGet
      .mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            void resolve
            rejectFirst = reject
          })
      )
      .mockResolvedValueOnce({
        items: [{ id: 2 }],
        pagination: { totalCount: 1 },
        filterOptions: { users: [], reasons: [] }
      })
    const store = useRegisterHistoryStore()

    const firstRequest = store.getHistory(42, { page: 1 })
    await store.getHistory(42, { page: 2 })
    rejectFirst(new Error('Stale failure'))
    await expect(firstRequest).rejects.toThrow('Stale failure')

    expect(store.items).toEqual([{ id: 2 }])
    expect(store.totalCount).toBe(1)
    expect(store.error).toBe(null)
    expect(store.loading).toBe(false)
  })

  it('resets all history state and invalidates an outstanding request', async () => {
    let resolveRequest
    mockGet.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        })
    )
    const store = useRegisterHistoryStore()
    store.items = [{ id: 1 }]
    store.totalCount = 1
    store.userOptions = [{ userId: 1 }]
    store.reasonOptions = ['Причина']
    const request = store.getHistory(42)

    store.reset()
    resolveRequest({
      items: [{ id: 2 }],
      pagination: { totalCount: 2 },
      filterOptions: { users: [{ userId: 2 }], reasons: ['Новая причина'] }
    })
    await request

    expect(store.items).toEqual([])
    expect(store.totalCount).toBe(0)
    expect(store.userOptions).toEqual([])
    expect(store.reasonOptions).toEqual([])
    expect(store.error).toBe(null)
    expect(store.loading).toBe(false)
  })

  it('clears stale data and exposes an error when loading fails', async () => {
    const store = useRegisterHistoryStore()
    store.items = [{ id: 1 }]
    store.totalCount = 1
    const error = new Error('Forbidden')
    mockGet.mockRejectedValue(error)

    await expect(store.getHistory(42)).rejects.toThrow('Forbidden')

    expect(store.items).toEqual([])
    expect(store.totalCount).toBe(0)
    expect(store.error).toBe(error)
    expect(store.loading).toBe(false)
  })
})
