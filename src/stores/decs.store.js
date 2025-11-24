// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { useAuthStore } from '@/stores/auth.store.js'

const baseUrl = `${apiUrl}/decs`

export const useDecsStore = defineStore('decs', () => {
  const reports = ref([])
  const loading = ref(false)
  const error = ref(null)

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
        pageSize: authStore.uploadcustomsreports_per_page.toString()
      })

      const sortBy = authStore.uploadcustomsreports_sort_by?.[0]
      if (sortBy?.key) {
        queryParams.append('sortBy', sortBy.key)
        queryParams.append('sortOrder', sortBy.order || 'asc')
      }

      const response = await fetchWrapper.get(`${baseUrl}?${queryParams.toString()}`)
      reports.value = Array.isArray(response) ? response : response?.items || []
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return {
    reports,
    loading,
    error,
    upload,
    getReports
  }
})
