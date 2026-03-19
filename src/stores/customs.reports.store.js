// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { useAuthStore } from '@/stores/auth.store.js'

const baseUrl = `${apiUrl}/customsreports`

export const useCustomsReportsStore = defineStore('customsreports', () => {
  const reports = ref([])
  const reportRows = ref([])
  const loading = ref(false)
  const error = ref(null)
  const reportsTotalCount = ref(0)
  const reportsHasNextPage = ref(false)
  const reportsHasPreviousPage = ref(false)
  const rowsTotalCount = ref(0)
  const rowsHasNextPage = ref(false)
  const rowsHasPreviousPage = ref(false)

  async function upload(file) {
    loading.value = true
    error.value = null
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetchWrapper.postFile(`${baseUrl}/upload-report`, formData)
      return response
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getReports() {
    const authStore = useAuthStore()
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

      reports.value = response?.items || []
      reportsTotalCount.value = response?.pagination?.totalCount || 0
      reportsHasNextPage.value = response?.pagination?.hasNextPage || false
      reportsHasPreviousPage.value = response?.pagination?.hasPreviousPage || false
    } catch (err) {
      error.value = err
      reports.value = []
      reportsTotalCount.value = 0
      reportsHasNextPage.value = false
      reportsHasPreviousPage.value = false
    } finally {
      loading.value = false
    }
  }

  async function remove(id) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.delete(`${baseUrl}/${id}`)
      // refresh list after deletion
      await getReports()
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getReportRows(reportId) {
    const authStore = useAuthStore()
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

      const response = await fetchWrapper.get(`${baseUrl}/${reportId}/rows?${queryParams.toString()}`)

      reportRows.value = response?.items || []
      rowsTotalCount.value = response?.pagination?.totalCount || 0
      rowsHasNextPage.value = response?.pagination?.hasNextPage || false
      rowsHasPreviousPage.value = response?.pagination?.hasPreviousPage || false
    } catch (err) {
      error.value = err
      reportRows.value = []
      rowsTotalCount.value = 0
      rowsHasNextPage.value = false
      rowsHasPreviousPage.value = false
    } finally {
      loading.value = false
    }
  }

  return {
    reports,
    reportRows,
    reportsTotalCount,
    reportsHasNextPage,
    reportsHasPreviousPage,
    rowsTotalCount,
    rowsHasNextPage,
    rowsHasPreviousPage,
    loading,
    error,
    upload,
    getReports,
    remove,
    getReportRows
  }
})
