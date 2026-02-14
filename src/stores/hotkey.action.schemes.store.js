// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/hotkeyactionschemes`

export const useHotKeyActionSchemesStore = defineStore('hotKeyActionSchemes', () => {
  const hotKeyActionSchemes = ref([])
  const hotKeyActionScheme = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const isInitialized = ref(false)
  const ops = ref({
    actions: []
  })
  const opsLoading = ref(false)
  const opsError = ref(null)

  let opsInitialized = false
  let opsPromise = null
  let loadPromise = null

  async function getAll() {
    loading.value = true
    error.value = null
    try {
      hotKeyActionSchemes.value = await fetchWrapper.get(baseUrl)
      isInitialized.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function getById(id) {
    hotKeyActionScheme.value = { loading: true }
    loading.value = true
    error.value = null
    try {
      hotKeyActionScheme.value = await fetchWrapper.get(`${baseUrl}/${id}`)
      return hotKeyActionScheme.value
    } catch (err) {
      error.value = err
      hotKeyActionScheme.value = { error: err }
      return null
    } finally {
      loading.value = false
    }
  }

  async function create(hotKeyActionSchemeData) {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.post(baseUrl, hotKeyActionSchemeData)
      await getAll()
      return result
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function update(id, hotKeyActionSchemeData) {
    loading.value = true
    error.value = null
    try {
      const response = await fetchWrapper.put(`${baseUrl}/${id}`, hotKeyActionSchemeData)
      await getAll()
      return response
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
      await getAll()
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

  function getOpsEvent(list, value) {
    const num = Number(value)
    const match = list?.find((item) => Number(item.value) === num)
    return match ? match.event : String(value)
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

  async function ensureLoaded() {
    if (isInitialized.value) {
      return
    }

    if (!loadPromise) {
      loadPromise = getAll().finally(() => {
        loadPromise = null
      })
    }
    await loadPromise
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
    hotKeyActionSchemes,
    hotKeyActionScheme,
    loading,
    error,
    isInitialized,
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
    getOpsEvent
  }
})
