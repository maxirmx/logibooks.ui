// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { useAuthStore } from '@/stores/auth.store.js'

const baseUrl = `${apiUrl}/scanjobs`

export const useScanjobsStore = defineStore('scanjobs', () => {
  const items = ref([])
  const scanjob = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const totalCount = ref(0)
  const scannedItems = ref([])
  const scannedItemsLoading = ref(false)
  const scannedItemsError = ref(null)
  const scannedItemsTotalCount = ref(0)
  const ops = ref({
    types: [],
    operations: [],
    modes: [],
    statuses: []
  })
  const opsLoading = ref(false)
  const opsError = ref(null)

  let opsInitialized = false
  let opsPromise = null


  function getOpsLabel(list, value) {
    const num = Number(value)
    const match = list?.find((item) => Number(item.value) === num)
    return match ? match.name : String(value)
  }

  async function getAll() {
    const authStore = useAuthStore()
    
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams({
        page: authStore.scanjobs_page.toString(),
        pageSize: authStore.scanjobs_per_page.toString(),
        sortBy: authStore.scanjobs_sort_by?.[0]?.key || 'id',
        sortOrder: authStore.scanjobs_sort_by?.[0]?.order || 'desc'
      })

      if (authStore.scanjobs_search) {
        queryParams.append('search', authStore.scanjobs_search)
      }

      const response = await fetchWrapper.get(`${baseUrl}?${queryParams.toString()}`)

      // API format with pagination metadata
      items.value = response.items || []
      totalCount.value = response.pagination?.totalCount || 0
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  function appendFilter(queryParams, key, value) {
    if (value === null || value === undefined) return
    if (typeof value === 'string' && value.trim() === '') return
    queryParams.append(key, String(value))
  }

  async function getScannedItems(scanJobId) {
    const authStore = useAuthStore()

    scannedItemsLoading.value = true
    scannedItemsError.value = null
    try {
      const queryParams = new URLSearchParams({
        page: authStore.scanneditems_page.toString(),
        pageSize: authStore.scanneditems_per_page.toString(),
        sortBy: authStore.scanneditems_sort_by?.[0]?.key || 'scanTime',
        sortOrder: authStore.scanneditems_sort_by?.[0]?.order || 'desc'
      })

      appendFilter(queryParams, 'id', authStore.scanneditems_id)
      appendFilter(queryParams, 'code', authStore.scanneditems_code)
      appendFilter(queryParams, 'scanTimeFrom', authStore.scanneditems_scan_time_from)
      appendFilter(queryParams, 'scanTimeTo', authStore.scanneditems_scan_time_to)
      appendFilter(queryParams, 'userName', authStore.scanneditems_user_name)
      appendFilter(queryParams, 'number', authStore.scanneditems_number)

      const response = await fetchWrapper.get(
        `${baseUrl}/${scanJobId}/scanned-items?${queryParams.toString()}`
      )

      scannedItems.value = response.items || []
      scannedItemsTotalCount.value = response.pagination?.totalCount || 0
    } catch (err) {
      scannedItemsError.value = err
    } finally {
      scannedItemsLoading.value = false
    }
  }

  async function getById(id) {
    loading.value = true
    error.value = null
    try {
      scanjob.value = await fetchWrapper.get(`${baseUrl}/${id}`)
      return scanjob.value
    } catch (err) {
      error.value = err
      return null
    } finally {
      loading.value = false
    }
  }

  async function create(scanJobData) {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.post(baseUrl, scanJobData)
      items.value.push(result)
      return result
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function update(id, scanJobData) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.put(`${baseUrl}/${id}`, scanJobData)
      const index = items.value.findIndex((job) => job.id === id)
      if (index !== -1) {
        items.value[index] = { ...items.value[index], ...scanJobData }
      }
      if (scanjob.value?.id === id) {
        scanjob.value = { ...scanjob.value, ...scanJobData }
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
      items.value = items.value.filter((job) => job.id !== id)
      return true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function start(id) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.post(`${baseUrl}/${id}/start`)
      return true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function pause(id) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.post(`${baseUrl}/${id}/pause`)
      return true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }
  async function finish(id) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.post(`${baseUrl}/${id}/finish`)
      return true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
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

  return {
    items,
    scanjob,
    loading,
    error,
    totalCount,
    scannedItems,
    scannedItemsLoading,
    scannedItemsError,
    scannedItemsTotalCount,
    ops,
    opsLoading,
    opsError,
    getAll,
    getById,
    create,
    update,
    remove,
    start,
    pause,
    finish,
    getScannedItems,
    getOps,
    ensureOpsLoaded,
    getOpsLabel,
  }
})
