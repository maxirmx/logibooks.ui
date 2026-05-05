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

  async function setOrderFlag(orderId, flag, enabled) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.post(`${baseUrl}/orders/${orderId}/${enabled ? 'enable' : 'disable'}-for-${flag}`)
      await getOrders()
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function enableForExport(orderId) {
    await setOrderFlag(orderId, 'export', true)
  }

  async function disableForExport(orderId) {
    await setOrderFlag(orderId, 'export', false)
  }

  async function enableForImport(orderId) {
    await setOrderFlag(orderId, 'import', true)
  }

  async function disableForImport(orderId) {
    await setOrderFlag(orderId, 'import', false)
  }

  async function toggleEnabledForExport(id, enabled) {
    await setOrderFlag(id, 'export', enabled)
  }

  async function toggleEnabledForImport(id, enabled) {
    await setOrderFlag(id, 'import', enabled)
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
    enableForExport,
    disableForExport,
    enableForImport,
    disableForImport,
    ensureLoaded,
    toggleEnabledForExport,
    toggleEnabledForImport
  }
})
