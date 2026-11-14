// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { useAuthStore } from '@/stores/auth.store.js'

const baseUrl = `${apiUrl}/customsreports`

export class SupersededReportsRequestError extends Error {
  constructor(cause) {
    super('Superseded customs reports request', { cause })
  }
}

export const useCustomsReportsStore = defineStore('customsreports', () => {
  const authStore = useAuthStore()
  const accountVersion = ref(0)
  const reports = ref([])
  const decisionSources = ref(null)
  const decisions = ref([])
  const reportsLoading = ref(false)
  const decisionsLoading = ref(false)
  const pendingReportMutations = ref(0)
  const loading = computed(() => reportsLoading.value || decisionsLoading.value || pendingReportMutations.value > 0)
  const error = ref(null)
  const reportsTotalCount = ref(0)
  const reportsHasNextPage = ref(false)
  const reportsHasPreviousPage = ref(false)
  const decisionsTotalCount = ref(0)
  const decisionsHasNextPage = ref(false)
  const decisionsHasPreviousPage = ref(false)
  const decisionsColumns = ref([])
  const decisionsCustomsProcedure = ref(null)
  let opsRequest = null
  let latestReportsRequestId = 0
  let latestDecisionsRequestId = 0

  function clearReports() {
    reports.value = []
    reportsTotalCount.value = 0
    reportsHasNextPage.value = false
    reportsHasPreviousPage.value = false
  }

  function clearDecisions() {
    decisions.value = []
    decisionsTotalCount.value = 0
    decisionsHasNextPage.value = false
    decisionsHasPreviousPage.value = false
    decisionsColumns.value = []
    decisionsCustomsProcedure.value = null
  }

  function resetDecisions() {
    latestDecisionsRequestId++
    clearDecisions()
    decisionsLoading.value = false
  }

  watch(() => authStore.user?.id, () => {
    accountVersion.value++
    decisionSources.value = null
    opsRequest = null
    latestReportsRequestId++
    clearReports()
    resetDecisions()
    reportsLoading.value = false
    pendingReportMutations.value = 0
    error.value = null
  }, { flush: 'sync' })

  async function fetchDecisionSources() {
    const response = await fetchWrapper.get(`${baseUrl}/ops`)
    const sources = response?.decisionSources
    if (!Array.isArray(sources) || sources.length === 0 || sources.some(source =>
      !Number.isInteger(source?.value) || typeof source.name !== 'string' || !source.name.trim()
    )) {
      throw new Error('Сервер вернул некорректный справочник источников решений')
    }
    return sources
  }

  function ensureOpsLoaded() {
    if (decisionSources.value !== null) return Promise.resolve()
    if (!opsRequest) {
      const version = accountVersion.value
      opsRequest = fetchDecisionSources()
        .then(sources => {
          if (version === accountVersion.value) decisionSources.value = sources
        })
        .finally(() => {
          if (version === accountVersion.value) opsRequest = null
        })
    }
    return opsRequest
  }

  async function upload(file) {
    const version = accountVersion.value
    pendingReportMutations.value++
    error.value = null
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetchWrapper.postFile(`${baseUrl}/upload-report`, formData)
      return response
    } catch (err) {
      if (version === accountVersion.value) error.value = err
      throw err
    } finally {
      if (version === accountVersion.value) pendingReportMutations.value--
    }
  }

  async function getReports() {
    const requestId = ++latestReportsRequestId
    reportsLoading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams({
        page: authStore.uploadcustomsreports_page.toString(),
        pageSize: authStore.uploadcustomsreports_per_page.toString(),
        sortBy: authStore.uploadcustomsreports_sort_by?.[0]?.key || 'id',
        sortOrder: authStore.uploadcustomsreports_sort_by?.[0]?.order || 'desc'
      })

      if (authStore.uploadcustomsreports_search) {
        queryParams.append('search', authStore.uploadcustomsreports_search)
      }

      const response = await fetchWrapper.get(`${baseUrl}?${queryParams.toString()}`)

      if (requestId !== latestReportsRequestId) return

      reports.value = response?.items || []
      reportsTotalCount.value = response?.pagination?.totalCount || 0
      reportsHasNextPage.value = response?.pagination?.hasNextPage || false
      reportsHasPreviousPage.value = response?.pagination?.hasPreviousPage || false
    } catch (err) {
      if (requestId !== latestReportsRequestId) throw new SupersededReportsRequestError(err)

      error.value = err
      clearReports()
      throw err
    } finally {
      if (requestId === latestReportsRequestId) reportsLoading.value = false
    }
  }

  async function remove(id) {
    const version = accountVersion.value
    pendingReportMutations.value++
    error.value = null
    try {
      await fetchWrapper.delete(`${baseUrl}/${id}`)
    } catch (err) {
      if (version === accountVersion.value) error.value = err
      throw err
    } finally {
      if (version === accountVersion.value) pendingReportMutations.value--
    }
  }

  async function getDecisions(reportId) {
    const requestId = ++latestDecisionsRequestId
    decisionsLoading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams({
        page: authStore.customsdecisions_page.toString(),
        pageSize: authStore.customsdecisions_per_page.toString(),
        sortBy: authStore.customsdecisions_sort_by?.[0]?.key || 'id',
        sortOrder: authStore.customsdecisions_sort_by?.[0]?.order || 'asc'
      })

      if (authStore.customsdecisions_search) {
        queryParams.append('search', authStore.customsdecisions_search)
      }

      const response = await fetchWrapper.get(
        `${baseUrl}/${reportId}/decisions?${queryParams.toString()}`
      )

      if (requestId !== latestDecisionsRequestId) return

      decisions.value = response?.items || []
      decisionsTotalCount.value = response?.pagination?.totalCount || 0
      decisionsHasNextPage.value = response?.pagination?.hasNextPage || false
      decisionsHasPreviousPage.value = response?.pagination?.hasPreviousPage || false
      decisionsColumns.value = Array.isArray(response?.columns) ? response.columns : []
      decisionsCustomsProcedure.value = response?.customsProcedure || null
      return response
    } catch (err) {
      if (requestId !== latestDecisionsRequestId) throw err

      error.value = err
      clearDecisions()
      throw err
    } finally {
      if (requestId === latestDecisionsRequestId) decisionsLoading.value = false
    }
  }

  return {
    accountVersion,
    decisionSources,
    ensureOpsLoaded,
    reports,
    decisions,
    reportsTotalCount,
    reportsHasNextPage,
    reportsHasPreviousPage,
    decisionsTotalCount,
    decisionsHasNextPage,
    decisionsHasPreviousPage,
    decisionsColumns,
    decisionsCustomsProcedure,
    decisionsLoading,
    loading,
    error,
    upload,
    getReports,
    remove,
    getDecisions,
    resetDecisions
  }
})
