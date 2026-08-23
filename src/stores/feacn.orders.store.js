// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/feacnorders`

export const useFeacnOrdersStore = defineStore('feacn.orders', () => {
  const orders = ref([])
  const order = ref(null)
  const prefixes = ref([])
  const loading = ref(false)
  const error = ref(null)
  const isInitialized = ref(false)

  async function getOrders() {
    loading.value = true
    error.value = null
    try {
      orders.value = await fetchWrapper.get(`${baseUrl}/orders`)
      isInitialized.value = true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function ensureLoaded() {
    if (!isInitialized.value && !loading.value) {
      await getOrders()
    }
  }

  async function getPrefixes(orderId) {
    if (!orderId) {
      prefixes.value = []
      return
    }
    loading.value = true
    error.value = null
    try {
      prefixes.value = await fetchWrapper.get(`${baseUrl}/orders/${orderId}/prefixes`)
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getById(orderId) {
    loading.value = true
    error.value = null
    try {
      const response = await fetchWrapper.get(`${baseUrl}/orders/${orderId}`)
      order.value = response
      return response
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function update() {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.post(`${baseUrl}/update`)
      // Reload orders after update
      await getOrders()
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateScopes(orderId, scopes) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.put(`${baseUrl}/orders/${orderId}/scopes`, scopes)
      await getOrders()
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    orders,
    order,
    prefixes,
    loading,
    error,
    isInitialized,
    getOrders,
    getById,
    getPrefixes,
    update,
    updateScopes,
    ensureLoaded
  }
})
