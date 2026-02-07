// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/warehouses`

export const useWarehousesStore = defineStore('warehouses', () => {
  const warehouses = ref([])
  const warehouse = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const ops = ref({
    types: [],
    zones: []
  })
  const opsLoading = ref(false)
  const opsError = ref(null)

  let initialized = false
  let opsInitialized = false
  let opsPromise = null

  async function getAll() {
    loading.value = true
    error.value = null
    try {
      warehouses.value = await fetchWrapper.get(baseUrl)
      initialized = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function getById(id) {
    loading.value = true
    error.value = null
    try {
      warehouse.value = await fetchWrapper.get(`${baseUrl}/${id}`)
      return warehouse.value
    } catch (err) {
      error.value = err
      return null
    } finally {
      loading.value = false
    }
  }

  async function create(warehouseData) {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.post(baseUrl, warehouseData)
      warehouses.value.push(result)
      return result
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function update(id, warehouseData) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.put(`${baseUrl}/${id}`, warehouseData)
      const index = warehouses.value.findIndex(w => w.id === id)
      if (index !== -1) {
        warehouses.value[index] = { ...warehouses.value[index], ...warehouseData }
      }
      if (warehouse.value?.id === id) {
        warehouse.value = { ...warehouse.value, ...warehouseData }
      }
      return true
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
      warehouses.value = warehouses.value.filter(w => w.id !== id)
      return true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  function getOpsLabel(list, value) {
    const num = Number(value)
    const match = list?.find((item) => Number(item.value) === num)
    return match ? match.name : String(value)
  }

  async function ensureLoaded() {
    if (!initialized && !loading.value) {
      await getAll()
    }
  }

  async function getOps() {
    opsLoading.value = true
    opsError.value = null
    try {
      ops.value = await fetchWrapper.get(`${baseUrl}/ops`)
      opsInitialized = true
      return ops.value
    } catch (err) {
      opsError.value = err
      return null
    } finally {
      opsLoading.value = false
    }
  }

  async function ensureOpsLoaded() {
    if (opsInitialized) {
      return ops.value
    }

    if (!opsPromise) {
      opsPromise = getOps().finally(() => {
        opsPromise = null
      })
    }
    return opsPromise
  }

  function getWarehouseName(warehouseId) {
    const num = Number(warehouseId)
    const match = warehouses.value?.find((warehouse) => warehouse.id === num)
    return match ? match.name : String(warehouseId)
  }

  return {
    warehouses,
    warehouse,
    loading,
    error,
    ops,
    opsLoading,
    opsError,
    getAll,
    getById,
    create,
    update,
    remove,
    ensureLoaded,
    getOps,
    ensureOpsLoaded,
    getOpsLabel,
    getWarehouseName
  }
})
