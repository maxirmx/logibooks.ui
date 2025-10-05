// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotificationsStore } from '@/stores/notifications.store.js'
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

const mockNotifications = [
  {
    id: 1,
    title: 'New parcel registered',
    message: 'Parcel 12345 has been registered',
    isRead: false,
    createdAt: '2024-05-01T10:00:00Z'
  },
  {
    id: 2,
    title: 'Parcel departed',
    message: 'Parcel 67890 has departed the warehouse',
    isRead: true,
    createdAt: '2024-05-02T12:00:00Z'
  }
]

const mockNotification = mockNotifications[0]

describe('notifications store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with default values', () => {
    const store = useNotificationsStore()
    expect(store.notifications).toEqual([])
    expect(store.notification).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  describe('getAll', () => {
    it('fetches notifications successfully', async () => {
      fetchWrapper.get.mockResolvedValue(mockNotifications)
      const store = useNotificationsStore()

      await store.getAll()

      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/notifications`)
      expect(store.notifications).toEqual(mockNotifications)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles fetch error', async () => {
      const error = new Error('Network error')
      fetchWrapper.get.mockRejectedValue(error)
      const store = useNotificationsStore()

      await store.getAll()

      expect(store.notifications).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('getById', () => {
    it('fetches notification by id successfully', async () => {
      fetchWrapper.get.mockResolvedValue(mockNotification)
      const store = useNotificationsStore()

      const result = await store.getById(1)

      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/notifications/1`)
      expect(store.notification).toEqual(mockNotification)
      expect(result).toEqual(mockNotification)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles fetch error and returns null', async () => {
      const error = new Error('Not found')
      fetchWrapper.get.mockRejectedValue(error)
      const store = useNotificationsStore()

      const result = await store.getById(999)

      expect(result).toBeNull()
      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('create', () => {
    it('creates notification successfully', async () => {
      const newNotification = { ...mockNotification, id: 3 }
      fetchWrapper.post.mockResolvedValue(newNotification)
      const store = useNotificationsStore()
      store.notifications = [...mockNotifications]

      const result = await store.create(mockNotification)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/notifications`, mockNotification)
      expect(store.notifications).toHaveLength(3)
      expect(store.notifications[2]).toEqual(newNotification)
      expect(result).toEqual(newNotification)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles create error', async () => {
      const error = new Error('Conflict')
      fetchWrapper.post.mockRejectedValue(error)
      const store = useNotificationsStore()

      await expect(store.create(mockNotification)).rejects.toThrow('Conflict')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('update', () => {
    it('updates notification successfully', async () => {
      fetchWrapper.put.mockResolvedValue({})
      const store = useNotificationsStore()
      store.notifications = [...mockNotifications]

      const updateData = { title: 'Updated notification', isRead: true }
      const result = await store.update(1, updateData)

      expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/notifications/1`, updateData)
      expect(store.notifications[0]).toEqual({ ...mockNotifications[0], ...updateData })
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles update error', async () => {
      const error = new Error('Not found')
      fetchWrapper.put.mockRejectedValue(error)
      const store = useNotificationsStore()

      await expect(store.update(999, {})).rejects.toThrow('Not found')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('remove', () => {
    it('removes notification successfully', async () => {
      fetchWrapper.delete.mockResolvedValue({})
      const store = useNotificationsStore()
      store.notifications = [...mockNotifications]

      const result = await store.remove(1)

      expect(fetchWrapper.delete).toHaveBeenCalledWith(`${apiUrl}/notifications/1`)
      expect(store.notifications).not.toContain(mockNotifications[0])
      expect(store.notifications.length).toBe(1)
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles remove error', async () => {
      const error = new Error('Conflict')
      fetchWrapper.delete.mockRejectedValue(error)
      const store = useNotificationsStore()

      await expect(store.remove(1)).rejects.toThrow('Conflict')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

})
