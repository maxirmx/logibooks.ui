/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEventsStore } from '@/stores/events.store.js'

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

describe('events.store.js', () => {
  let store

  const mockEvents = [
    { id: 1, eventId: 'Received', eventName: 'Получена' },
    { id: 2, eventId: 'Processing', eventName: 'Обрабатывается', parcelStatusId: 5 }
  ]

  const mockEvent = { id: 2, eventId: 'Processing', eventName: 'Обрабатывается', parcelStatusId: 5 }

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useEventsStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('parcel events', () => {
    describe('parcelGetAll', () => {
      it('handles empty response', async () => {
        mockGet.mockResolvedValue(null)

        await store.parcelGetAll()

        expect(store.parcelEvents).toEqual([])
      })

    })

    describe('parcelGetById', () => {
      it('resets loading state when refresh is true', async () => {
        store.parcelEvent = { id: 9 }
        mockGet.mockResolvedValue(mockEvent)

        await store.parcelGetById(2, true)

        expect(store.parcelEvent).toEqual(mockEvent)
      })

    })

    describe('parcelUpdate', () => {
      it('updates a parcel event and refreshes list', async () => {
        const updatedEvent = { ...mockEvent, parcelStatusId: 7 }
        mockPut.mockResolvedValue(updatedEvent)
        mockGet.mockResolvedValue(mockEvents)

        const result = await store.parcelUpdate(2, { parcelStatusId: 7 })

        expect(mockPut).toHaveBeenCalledWith('http://localhost:3000/api/events/parcels/2', {
          id: 2,
          parcelStatusId: 7
        })
        expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/events/parcels')
        expect(result).toEqual(updatedEvent)
      })

    })

  })

  describe('register events', () => {
    describe('registerGetAll', () => {
      it('propagates errors', async () => {
        const error = new Error('Network error')
        mockGet.mockRejectedValue(error)

        await expect(store.registerGetAll()).rejects.toThrow('Network error')
      })
    })

    describe('registerGetById', () => {
      it('propagates fetch errors', async () => {
        const error = new Error('Not found')
        mockGet.mockRejectedValue(error)

        await expect(store.registerGetById(99)).rejects.toThrow('Not found')
      })
    })

    describe('registerUpdate', () => {
      it('propagates update errors', async () => {
        const error = new Error('Update failed')
        mockPut.mockRejectedValue(error)

        await expect(store.registerUpdate(2, {})).rejects.toThrow('Update failed')
      })
    })

    describe('registerUpdateMany', () => {
      it('updates multiple register events and refreshes list', async () => {
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

        const result = await store.registerUpdateMany(payload)

        expect(mockPut).toHaveBeenCalledWith('http://localhost:3000/api/events/registers', payload)
        expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/events/registers')
        expect(result).toEqual(updatedEvents)
      })

      it('propagates batch update errors', async () => {
        const error = new Error('Batch failed')
        mockPut.mockRejectedValue(error)

        await expect(store.registerUpdateMany([{ id: 1, parcelStatusId: 4 }])).rejects.toThrow(
          'Batch failed'
        )
      })
    })
  })

  describe('isolation between parcel and register events', () => {
    it('parcel and register operations use separate state', async () => {
      const parcelData = [{ id: 1, eventName: 'Parcel Event' }]
      const registerData = [{ id: 2, eventName: 'Register Event' }]

      mockGet.mockResolvedValueOnce(parcelData).mockResolvedValueOnce(registerData)

      await store.parcelGetAll()
      await store.registerGetAll()

      expect(store.parcelEvents).toEqual(parcelData)
      expect(store.registerEvents).toEqual(registerData)
    })

  })
})
