// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { useAuthStore } from '@/stores/auth.store.js'

const baseUrl = `${apiUrl}/scanjobs`

// Constants for scan job options
export const SCANJOB_TYPE_OPTIONS = [
  { value: 0, label: 'Посылка' },
  { value: 1, label: 'Мешок' }
]

export const SCANJOB_OPERATION_OPTIONS = [
  { value: 0, label: 'Входящее' },
  { value: 1, label: 'Исходящее' },
  { value: 2, label: 'Поиск' }
]

export const SCANJOB_MODE_OPTIONS = [
  { value: 0, label: 'Ручное' },
  { value: 1, label: 'Автоматическое' }
]

export const SCANJOB_STATUS_OPTIONS = [
  { value: 0, label: 'В работе' },
  { value: 1, label: 'Завершено' }
]

// Default values for scan job fields
export const SCANJOB_DEFAULT_TYPE = 0
export const SCANJOB_DEFAULT_OPERATION = 0
export const SCANJOB_DEFAULT_MODE = 0
export const SCANJOB_DEFAULT_STATUS = 0

export const useScanJobsStore = defineStore('scanjobs', () => {
  const scanJobs = ref([])
  const scanJob = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const totalCount = ref(0)
  const hasNextPage = ref(false)
  const hasPreviousPage = ref(false)

  async function getAll() {
    const authStore = useAuthStore()
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams({
        page: authStore.scanjobs_page.toString(),
        pageSize: authStore.scanjobs_per_page.toString(),
        sortBy: authStore.scanjobs_sort_by?.[0]?.key || 'id',
        sortOrder: authStore.scanjobs_sort_by?.[0]?.order || 'asc'
      })

      if (authStore.scanjobs_search) {
        queryParams.append('search', authStore.scanjobs_search)
      }

      const response = await fetchWrapper.get(`${baseUrl}?${queryParams.toString()}`)

      if (Array.isArray(response)) {
        scanJobs.value = response
        totalCount.value = response.length
        hasNextPage.value = false
        hasPreviousPage.value = false
      } else {
        scanJobs.value = response?.items || []
        totalCount.value = response?.pagination?.totalCount || 0
        hasNextPage.value = response?.pagination?.hasNextPage || false
        hasPreviousPage.value = response?.pagination?.hasPreviousPage || false
      }
    } catch (err) {
      error.value = err
      scanJobs.value = []
      totalCount.value = 0
      hasNextPage.value = false
      hasPreviousPage.value = false
    } finally {
      loading.value = false
    }
  }

  async function getById(id) {
    scanJob.value = { loading: true }
    loading.value = true
    error.value = null
    try {
      scanJob.value = await fetchWrapper.get(`${baseUrl}/${id}`)
      return scanJob.value
    } catch (err) {
      error.value = err
      scanJob.value = { error: err }
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
      scanJobs.value.push(result)
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
      const index = scanJobs.value.findIndex((job) => job.id === id)
      if (index !== -1) {
        scanJobs.value[index] = { ...scanJobs.value[index], ...scanJobData }
      }
      if (scanJob.value?.id === id) {
        scanJob.value = { ...scanJob.value, ...scanJobData }
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
      scanJobs.value = scanJobs.value.filter((job) => job.id !== id)
      return true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    scanJobs,
    scanJob,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    loading,
    error,
    getAll,
    getById,
    create,
    update,
    remove
  }
})
