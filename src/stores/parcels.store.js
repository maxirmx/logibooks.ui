// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { useAuthStore } from '@/stores/auth.store.js'

const baseUrl = `${apiUrl}/parcels`

export function buildParcelsFilterParams(authStore, additionalParams = {}) {
  const params = new URLSearchParams(additionalParams)
  
  // Add sorting parameters
  params.append('sortBy', authStore.parcels_sort_by?.[0]?.key || 'id')
  params.append('sortOrder', authStore.parcels_sort_by?.[0]?.order || 'asc')
  
  if (authStore.parcels_status !== null && authStore.parcels_status !== undefined) {
    params.append('statusId', authStore.parcels_status.toString())
  }
  
  if (authStore.parcels_check_status !== null && authStore.parcels_check_status !== undefined) {
    params.append('checkStatusId', authStore.parcels_check_status.toString())
  }
  
  if (authStore.parcels_tnved) {
    params.append('tnVed', authStore.parcels_tnved)
  }

  return params
}

export const useParcelsStore = defineStore('parcels', () => {
  const items = ref([])
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

  async function validate(id, sw) {
    loading.value = true
    error.value = null
    try {
      if (sw) {
        await fetchWrapper.post(`${baseUrl}/${id}/validate-sw`)
      }
      else {
        await fetchWrapper.post(`${baseUrl}/${id}/validate-fc`)
      }
      return true
    } catch (err) {
      error.value = err
      return false
    } finally {
      loading.value = false
    }
  }

  async function approve(id, withExcise = false) {
    const params = new URLSearchParams()
    if (withExcise) {
      params.append('withExcise', 'true')
    }
    
    const url = params.toString() 
      ? `${baseUrl}/${id}/approve?${params.toString()}`
      : `${baseUrl}/${id}/approve`
    
    await fetchWrapper.post(url)
    return true
  }

  async function lookupFeacnCode(id) {
    const result = await fetchWrapper.post(`${baseUrl}/${id}/lookup-feacn-code`)
    return result
  }

  return {
    items,
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
    generate,
    validate,
    approve,
    lookupFeacnCode
  }
})
