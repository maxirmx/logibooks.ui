// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { SwValidationMatchMode } from '@/models/sw.validation.match.mode.js'
import { ParcelApprovalMode } from '@/models/parcel.approval.mode.js'

const baseUrl = `${apiUrl}/parcels`

export function buildParcelsFilterParams(authStore, additionalParams = {}) {
  const params = new URLSearchParams(additionalParams)
  
  // Add sorting parameters
  params.append('sortBy', authStore.parcels_sort_by?.[0]?.key || 'id')
  params.append('sortOrder', authStore.parcels_sort_by?.[0]?.order || 'asc')
  
  if (authStore.parcels_status !== null && authStore.parcels_status !== undefined) {
    params.append('statusId', authStore.parcels_status.toString())
  }
  
  if (authStore.parcels_check_status_sw !== null && authStore.parcels_check_status_sw !== undefined) {
    params.append('checkStatusSw', authStore.parcels_check_status_sw.toString())
  }
  
  if (authStore.parcels_check_status_fc !== null && authStore.parcels_check_status_fc !== undefined) {
    params.append('checkStatusFc', authStore.parcels_check_status_fc.toString())
  }
  
  if (authStore.parcels_tnved) {
    params.append('tnVed', authStore.parcels_tnved)
  }

  if (authStore.parcels_number) {
    params.append('number', authStore.parcels_number)
  }

  return params
}

export function buildParcelsNumberParams(number) {
  const params = new URLSearchParams()
  if (number) {
    params.append('number', number)
  }
  return params
}

function buildApproveQueryParams(approvalMode) {
  const params = new URLSearchParams()
  params.append('approveMode', approvalMode)
  return params.toString()
}

export const useParcelsStore = defineStore('parcels', () => {
  const items = ref([])
  const items_bn = ref([])
  const item = ref({})
  const loading = ref(false)
  const error = ref(null)
  const totalCount = ref(0)
  const hasNextPage = ref(false)
  const hasPreviousPage = ref(false)

  async function getAll(registerId, options = { updateStore: true }) {
    const authStore = useAuthStore()
    loading.value = true
    error.value = null
    try {
      const params = buildParcelsFilterParams(authStore, {
        registerId: registerId.toString(),
        page: authStore.parcels_page.toString(),
        pageSize: authStore.parcels_per_page.toString()
      })

      const response = await fetchWrapper.get(`${baseUrl}?${params.toString()}`)
      const responseItems = response.items || []
      
      if (options.updateStore) {
        items.value = responseItems
        totalCount.value = response.pagination?.totalCount || 0
        hasNextPage.value = response.pagination?.hasNextPage || false
        hasPreviousPage.value = response.pagination?.hasPreviousPage || false
      }
      
      return {
        items: responseItems,
        pagination: {
          totalCount: response.pagination?.totalCount || 0,
          hasNextPage: response.pagination?.hasNextPage || false,
          hasPreviousPage: response.pagination?.hasPreviousPage || false
        }
      }
    } catch (err) {
      error.value = err
      throw err
    } finally {
      if (options.updateStore) {
        loading.value = false
      }
    }
  }

  async function getByNumber(number) {
    const authStore = useAuthStore()
    const searchNumber = number ?? authStore.parcels_number
    loading.value = true
    error.value = null
    try {
      const params = buildParcelsNumberParams(searchNumber)
      const response = await fetchWrapper.get(`${baseUrl}/by-number?${params.toString()}`)
      items_bn.value =  response  || []
    } catch (err) {
      error.value = err
      throw err
    } finally {
        loading.value = false
    }
  }

  function updateItems(responseData) {
    if (responseData) {
      items.value = responseData.items || []
      totalCount.value = responseData.pagination?.totalCount || 0
      hasNextPage.value = responseData.pagination?.hasNextPage || false
      hasPreviousPage.value = responseData.pagination?.hasPreviousPage || false
    }
    loading.value = false
  }

  async function getById(id) {
    item.value = { loading: true }
    try {
      const result = await fetchWrapper.get(`${baseUrl}/${id}`)
      item.value = result
      return result
    } catch (err) {
      item.value = { error: err }
      return null
    }
  }

  async function update(id, data) {
    const response = await fetchWrapper.put(`${baseUrl}/${id}`, data)

    // Update the item in the store if it's currently loaded
    if (item.value && item.value.id === id) {
      // Merge the updated data with the existing item
      item.value = { ...item.value, ...data }
    }

    // Update the item in the items array if it exists
    const itemIndex = items.value.findIndex(parcel => parcel.id === id)
    if (itemIndex !== -1) {
      items.value[itemIndex] = { ...items.value[itemIndex], ...data }
    }
    
    return response
  }

  async function generate(id, filename) {
    loading.value = true
    error.value = null
    try {
      if (filename == null || filename == undefined) {
        filename = `IndPost_${id}.xml`
      }
      else {
        filename = `IndPost_${filename}.xml`
      }
      return await fetchWrapper.downloadFile(`${baseUrl}/${id}/generate`, filename)
    } catch (err) {
      error.value = err?.message || 'Ошибка при выгрузке накладной для посылки'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function validate(id, sw, swMatchMode = SwValidationMatchMode.NoSwMatch) {
    loading.value = true
    error.value = null
    try {

      const url = sw
        ? `${baseUrl}/${id}/validate-sw?withSwMatch=${swMatchMode}`
        : `${baseUrl}/${id}/validate-fc`
      await fetchWrapper.post(url)
      return true
    } catch (err) {
      error.value = err
      return false
    } finally {
      loading.value = false
    }
  }

  async function approve(id, approvalMode = ParcelApprovalMode.SimpleApprove) {
    const query = buildApproveQueryParams(approvalMode)
    const url = `${baseUrl}/${id}/approve?${query}`

    await fetchWrapper.post(url)
    return true
  }

  async function lookupFeacnCode(id) {
    const result = await fetchWrapper.post(`${baseUrl}/${id}/lookup-feacn-code`)
    return result
  }

  return {
    items,
    items_bn,
    item,
    loading,
    error,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    getAll,
    getById,
    update,
    updateItems,
    getByNumber,
    generate,
    validate,
    approve,
    lookupFeacnCode
  }
})
