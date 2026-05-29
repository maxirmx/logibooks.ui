// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as signalR from '@microsoft/signalr'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { scanjobMonitorArea } from '@/helpers/scanjob.monitor.helpers.js'
import { useAuthStore } from '@/stores/auth.store.js'

const baseUrl = `${apiUrl}/scanjobs`
const scanJobMonitorHubUrl = `${apiUrl.replace(/\/api\/?$/i, '')}/hubs/scan-jobs`

export const useScanjobsStore = defineStore('scanjobs', () => {
  const items = ref([])
  const scanjob = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const totalCount = ref(0)
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
  let scanJobsListConnection = null
  let scanJobsListStartPromise = null
  let scanJobsListObserving = false
  let scanJobsListChangedHandler = null
  let scanJobsListClosedHandler = null


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

  function getMonitorAccessToken() {
    const authStore = useAuthStore()
    return authStore.user?.token ?? ''
  }

  function buildMonitorRequest(scanJobId, area, boxId, bucketIndex) {
    const request = {
      scanJobId: Number(scanJobId),
      area: Number(area)
    }

    if (request.area === scanjobMonitorArea.Box && boxId != null) {
      request.boxId = Number(boxId)
    }

    if (request.area === scanjobMonitorArea.Unassigned) {
      request.bucketIndex = Number(bucketIndex ?? 0)
    }

    return request
  }

  function createMonitorChannel({
    syncSnapshot = false,
    syncClosed = false,
    syncLoading = false,
    syncErrors = false
  } = {}) {
    let connection = null
    let startPromise = null
    let lastObserveRequest = null
    let snapshotHandler = null
    let closedHandler = null

    function ensureConnection() {
      if (connection) {
        return connection
      }

      connection = new signalR.HubConnectionBuilder()
        .withUrl(scanJobMonitorHubUrl, {
          accessTokenFactory: getMonitorAccessToken,
          withCredentials: false
        })
        .withAutomaticReconnect()
        .build()
      const currentConnection = connection

      currentConnection.on('ScanJobMonitorSnapshot', (snapshot) => {
        if (syncSnapshot) {
          monitorSnapshot.value = snapshot
        }
        if (snapshotHandler) {
          snapshotHandler(snapshot)
        }
      })

      currentConnection.on('ScanJobMonitorClosed', (scanJobId, status) => {
        if (syncClosed) {
          monitorClosed.value = { scanJobId, status }
        }
        if (closedHandler) {
          closedHandler(scanJobId, status)
        }
      })

      currentConnection.onclose((err) => {
        if (err && syncErrors) {
          monitorError.value = err
        }
      })

      currentConnection.onreconnected?.(() => {
        if (!lastObserveRequest) {
          return
        }
        currentConnection.invoke('ObserveScanJob', lastObserveRequest).catch((err) => {
          if (syncErrors) {
            monitorError.value = err
          }
        })
      })

      return currentConnection
    }

    async function ensureStarted() {
      const currentConnection = ensureConnection()

      if (currentConnection.state === signalR.HubConnectionState.Connected) {
        return currentConnection
      }

      if (!startPromise || startPromise.connection !== currentConnection) {
        const pendingStart = {
          connection: currentConnection,
          promise: null
        }
        pendingStart.promise = currentConnection.start().finally(() => {
          if (startPromise === pendingStart) {
            startPromise = null
          }
        })
        startPromise = pendingStart
      }

      const pendingStart = startPromise
      await pendingStart.promise
      return currentConnection
    }

    async function start(scanJobId, {
      area = scanjobMonitorArea.Boxes,
      boxId = null,
      bucketIndex = null,
      onSnapshot = null,
      onClosed = null
    } = {}) {
      if (syncLoading) {
        monitorLoading.value = true
      }
      if (syncErrors) {
        monitorError.value = null
      }
      if (syncClosed) {
        monitorClosed.value = null
      }
      snapshotHandler = onSnapshot
      closedHandler = onClosed

      try {
        lastObserveRequest = buildMonitorRequest(scanJobId, area, boxId, bucketIndex)
        const currentConnection = await ensureStarted()
        await currentConnection.invoke('ObserveScanJob', lastObserveRequest)
        return true
      } catch (err) {
        if (syncErrors) {
          monitorError.value = err
        }
        throw err
      } finally {
        if (syncLoading) {
          monitorLoading.value = false
        }
      }
    }

    async function clear() {
      lastObserveRequest = null

      if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
        return false
      }

      try {
        await connection.invoke('ClearScanJobMonitor')
        return true
      } catch (err) {
        if (syncErrors) {
          monitorError.value = err
        }
        throw err
      }
    }

    async function stop() {
      snapshotHandler = null
      closedHandler = null
      lastObserveRequest = null

      if (!connection) {
        return false
      }

      const currentConnection = connection
      connection = null
      if (startPromise?.connection === currentConnection) {
        startPromise = null
      }

      try {
        if (currentConnection.state === signalR.HubConnectionState.Connected) {
          await currentConnection.invoke('ClearScanJobMonitor')
        }
        await currentConnection.stop()
        return true
      } catch (err) {
        if (!connection) {
          connection = currentConnection
        }
        if (syncErrors) {
          monitorError.value = err
        }
        throw err
      }
    }

    return {
      start,
      clear,
      stop
    }
  }

  const monitorChannel = createMonitorChannel({
    syncSnapshot: true,
    syncClosed: true,
    syncLoading: true,
    syncErrors: true
  })
  const monitorAutoFollowChannel = createMonitorChannel()

  async function loadMonitorSnapshot(scanJobId, {
    area = scanjobMonitorArea.Boxes,
    boxId = null,
    bucketIndex = null
  } = {}) {
    monitorLoading.value = true
    monitorError.value = null
    monitorClosed.value = null

    try {
      const params = new URLSearchParams({ area: String(area) })
      if (Number(area) === scanjobMonitorArea.Box && boxId != null) {
        params.append('boxId', String(boxId))
      }
      if (Number(area) === scanjobMonitorArea.Unassigned) {
        params.append('bucketIndex', String(bucketIndex ?? 0))
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

  async function resolveMonitorTarget(scanJobId, number) {
    monitorError.value = null

    try {
      const params = new URLSearchParams({ number: String(number ?? '') })
      return await fetchWrapper.get(`${baseUrl}/${scanJobId}/monitor/resolve?${params.toString()}`)
    } catch (err) {
      monitorError.value = err
      throw err
    }
  }

  async function startMonitor(scanJobId, {
    area = scanjobMonitorArea.Boxes,
    boxId = null,
    bucketIndex = null,
    onSnapshot = null,
    onClosed = null
  } = {}) {
    return monitorChannel.start(scanJobId, {
      area,
      boxId,
      bucketIndex,
      onSnapshot,
      onClosed
    })
  }

  async function clearMonitor() {
    return monitorChannel.clear()
  }

  async function stopMonitor() {
    return monitorChannel.stop()
  }

  async function startMonitorAutoFollow(scanJobId, {
    onSnapshot = null,
    onClosed = null
  } = {}) {
    return monitorAutoFollowChannel.start(scanJobId, {
      area: scanjobMonitorArea.Boxes,
      onSnapshot,
      onClosed
    })
  }

  async function stopMonitorAutoFollow() {
    return monitorAutoFollowChannel.stop()
  }

  function ensureScanJobsListConnection() {
    if (scanJobsListConnection) {
      return scanJobsListConnection
    }

    scanJobsListConnection = new signalR.HubConnectionBuilder()
      .withUrl(scanJobMonitorHubUrl, {
        accessTokenFactory: getMonitorAccessToken,
        withCredentials: false
      })
      .withAutomaticReconnect()
      .build()

    scanJobsListConnection.on('ScanJobsChanged', () => {
      if (scanJobsListChangedHandler) {
        scanJobsListChangedHandler()
      }
    })

    scanJobsListConnection.onclose((err) => {
      if (scanJobsListClosedHandler) {
        scanJobsListClosedHandler(err)
      }
    })

    scanJobsListConnection.onreconnected?.(() => {
      if (!scanJobsListObserving) {
        return
      }
      scanJobsListConnection.invoke('ObserveScanJobs').catch((err) => {
        error.value = err
      })
    })

    return scanJobsListConnection
  }

  async function ensureScanJobsListStarted() {
    const connection = ensureScanJobsListConnection()

    if (connection.state === signalR.HubConnectionState.Connected) {
      return connection
    }

    if (!scanJobsListStartPromise) {
      scanJobsListStartPromise = connection.start().finally(() => {
        scanJobsListStartPromise = null
      })
    }

    await scanJobsListStartPromise
    return connection
  }

  async function startScanJobsListMonitor({
    onChanged = null,
    onClosed = null
  } = {}) {
    scanJobsListChangedHandler = onChanged
    scanJobsListClosedHandler = onClosed

    const connection = await ensureScanJobsListStarted()
    if (!scanJobsListObserving) {
      await connection.invoke('ObserveScanJobs')
      scanJobsListObserving = true
    }
    return true
  }

  async function stopScanJobsListMonitor() {
    scanJobsListChangedHandler = null
    scanJobsListClosedHandler = null

    if (!scanJobsListConnection) {
      return false
    }

    const connection = scanJobsListConnection

    try {
      if (connection.state === signalR.HubConnectionState.Connected && scanJobsListObserving) {
        await connection.invoke('ClearScanJobs')
      }
      await connection.stop()
      scanJobsListConnection = null
      scanJobsListObserving = false
      return true
    } catch (err) {
      error.value = err
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
    getOps,
    ensureOpsLoaded,
    getOpsLabel,
    loadMonitorSnapshot,
    resolveMonitorTarget,
    startMonitor,
    clearMonitor,
    stopMonitor,
    startMonitorAutoFollow,
    stopMonitorAutoFollow,
    startScanJobsListMonitor,
    stopScanJobsListMonitor,
    scanjobMonitorArea,
  }
})
