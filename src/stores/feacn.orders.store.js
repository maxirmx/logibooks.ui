// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/feacnorders`

export const useFeacnOrdersStore = defineStore('feacn.orders', () => {
  const orders = ref([])
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
    } finally {
      loading.value = false
    }
  }

  async function enable(orderId) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.post(`${baseUrl}/orders/${orderId}/enable`)
      await getOrders()
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function disable(orderId) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.post(`${baseUrl}/orders/${orderId}/disable`)
      await getOrders()
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }
  async function toggleEnabled(id, en) {
    try {
      loading.value = true
      if (en) {
        await enable(id)
      } else {
        await disable(id)
      }
    } finally {
    loading.value = false
    await getOrders()
    loading.value = false
    }
  }
 
  return { 
    orders, 
    prefixes, 
    loading, 
    error, 
    isInitialized, 
    getOrders, 
    getPrefixes,
    update,
    enable,
    disable,
    ensureLoaded,
    toggleEnabled
  }
})
