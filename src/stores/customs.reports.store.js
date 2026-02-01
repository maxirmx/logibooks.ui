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
  const totalCount = ref(0)
  const hasNextPage = ref(false)
  const hasPreviousPage = ref(false)

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
        sortOrder: authStore.uploadcustomsreports_sort_by?.[0]?.order || 'asc'
      })

      if (authStore.uploadcustomsreports_search) {
        queryParams.append('search', authStore.uploadcustomsreports_search)
      }

      const response = await fetchWrapper.get(`${baseUrl}?${queryParams.toString()}`)

      reports.value = response?.items || []
      totalCount.value = response?.pagination?.totalCount || 0
      hasNextPage.value = response?.pagination?.hasNextPage || false
      hasPreviousPage.value = response?.pagination?.hasPreviousPage || false
    } catch (err) {
      error.value = err
      reports.value = []
      totalCount.value = 0
      hasNextPage.value = false
      hasPreviousPage.value = false
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

  async function getReportRows(id) {
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

      const response = await fetchWrapper.get(`${baseUrl}/${id}/rows?${queryParams.toString()}`)

      reportRows.value = response?.items || []
      totalCount.value = response?.pagination?.totalCount || 0
      hasNextPage.value = response?.pagination?.hasNextPage || false
      hasPreviousPage.value = response?.pagination?.hasPreviousPage || false
    } catch (err) {
      error.value = err
      reportRows.value = []
      totalCount.value = 0
      hasNextPage.value = false
      hasPreviousPage.value = false
    } finally {
      loading.value = false
    }
  }

  return {
    reports,
    reportRows,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    loading,
    error,
    upload,
    getReports,
    remove,
    getReportRows
  }
})
