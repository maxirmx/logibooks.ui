// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { useAuthStore } from '@/stores/auth.store.js'

const baseUrl = `${apiUrl}/customsreports`

export const useCustomsReportsStore = defineStore('customsreports', () => {
  const authStore = useAuthStore()
  const accountVersion = ref(0)
  const reports = ref([])
  const reportRows = ref([])
  const loading = ref(false)
  const error = ref(null)
  const reportsTotalCount = ref(0)
  const reportsHasNextPage = ref(false)
  const reportsHasPreviousPage = ref(false)
  const reportRowsTotalCount = ref(0)
  const reportRowsHasNextPage = ref(false)
  const reportRowsHasPreviousPage = ref(false)
  const reportRowsColumns = ref([])
  const reportRowsCustomsProcedure = ref(null)

  function clearReports() {
    reports.value = []
    reportsTotalCount.value = 0
    reportsHasNextPage.value = false
    reportsHasPreviousPage.value = false
  }

  function clearReportRows() {
    reportRows.value = []
    reportRowsTotalCount.value = 0
    reportRowsHasNextPage.value = false
    reportRowsHasPreviousPage.value = false
    reportRowsColumns.value = []
    reportRowsCustomsProcedure.value = null
  }

  watch(() => authStore.user?.id, () => {
    accountVersion.value++
    clearReports()
    clearReportRows()
    loading.value = false
    error.value = null
  }, { flush: 'sync' })

  async function upload(file) {
    const version = accountVersion.value
    loading.value = true
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
      if (version === accountVersion.value) loading.value = false
    }
  }

  async function getReports() {
    const version = accountVersion.value
    loading.value = true
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

      if (version !== accountVersion.value) return

      reports.value = response?.items || []
      reportsTotalCount.value = response?.pagination?.totalCount || 0
      reportsHasNextPage.value = response?.pagination?.hasNextPage || false
      reportsHasPreviousPage.value = response?.pagination?.hasPreviousPage || false
    } catch (err) {
      if (version === accountVersion.value) {
        error.value = err
        clearReports()
      }
      throw err
    } finally {
      if (version === accountVersion.value) loading.value = false
    }
  }

  async function remove(id) {
    const version = accountVersion.value
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.delete(`${baseUrl}/${id}`)
      if (version === accountVersion.value) await getReports()
    } catch (err) {
      if (version === accountVersion.value) error.value = err
      throw err
    } finally {
      if (version === accountVersion.value) loading.value = false
    }
  }

  async function getReportRows(reportId) {
    const version = accountVersion.value
    loading.value = true
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

      if (version !== accountVersion.value) return

      reportRows.value = response?.items || []
      reportRowsTotalCount.value = response?.pagination?.totalCount || 0
      reportRowsHasNextPage.value = response?.pagination?.hasNextPage || false
      reportRowsHasPreviousPage.value = response?.pagination?.hasPreviousPage || false
      reportRowsColumns.value = Array.isArray(response?.columns) ? response.columns : []
      reportRowsCustomsProcedure.value = response?.customsProcedure || null
      return response
    } catch (err) {
      if (version !== accountVersion.value) throw err

      error.value = err
      clearReportRows()
      throw err
    } finally {
      if (version === accountVersion.value) loading.value = false
    }
  }

  return {
    accountVersion,
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
    getReportRows
  }
})
