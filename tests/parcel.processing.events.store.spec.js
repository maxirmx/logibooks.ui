/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useParcelProcessingEventsStore } from '@/stores/parcel.processing.events.store.js'

const mockGet = vi.hoisted(() => vi.fn())
const mockPut = vi.hoisted(() => vi.fn())

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: mockGet,
    put: mockPut
  }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:3000/api'
}))

describe('parcel.processing.events.store.js', () => {
  let store

  const mockEvents = [
    { id: 1, eventId: 'Received', eventName: 'Получена' },
    { id: 2, eventId: 'Processing', eventName: 'Обрабатывается', parcelStatusId: 5 }
  ]

  const mockEvent = { id: 2, eventId: 'Processing', eventName: 'Обрабатывается', parcelStatusId: 5 }

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useParcelProcessingEventsStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('initial state', () => {
    it('sets default values', () => {
      expect(store.events).toEqual([])
      expect(store.event).toEqual({ loading: true })
      expect(store.loading).toBe(false)
    })
  })

  describe('getAll', () => {
    it('loads all events', async () => {
      mockGet.mockResolvedValue(mockEvents)

      await store.getAll()

      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/events/parcels')
      expect(store.events).toEqual(mockEvents)
      expect(store.loading).toBe(false)
    })

    it('handles empty response', async () => {
      mockGet.mockResolvedValue(null)

      await store.getAll()

      expect(store.events).toEqual([])
    })

    it('sets loading during fetch', async () => {
      let loadingDuringFetch = false
      mockGet.mockImplementation(async () => {
        loadingDuringFetch = store.loading
        return mockEvents
      })

      await store.getAll()

      expect(loadingDuringFetch).toBe(true)
      expect(store.loading).toBe(false)
    })

    it('propagates errors', async () => {
      const error = new Error('Network error')
      mockGet.mockRejectedValue(error)

      await expect(store.getAll()).rejects.toThrow('Network error')
    })
  })

  describe('getById', () => {
    it('fetches a single event', async () => {
      mockGet.mockResolvedValue(mockEvent)

      const result = await store.getById(2)

      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/events/parcels/2')
      expect(store.event).toEqual(mockEvent)
      expect(result).toEqual(mockEvent)
    })

    it('resets loading state when refresh is true', async () => {
      store.event = { id: 9 }
      mockGet.mockResolvedValue(mockEvent)

      await store.getById(2, true)

      expect(store.event).toEqual(mockEvent)
    })

    it('propagates fetch errors', async () => {
      const error = new Error('Not found')
      mockGet.mockRejectedValue(error)

      await expect(store.getById(99)).rejects.toThrow('Not found')
    })
  })

  describe('update', () => {
    it('updates an event and refreshes list', async () => {
      const updatedEvent = { ...mockEvent, parcelStatusId: 7 }
      mockPut.mockResolvedValue(updatedEvent)
      mockGet.mockResolvedValue(mockEvents)

      const result = await store.update(2, { parcelStatusId: 7 })

      expect(mockPut).toHaveBeenCalledWith('http://localhost:3000/api/events/parcels/2', { id: 2, parcelStatusId: 7 })
      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/events/parcels')
      expect(result).toEqual(updatedEvent)
    })

    it('propagates update errors', async () => {
      const error = new Error('Update failed')
      mockPut.mockRejectedValue(error)

      await expect(store.update(2, {})).rejects.toThrow('Update failed')
    })
  })

  describe('updateMany', () => {
    it('updates multiple events and refreshes list', async () => {
      const payload = [
        { id: 1, parcelStatusId: 5 },
        { id: 2, parcelStatusId: null }
      ]

      const updatedEvents = [
        { ...mockEvents[0], parcelStatusId: 5 },
        { ...mockEvents[1], parcelStatusId: null }
      ]

      mockPut.mockResolvedValue(updatedEvents)
      mockGet.mockResolvedValue(mockEvents)

      const result = await store.updateMany(payload)

      expect(mockPut).toHaveBeenCalledWith('http://localhost:3000/api/events/parcels', payload)
      expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/events/parcels')
      expect(result).toEqual(updatedEvents)
    })

    it('propagates batch update errors', async () => {
      const error = new Error('Batch failed')
      mockPut.mockRejectedValue(error)

      await expect(store.updateMany([{ id: 1, parcelStatusId: 4 }])).rejects.toThrow('Batch failed')
    })
  })
})
