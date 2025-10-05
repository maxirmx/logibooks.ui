// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAirportsStore } from '@/stores/airports.store.js'
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

const mockAirports = [
  {
    id: 1,
    iata: 'SVO',
    icao: 'UUEE',
    name: 'Sheremetyevo International Airport',
    country: 'Russia'
  },
  {
    id: 2,
    iata: 'DME',
    icao: 'UUDD',
    name: 'Domodedovo International Airport',
    country: 'Russia'
  }
]

const mockAirport = mockAirports[0]

describe('airports store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with default values', () => {
    const store = useAirportsStore()
    expect(store.airports).toEqual([])
    expect(store.airport).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  describe('getAll', () => {
    it('fetches airports successfully', async () => {
      fetchWrapper.get.mockResolvedValue(mockAirports)
      const store = useAirportsStore()

      await store.getAll()

      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/airports`)
      expect(store.airports).toEqual(mockAirports)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles fetch error', async () => {
      const error = new Error('Network error')
      fetchWrapper.get.mockRejectedValue(error)
      const store = useAirportsStore()

      await store.getAll()

      expect(store.airports).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('getById', () => {
    it('fetches airport by id successfully', async () => {
      fetchWrapper.get.mockResolvedValue(mockAirport)
      const store = useAirportsStore()

      const result = await store.getById(1)

      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/airports/1`)
      expect(store.airport).toEqual(mockAirport)
      expect(result).toEqual(mockAirport)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles fetch error and returns null', async () => {
      const error = new Error('Not found')
      fetchWrapper.get.mockRejectedValue(error)
      const store = useAirportsStore()

      const result = await store.getById(999)

      expect(result).toBeNull()
      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('create', () => {
    it('creates airport successfully', async () => {
      const newAirport = { ...mockAirport, id: 3 }
      fetchWrapper.post.mockResolvedValue(newAirport)
      const store = useAirportsStore()
      store.airports = [...mockAirports]

      const result = await store.create(mockAirport)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/airports`, mockAirport)
      expect(store.airports).toHaveLength(3)
      expect(store.airports[2]).toEqual(newAirport)
      expect(result).toEqual(newAirport)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles create error', async () => {
      const error = new Error('Conflict')
      fetchWrapper.post.mockRejectedValue(error)
      const store = useAirportsStore()

      await expect(store.create(mockAirport)).rejects.toThrow('Conflict')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('update', () => {
    it('updates airport successfully', async () => {
      fetchWrapper.put.mockResolvedValue({})
      const store = useAirportsStore()
      store.airports = [...mockAirports]

      const updateData = { name: 'Updated Airport' }
      const result = await store.update(1, updateData)

      expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/airports/1`, updateData)
      expect(store.airports[0]).toEqual({ ...mockAirports[0], ...updateData })
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles update error', async () => {
      const error = new Error('Not found')
      fetchWrapper.put.mockRejectedValue(error)
      const store = useAirportsStore()

      await expect(store.update(999, {})).rejects.toThrow('Not found')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('remove', () => {
    it('removes airport successfully', async () => {
      fetchWrapper.delete.mockResolvedValue({})
      const store = useAirportsStore()
      store.airports = [...mockAirports]

      const result = await store.remove(1)

      expect(fetchWrapper.delete).toHaveBeenCalledWith(`${apiUrl}/airports/1`)
      expect(store.airports).not.toContain(mockAirports[0])
      expect(store.airports.length).toBe(1)
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles remove error', async () => {
      const error = new Error('Conflict')
      fetchWrapper.delete.mockRejectedValue(error)
      const store = useAirportsStore()

      await expect(store.remove(1)).rejects.toThrow('Conflict')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })
})
