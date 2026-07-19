// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCustomsStationsStore } from '@/stores/customs.stations.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

const stations = [
  {
    id: 1,
    number: '00102030',
    name: 'Первый пост',
    countryIsoNumeric: 643,
    postalCode: '101000',
    city: 'Москва',
    street: 'ул. Первая'
  },
  {
    id: 2,
    number: '00405060',
    name: 'Второй пост',
    countryIsoNumeric: 643,
    postalCode: '190000',
    city: 'Санкт-Петербург',
    street: 'ул. Вторая'
  }
]

describe('customs stations store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with empty state', () => {
    const store = useCustomsStationsStore()

    expect(store.customsStations).toEqual([])
    expect(store.customsStation).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('gets all stations and returns them', async () => {
    fetchWrapper.get.mockResolvedValue(stations)
    const store = useCustomsStationsStore()

    const result = await store.getAll()

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/customsstations`)
    expect(result).toEqual(stations)
    expect(store.customsStations).toEqual(stations)
    expect(store.loading).toBe(false)
  })

  it('records get-all errors and returns null', async () => {
    const error = new Error('network')
    fetchWrapper.get.mockRejectedValue(error)
    const store = useCustomsStationsStore()

    expect(await store.getAll()).toBeNull()
    expect(store.error).toBe(error)
    expect(store.loading).toBe(false)
  })

  it('gets one station', async () => {
    fetchWrapper.get.mockResolvedValue(stations[0])
    const store = useCustomsStationsStore()

    const result = await store.getById(1)

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/customsstations/1`)
    expect(result).toEqual(stations[0])
    expect(store.customsStation).toEqual(stations[0])
    expect(store.loading).toBe(false)
  })

  it('records get-one errors and returns null', async () => {
    const error = new Error('missing')
    fetchWrapper.get.mockRejectedValue(error)
    const store = useCustomsStationsStore()

    expect(await store.getById(999)).toBeNull()
    expect(store.customsStation).toEqual({ error })
    expect(store.error).toBe(error)
  })

  it('creates a station and appends it', async () => {
    fetchWrapper.post.mockResolvedValue(stations[0])
    const store = useCustomsStationsStore()

    const result = await store.create({ ...stations[0], id: 0 })

    expect(fetchWrapper.post).toHaveBeenCalledWith(
      `${apiUrl}/customsstations`,
      { ...stations[0], id: 0 }
    )
    expect(result).toEqual(stations[0])
    expect(store.customsStations).toEqual([stations[0]])
  })

  it('rethrows create errors', async () => {
    const error = new Error('duplicate')
    fetchWrapper.post.mockRejectedValue(error)
    const store = useCustomsStationsStore()

    await expect(store.create(stations[0])).rejects.toThrow('duplicate')
    expect(store.error).toBe(error)
    expect(store.loading).toBe(false)
  })

  it('updates collection and selected station state', async () => {
    fetchWrapper.put.mockResolvedValue()
    const store = useCustomsStationsStore()
    store.customsStations = [...stations]
    store.customsStation = { ...stations[0] }
    const update = { ...stations[0], number: '00000001', city: 'Казань' }

    expect(await store.update(1, update)).toBe(true)

    expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/customsstations/1`, update)
    expect(store.customsStations[0]).toEqual(update)
    expect(store.customsStation).toEqual(update)
  })

  it('does not add missing records during an update', async () => {
    fetchWrapper.put.mockResolvedValue()
    const store = useCustomsStationsStore()
    store.customsStations = [...stations]
    store.customsStation = { ...stations[0] }

    await store.update(99, { id: 99, name: 'Missing' })

    expect(store.customsStations).toEqual(stations)
    expect(store.customsStation).toEqual(stations[0])
  })

  it('rethrows update errors', async () => {
    const error = new Error('update failed')
    fetchWrapper.put.mockRejectedValue(error)
    const store = useCustomsStationsStore()

    await expect(store.update(1, {})).rejects.toThrow('update failed')
    expect(store.error).toBe(error)
  })

  it('removes collection and selected station state', async () => {
    fetchWrapper.delete.mockResolvedValue()
    const store = useCustomsStationsStore()
    store.customsStations = [...stations]
    store.customsStation = { ...stations[0] }

    expect(await store.remove(1)).toBe(true)

    expect(fetchWrapper.delete).toHaveBeenCalledWith(`${apiUrl}/customsstations/1`)
    expect(store.customsStations).toEqual([stations[1]])
    expect(store.customsStation).toBeNull()
  })

  it('leaves a different selected station intact when removing', async () => {
    fetchWrapper.delete.mockResolvedValue()
    const store = useCustomsStationsStore()
    store.customsStations = [...stations]
    store.customsStation = { ...stations[1] }

    await store.remove(1)

    expect(store.customsStation).toEqual(stations[1])
  })

  it('rethrows remove errors and exposes loading while pending', async () => {
    let rejectRequest
    fetchWrapper.delete.mockReturnValue(new Promise((resolve, reject) => {
      rejectRequest = reject
    }))
    const store = useCustomsStationsStore()

    const pending = store.remove(1)
    expect(store.loading).toBe(true)
    rejectRequest(new Error('delete failed'))

    await expect(pending).rejects.toThrow('delete failed')
    expect(store.error.message).toBe('delete failed')
    expect(store.loading).toBe(false)
  })
})
