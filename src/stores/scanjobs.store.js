// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/scanjobs`

export const useScanJobsStore = defineStore('scanjobs', () => {
  const scanjobs = ref([])
  const scanjob = ref(null)
  const loading = ref(false)
  const error = ref(null)
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

  async function getAll() {
    loading.value = true
    error.value = null
    try {
      scanjobs.value = await fetchWrapper.get(baseUrl)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function getById(id) {
    scanjob.value = { loading: true }
    loading.value = true
    error.value = null
    try {
      scanjob.value = await fetchWrapper.get(`${baseUrl}/${id}`)
      return scanjob.value
    } catch (err) {
      error.value = err
      scanjob.value = { error: err }
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
      scanjobs.value.push(result)
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
      const index = scanjobs.value.findIndex((job) => job.id === id)
      if (index !== -1) {
        scanjobs.value[index] = { ...scanjobs.value[index], ...scanJobData }
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
      scanjobs.value = scanjobs.value.filter((job) => job.id !== id)
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
    scanjobs,
    scanjob,
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
    getOps,
    ensureOpsLoaded
  }
})
