// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/notifications`

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref([])
  const notification = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function getAll() {
    loading.value = true
    error.value = null
    try {
      notifications.value = await fetchWrapper.get(baseUrl)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function getById(id) {
    notification.value = { loading: true }
    loading.value = true
    error.value = null
    try {
      notification.value = await fetchWrapper.get(`${baseUrl}/${id}`)
      return notification.value
    } catch (err) {
      error.value = err
      notification.value = { error: err }
      return null
    } finally {
      loading.value = false
    }
  }

  async function create(notificationData) {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.post(baseUrl, notificationData)
      notifications.value.push(result)
      return result
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function update(id, notificationData) {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.put(`${baseUrl}/${id}`, notificationData)
      const index = notifications.value.findIndex(n => n.id === id)
      const fallbackNotification = index !== -1 ? notifications.value[index] : null
      const updatedNotification =
        result && Object.keys(result).length
          ? result
          : fallbackNotification
            ? { ...fallbackNotification, ...notificationData }
            : { id, ...notificationData }
      if (index !== -1) {
        notifications.value[index] = updatedNotification
      }
      if (notification.value && notification.value.id === id) {
        notification.value = updatedNotification
      }
      return updatedNotification
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function remove(id) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.delete(`${baseUrl}/${id}`)
      notifications.value = notifications.value.filter(n => n.id !== id)
      return true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    notifications,
    notification,
    loading,
    error,
    getAll,
    getById,
    create,
    update,
    remove
  }
})
