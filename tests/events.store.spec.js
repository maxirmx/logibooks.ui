/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
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

  describe('initial state', () => {
    it('sets default values for parcels', () => {
      expect(store.parcelEvents).toEqual([])
      expect(store.parcelEvent).toEqual({ loading: true })
      expect(store.parcelLoading).toBe(false)
    })

    it('sets default values for registers', () => {
      expect(store.registerEvents).toEqual([])
      expect(store.registerEvent).toEqual({ loading: true })
      expect(store.registerLoading).toBe(false)
    })
  })

  describe('parcel events', () => {
    describe('parcelGetAll', () => {
      it('loads all parcel events', async () => {
        mockGet.mockResolvedValue(mockEvents)

        await store.parcelGetAll()

        expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/events/parcels')
        expect(store.parcelEvents).toEqual(mockEvents)
        expect(store.parcelLoading).toBe(false)
      })

      it('handles empty response', async () => {
        mockGet.mockResolvedValue(null)

        await store.parcelGetAll()

        expect(store.parcelEvents).toEqual([])
      })

      it('sets loading during fetch', async () => {
        let loadingDuringFetch = false
        mockGet.mockImplementation(async () => {
          loadingDuringFetch = store.parcelLoading
          return mockEvents
        })

        await store.parcelGetAll()

        expect(loadingDuringFetch).toBe(true)
        expect(store.parcelLoading).toBe(false)
      })

      it('propagates errors', async () => {
        const error = new Error('Network error')
        mockGet.mockRejectedValue(error)

        await expect(store.parcelGetAll()).rejects.toThrow('Network error')
      })
    })

    describe('parcelGetById', () => {
      it('fetches a single parcel event', async () => {
        mockGet.mockResolvedValue(mockEvent)

        const result = await store.parcelGetById(2)

        expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/events/parcels/2')
        expect(store.parcelEvent).toEqual(mockEvent)
        expect(result).toEqual(mockEvent)
      })

      it('resets loading state when refresh is true', async () => {
        store.parcelEvent = { id: 9 }
        mockGet.mockResolvedValue(mockEvent)

        await store.parcelGetById(2, true)

        expect(store.parcelEvent).toEqual(mockEvent)
      })

      it('propagates fetch errors', async () => {
        const error = new Error('Not found')
        mockGet.mockRejectedValue(error)

        await expect(store.parcelGetById(99)).rejects.toThrow('Not found')
      })
    })

    describe('parcelUpdate', () => {
      it('updates a parcel event and refreshes list', async () => {
        const updatedEvent = { ...mockEvent, parcelStatusId: 7 }
        mockPut.mockResolvedValue(updatedEvent)
        mockGet.mockResolvedValue(mockEvents)

        const result = await store.parcelUpdate(2, { parcelStatusId: 7 })

        expect(mockPut).toHaveBeenCalledWith('http://localhost:3000/api/events/parcels/2', { id: 2, parcelStatusId: 7 })
        expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/events/parcels')
        expect(result).toEqual(updatedEvent)
      })

      it('propagates update errors', async () => {
        const error = new Error('Update failed')
        mockPut.mockRejectedValue(error)

        await expect(store.parcelUpdate(2, {})).rejects.toThrow('Update failed')
      })
    })

    describe('parcelUpdateMany', () => {
      it('updates multiple parcel events and refreshes list', async () => {
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

        const result = await store.parcelUpdateMany(payload)

        expect(mockPut).toHaveBeenCalledWith('http://localhost:3000/api/events/parcels', payload)
        expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/events/parcels')
        expect(result).toEqual(updatedEvents)
      })

      it('propagates batch update errors', async () => {
        const error = new Error('Batch failed')
        mockPut.mockRejectedValue(error)

        await expect(store.parcelUpdateMany([{ id: 1, parcelStatusId: 4 }])).rejects.toThrow('Batch failed')
      })
    })
  })

  describe('register events', () => {
    describe('registerGetAll', () => {
      it('loads all register events', async () => {
        mockGet.mockResolvedValue(mockEvents)

        await store.registerGetAll()

        expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/events/registers')
        expect(store.registerEvents).toEqual(mockEvents)
        expect(store.registerLoading).toBe(false)
      })

      it('handles empty response', async () => {
        mockGet.mockResolvedValue(null)

        await store.registerGetAll()

        expect(store.registerEvents).toEqual([])
      })

      it('sets loading during fetch', async () => {
        let loadingDuringFetch = false
        mockGet.mockImplementation(async () => {
          loadingDuringFetch = store.registerLoading
          return mockEvents
        })

        await store.registerGetAll()

        expect(loadingDuringFetch).toBe(true)
        expect(store.registerLoading).toBe(false)
      })

      it('propagates errors', async () => {
        const error = new Error('Network error')
        mockGet.mockRejectedValue(error)

        await expect(store.registerGetAll()).rejects.toThrow('Network error')
      })
    })

    describe('registerGetById', () => {
      it('fetches a single register event', async () => {
        mockGet.mockResolvedValue(mockEvent)

        const result = await store.registerGetById(2)

        expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/events/registers/2')
        expect(store.registerEvent).toEqual(mockEvent)
        expect(result).toEqual(mockEvent)
      })

      it('resets loading state when refresh is true', async () => {
        store.registerEvent = { id: 9 }
        mockGet.mockResolvedValue(mockEvent)

        await store.registerGetById(2, true)

        expect(store.registerEvent).toEqual(mockEvent)
      })

      it('propagates fetch errors', async () => {
        const error = new Error('Not found')
        mockGet.mockRejectedValue(error)

        await expect(store.registerGetById(99)).rejects.toThrow('Not found')
      })
    })

    describe('registerUpdate', () => {
      it('updates a register event and refreshes list', async () => {
        const updatedEvent = { ...mockEvent, parcelStatusId: 7 }
        mockPut.mockResolvedValue(updatedEvent)
        mockGet.mockResolvedValue(mockEvents)

        const result = await store.registerUpdate(2, { parcelStatusId: 7 })

        expect(mockPut).toHaveBeenCalledWith('http://localhost:3000/api/events/registers/2', { id: 2, parcelStatusId: 7 })
        expect(mockGet).toHaveBeenCalledWith('http://localhost:3000/api/events/registers')
        expect(result).toEqual(updatedEvent)
      })

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

        await expect(store.registerUpdateMany([{ id: 1, parcelStatusId: 4 }])).rejects.toThrow('Batch failed')
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

    it('parcel and register loading states are independent', async () => {
      let parcelLoadingDuringRegisterFetch = false

      mockGet.mockImplementation(async (url) => {
        if (url.includes('registers')) {
          parcelLoadingDuringRegisterFetch = store.parcelLoading
        }
        return []
      })

      await store.parcelGetAll()
      await store.registerGetAll()

      expect(parcelLoadingDuringRegisterFetch).toBe(false)
    })
  })
})
