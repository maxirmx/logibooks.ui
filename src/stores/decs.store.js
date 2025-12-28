// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/decs`

export const useDecsStore = defineStore('decs', () => {
  const reports = ref([])
  const reportRows = ref([])
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
    loading.value = true
    error.value = null
    try {
      reports.value = await fetchWrapper.get(`${baseUrl}`)
    } catch (err) {
      error.value = err
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
    loading.value = true
    error.value = null
    try {
      reportRows.value = await fetchWrapper.get(`${baseUrl}/${id}/rows`)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return {
    reports,
    reportRows,
    loading,
    error,
    upload,
    getReports,
    remove,
    getReportRows
  }
})
