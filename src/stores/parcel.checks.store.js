// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as signalR from '@microsoft/signalr'
import { apiUrl } from '@/helpers/config.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useParcelsStore } from '@/stores/parcels.store.js'

const parcelChecksHubUrl = `${apiUrl.replace(/\/api\/?$/i, '')}/hubs/parcel-checks`

export const useParcelChecksStore = defineStore('parcel-checks', () => {
  const error = ref(null)

  let connection = null
  let startPromise = null
  let currentRegisterId = null
  let updatesHandler = null
  let resyncHandler = null
  let lifecycleVersion = 0

  function accessToken() {
    return useAuthStore().user?.token ?? ''
  }

  function handleStatusesChanged(change) {
    if (Number(change?.registerId) !== currentRegisterId) return

    const accepted = useParcelsStore().applyParcelCheckStatusChanges(change)
    if (accepted.length > 0) {
      updatesHandler?.(change, accepted)
    }
  }

  async function resynchronize(version, activeConnection) {
    if (version !== lifecycleVersion || activeConnection !== connection || currentRegisterId == null) return

    useParcelsStore().resetLiveParcelCheckStatuses()
    try {
      await resyncHandler?.()
    } catch (err) {
      error.value = err
    }
  }

  function ensureConnection() {
    if (connection) return connection

    const activeConnection = new signalR.HubConnectionBuilder()
      .withUrl(parcelChecksHubUrl, {
        accessTokenFactory: accessToken,
        withCredentials: false
      })
      .withAutomaticReconnect()
      .build()

    activeConnection.on('ParcelCheckStatusesChanged', handleStatusesChanged)
    activeConnection.onclose((err) => {
      if (activeConnection === connection && err) {
        error.value = err
      }
    })
    activeConnection.onreconnected?.(async () => {
      if (activeConnection !== connection || currentRegisterId == null) return

      const version = lifecycleVersion
      try {
        await activeConnection.invoke('ObserveRegister', currentRegisterId)
        await resynchronize(version, activeConnection)
      } catch (err) {
        if (activeConnection === connection) {
          error.value = err
        }
      }
    })

    connection = activeConnection
    return activeConnection
  }

  async function ensureStarted(activeConnection) {
    if (activeConnection.state === signalR.HubConnectionState.Connected) return

    if (!startPromise || startPromise.connection !== activeConnection) {
      const pending = {
        connection: activeConnection,
        promise: activeConnection.start().finally(() => {
          if (startPromise === pending) startPromise = null
        })
      }
      startPromise = pending
    }

    await startPromise.promise
  }

  async function start(registerId, { onUpdates = null, onResync = null } = {}) {
    const normalizedRegisterId = Number(registerId)
    if (!Number.isInteger(normalizedRegisterId) || normalizedRegisterId <= 0) return false

    const version = ++lifecycleVersion
    currentRegisterId = normalizedRegisterId
    updatesHandler = onUpdates
    resyncHandler = onResync
    error.value = null
    useParcelsStore().resetLiveParcelCheckStatuses()

    const activeConnection = ensureConnection()
    try {
      await ensureStarted(activeConnection)
      if (version !== lifecycleVersion || activeConnection !== connection) return false

      await activeConnection.invoke('ObserveRegister', normalizedRegisterId)
      await resynchronize(version, activeConnection)
      return version === lifecycleVersion && activeConnection === connection
    } catch (err) {
      if (version === lifecycleVersion && activeConnection === connection) {
        error.value = err
      }
      return false
    }
  }

  async function stop() {
    ++lifecycleVersion
    currentRegisterId = null
    updatesHandler = null
    resyncHandler = null
    useParcelsStore().resetLiveParcelCheckStatuses()

    if (!connection) return false

    const activeConnection = connection
    connection = null
    if (startPromise?.connection === activeConnection) startPromise = null

    let stoppedCleanly = true
    if (activeConnection.state === signalR.HubConnectionState.Connected) {
      try {
        await activeConnection.invoke('ClearRegister')
      } catch (err) {
        error.value = err
        stoppedCleanly = false
      }
    }

    try {
      await activeConnection.stop()
    } catch (err) {
      error.value = err
      stoppedCleanly = false
    }

    return stoppedCleanly
  }

  return {
    error,
    start,
    stop
  }
})
