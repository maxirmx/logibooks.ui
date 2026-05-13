// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as signalR from '@microsoft/signalr'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { useAuthStore } from '@/stores/auth.store.js'

const baseUrl = `${apiUrl}/scanjobs`
const scanJobMonitorHubUrl = `${apiUrl.replace(/\/api\/?$/i, '')}/hubs/scan-jobs`

const scanJobMonitorArea = {
  Boxes: 0,
  Box: 1
}

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
  const monitorSnapshot = ref(null)
  const monitorLoading = ref(false)
  const monitorError = ref(null)
  const monitorClosed = ref(null)

  let opsInitialized = false
  let opsPromise = null
  let monitorConnection = null
  let monitorStartPromise = null
  let monitorSnapshotHandler = null
  let monitorClosedHandler = null


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

      if (authStore.scanneditems_search) {
        queryParams.append('search', authStore.scanneditems_search)
      }

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

  function getMonitorAccessToken() {
    const authStore = useAuthStore()
    return authStore.user?.token ?? ''
  }

  function buildMonitorRequest(scanJobId, area, boxId) {
    const request = {
      scanJobId: Number(scanJobId),
      area: Number(area)
    }

    if (request.area === scanJobMonitorArea.Box && boxId != null) {
      request.boxId = Number(boxId)
    }

    return request
  }

  function ensureMonitorConnection() {
    if (monitorConnection) {
      return monitorConnection
    }

    monitorConnection = new signalR.HubConnectionBuilder()
      .withUrl(scanJobMonitorHubUrl, {
        accessTokenFactory: getMonitorAccessToken,
        withCredentials: false
      })
      .withAutomaticReconnect()
      .build()

    monitorConnection.on('ScanJobMonitorSnapshot', (snapshot) => {
      monitorSnapshot.value = snapshot
      if (monitorSnapshotHandler) {
        monitorSnapshotHandler(snapshot)
      }
    })

    monitorConnection.on('ScanJobMonitorClosed', (scanJobId, status) => {
      monitorClosed.value = { scanJobId, status }
      if (monitorClosedHandler) {
        monitorClosedHandler(scanJobId, status)
      }
    })

    monitorConnection.onclose((err) => {
      if (err) {
        monitorError.value = err
      }
    })

    return monitorConnection
  }

  async function ensureMonitorStarted() {
    const connection = ensureMonitorConnection()

    if (connection.state === signalR.HubConnectionState.Connected) {
      return connection
    }

    if (!monitorStartPromise) {
      monitorStartPromise = connection.start().finally(() => {
        monitorStartPromise = null
      })
    }

    await monitorStartPromise
    return connection
  }

  async function loadMonitorSnapshot(scanJobId, { area = scanJobMonitorArea.Boxes, boxId = null } = {}) {
    monitorLoading.value = true
    monitorError.value = null
    monitorClosed.value = null

    try {
      const params = new URLSearchParams({ area: String(area) })
      if (Number(area) === scanJobMonitorArea.Box && boxId != null) {
        params.append('boxId', String(boxId))
      }

      const snapshot = await fetchWrapper.get(`${baseUrl}/${scanJobId}/monitor?${params.toString()}`)
      monitorSnapshot.value = snapshot
      return snapshot
    } catch (err) {
      monitorError.value = err
      throw err
    } finally {
      monitorLoading.value = false
    }
  }

  async function startMonitor(scanJobId, {
    area = scanJobMonitorArea.Boxes,
    boxId = null,
    onSnapshot = null,
    onClosed = null
  } = {}) {
    monitorLoading.value = true
    monitorError.value = null
    monitorClosed.value = null
    monitorSnapshotHandler = onSnapshot
    monitorClosedHandler = onClosed

    try {
      const connection = await ensureMonitorStarted()
      await connection.invoke('ObserveScanJob', buildMonitorRequest(scanJobId, area, boxId))
      return true
    } catch (err) {
      monitorError.value = err
      throw err
    } finally {
      monitorLoading.value = false
    }
  }

  async function clearMonitor() {
    if (!monitorConnection || monitorConnection.state !== signalR.HubConnectionState.Connected) {
      return false
    }

    try {
      await monitorConnection.invoke('ClearScanJobMonitor')
      return true
    } catch (err) {
      monitorError.value = err
      throw err
    }
  }

  async function stopMonitor() {
    monitorSnapshotHandler = null
    monitorClosedHandler = null

    if (!monitorConnection) {
      return false
    }

    const connection = monitorConnection
    monitorConnection = null

    try {
      if (connection.state === signalR.HubConnectionState.Connected) {
        await connection.invoke('ClearScanJobMonitor')
      }
      await connection.stop()
      return true
    } catch (err) {
      monitorError.value = err
      throw err
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
    monitorSnapshot,
    monitorLoading,
    monitorError,
    monitorClosed,
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
    loadMonitorSnapshot,
    startMonitor,
    clearMonitor,
    stopMonitor,
    scanJobMonitorArea,
  }
})
