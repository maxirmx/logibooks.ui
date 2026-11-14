// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { computed, reactive, readonly, ref, watch } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { dispatchDecReportUploadedEvent } from '@/helpers/dec.report.events.js'
import { useCustomsReportPolling } from '@/composables/useCustomsReportPolling.js'
import { reportError } from '@/helpers/error.helpers.js'

const baseUrl = `${apiUrl}/customsreports`

export const useCustomsReportsStore = defineStore('customsreports', () => {
  const ops = ref(null)
  let opsRequest
  const reports = ref([])
  const reportRows = ref([])
  const reportsLoading = ref(false)
  const rowsLoading = ref(false)
  const pendingUploads = ref(0)
  const pendingDeletes = ref(0)
  const loading = computed(() => reportsLoading.value || rowsLoading.value || pendingUploads.value > 0 || pendingDeletes.value > 0)
  let reportsRequest = 0
  let rowsRequest = 0
  const observedReports = reactive(new Set())
  const notifiedStatusFailures = new Set()
  const statusRequests = new Map()
  const statusViews = new Set()
  const authStore = useAuthStore()
  const alerts = useAlertStore()
  const accountVersion = ref(0)

  useCustomsReportPolling(computed(() => observedReports.size > 0), async () => {
    const results = await Promise.allSettled([...observedReports].map(getReportStatus))
    const failure = results.find(result => result.status === 'rejected')
    if (failure) throw failure.reason
  }, error => reportError(error, { context: 'background customs report status' }))
  const error = ref(null)
  const reportsTotalCount = ref(0)
  const reportsHasNextPage = ref(false)
  const reportsHasPreviousPage = ref(false)
  const reportRowsTotalCount = ref(0)
  const reportRowsHasNextPage = ref(false)
  const reportRowsHasPreviousPage = ref(false)
  const reportRowsColumns = ref([])
  const reportRowsCustomsProcedure = ref(null)

  watch(() => authStore.user?.id, () => {
    observedReports.clear()
    notifiedStatusFailures.clear()
    statusRequests.clear()
    statusViews.clear()
    setReports()
    resetReportRows()
    reportsLoading.value = false
    pendingUploads.value = 0
    pendingDeletes.value = 0
    error.value = null
    accountVersion.value++
  }, { flush: 'sync' })

  function ensureOpsLoaded() {
    if (ops.value) return Promise.resolve(ops.value)
    if (!opsRequest) {
      opsRequest = fetchWrapper.get(baseUrl + '/ops').then(metadata => {
        if (!metadata?.stages || !Array.isArray(metadata.uploadExtensions) ||
            !Array.isArray(metadata.nonRetryableStatusCodes) || !metadata.errorLabels) {
          throw new Error('Не удалось загрузить настройки отчётов о выпуске')
        }
        ops.value = metadata
        return metadata
      }).finally(() => { opsRequest = null })
    }
    return opsRequest
  }

  function reportStage(report) {
    return ops.value?.stages[report?.stage]
  }

  function canRetryReportStatus(error) {
    return !ops.value?.nonRetryableStatusCodes.includes(error?.status)
  }

  function displayReportStatus(id, showStatus) {
    const view = { id, showStatus }
    statusViews.add(view)
    return () => statusViews.delete(view)
  }

  function observeReport(report, version, trackActive = true) {
    if (version !== accountVersion.value || !report) return
    const stage = reportStage(report)
    const active = stage?.isActive
    if (active && !trackActive) return

    const wasObserved = observedReports.has(report.id)
    if (active) observedReports.add(report.id)
    else {
      observedReports.delete(report.id)
      notifiedStatusFailures.delete(report.id)
    }

    const view = [...statusViews].find(owner => owner.id === report.id)
    if (trackActive || wasObserved) view?.showStatus(report)
    if (active || !wasObserved) return

    if (stage?.isCompleted) {
      dispatchDecReportUploadedEvent({ reportId: report.id, fileName: report.fileName })
    } else if (!view && stage?.isFailed) {
      alerts.error(report.errMsg, {
        title: 'Отчёт №' + report.id,
        fallback: 'Не удалось обработать отчёт о выпуске'
      })
    }
  }

  async function upload(file) {
    const version = accountVersion.value
    pendingUploads.value++
    error.value = null
    try {
      await ensureOpsLoaded()
      if (version !== accountVersion.value) return
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetchWrapper.postFile(`${baseUrl}/upload-report`, formData)
      if (version !== accountVersion.value) return
      observeReport(response, version)
      return response
    } catch (err) {
      if (version === accountVersion.value) error.value = err
      throw err
    } finally {
      if (version === accountVersion.value) pendingUploads.value--
    }
  }

  async function getReports(background = false) {
    const version = accountVersion.value
    const request = ++reportsRequest
    const isCurrent = () => version === accountVersion.value && request === reportsRequest
    if (!background) {
      reportsLoading.value = true
      error.value = null
    }
    try {
      await ensureOpsLoaded()
      if (version !== accountVersion.value) return
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

      if (!isCurrent()) return
      setReports(response)
      reports.value.forEach(report => observeReport(report, version, false))
    } catch (err) {
      if (isCurrent() && !background) {
        error.value = err
        setReports()
      }
      throw err
    } finally {
      if (isCurrent()) reportsLoading.value = false
    }
  }

  function setReports(response) {
    reports.value = response?.items || []
    reportsTotalCount.value = response?.pagination?.totalCount || 0
    reportsHasNextPage.value = response?.pagination?.hasNextPage || false
    reportsHasPreviousPage.value = response?.pagination?.hasPreviousPage || false
  }

  async function remove(id) {
    const version = accountVersion.value
    pendingDeletes.value++
    error.value = null
    try {
      await fetchWrapper.delete(`${baseUrl}/${id}`)
      if (version === accountVersion.value) await getReports()
    } catch (err) {
      if (version === accountVersion.value) error.value = err
      throw err
    } finally {
      if (version === accountVersion.value) pendingDeletes.value--
    }
  }

  async function getReportRows(reportId) {
    const request = ++rowsRequest
    rowsLoading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams({
        page: authStore.customsreportrows_page.toString(),
        pageSize: authStore.customsreportrows_per_page.toString(),
        sortBy: authStore.customsreportrows_sort_by?.[0]?.key || 'id',
        sortOrder: authStore.customsreportrows_sort_by?.[0]?.order || 'asc'
      })

      if (authStore.customsreportrows_search) {
        queryParams.append('search', authStore.customsreportrows_search)
      }

      const response = await fetchWrapper.get(
        `${baseUrl}/${reportId}/rows?${queryParams.toString()}`
      )

      if (request !== rowsRequest) return
      setReportRows(response)
    } catch (err) {
      if (request === rowsRequest) {
        error.value = err
        setReportRows()
      }
      throw err
    } finally {
      if (request === rowsRequest) rowsLoading.value = false
    }
  }

  function setReportRows(response) {
    reportRows.value = response?.items || []
    reportRowsTotalCount.value = response?.pagination?.totalCount || 0
    reportRowsHasNextPage.value = response?.pagination?.hasNextPage || false
    reportRowsHasPreviousPage.value = response?.pagination?.hasPreviousPage || false
    reportRowsColumns.value = Array.isArray(response?.columns) ? response.columns : []
    reportRowsCustomsProcedure.value = response?.customsProcedure || null
  }

  function resetReportRows() {
    // Invalidate pending reads immediately, even when the replacement load is queued.
    rowsRequest++
    rowsLoading.value = false
    setReportRows()
  }

  function getReportStatus(id) {
    const existing = statusRequests.get(id)
    if (existing) return existing

    const version = accountVersion.value
    const request = ensureOpsLoaded()
      .then(() => {
        if (version === accountVersion.value) return fetchWrapper.get(`${baseUrl}/${id}`)
      })
      .then(report => {
        if (version !== accountVersion.value) return
        notifiedStatusFailures.delete(id)
        observeReport(report, version)
        return report
      })
      .catch(error => {
        if (version === accountVersion.value) handleTrackingFailure(id, error)
        throw error
      })
      .finally(() => {
        if (statusRequests.get(id) === request) statusRequests.delete(id)
      })
    statusRequests.set(id, request)
    return request
  }

  function handleTrackingFailure(id, error) {
    if (!observedReports.has(id)) return
    if (!canRetryReportStatus(error)) observedReports.delete(id)
    if ([...statusViews].some(view => view.id === id) || !claimReportStatusFailure(id, error)) return

    alerts.error(error, {
      title: 'Отчёт №' + id,
      fallback: 'Не удалось получить состояние отчёта о выпуске'
    })
  }

  function claimReportStatusFailure(id, error) {
    if (!canRetryReportStatus(error)) {
      notifiedStatusFailures.delete(id)
      return true
    }
    if (notifiedStatusFailures.has(id)) return false
    notifiedStatusFailures.add(id)
    return true
  }

  return {
    accountVersion: readonly(accountVersion),
    ops,
    reportStage,
    canRetryReportStatus,
    reports,
    reportRows,
    reportsTotalCount,
    reportsHasNextPage,
    reportsHasPreviousPage,
    reportRowsTotalCount,
    reportRowsHasNextPage,
    reportRowsHasPreviousPage,
    reportRowsColumns,
    reportRowsCustomsProcedure,
    loading,
    error,
    upload,
    getReports,
    remove,
    getReportRows,
    resetReportRows,
    getReportStatus,
    claimReportStatusFailure,
    displayReportStatus
  }
})
