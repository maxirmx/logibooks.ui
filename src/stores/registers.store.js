// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { useCustomsProceduresStore } from '@/stores/customs.procedures.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { buildParcelsFilterParams } from '@/stores/parcels.store.js'

const baseUrl = `${apiUrl}/registers`

export const useRegistersStore = defineStore('registers', () => {
  const items = ref([])
  const item = ref({})
  const uploadFile = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const totalCount = ref(0)
  const hasNextPage = ref(false)
  const hasPreviousPage = ref(false)
  
  const customsProceduresStore = useCustomsProceduresStore()

  function setDestinationField(register) {
    if (!register || !register.customsProcedureId) {
      register.destination = 'in'
      return
    }
    let proc = null
    if (customsProceduresStore.procedureMap && customsProceduresStore.procedureMap.value) {
      proc = customsProceduresStore.procedureMap.value.get(register.customsProcedureId)
    }
    if (!proc && Array.isArray(customsProceduresStore.procedures)) {
      proc = customsProceduresStore.procedures.find(p => p.id === register.customsProcedureId)
    }
    if (proc && proc.code == 10) {
      register.destination = 'out'
      register.destCountryCode = register.theOtherCountryCode
      register.origCountryCode = 643 // Russia
      register.recipientId = register.theOtherCompanyId
      register.senderId = register.companyId
    } else {
      register.destination = 'in'
      register.destCountryCode = 643 // Russia
      register.origCountryCode = register.theOtherCountryCode
      register.recipientId = register.companyId
      register.senderId = register.theOtherCompanyId
    }
  }

  async function getAll() {
    const authStore = useAuthStore()
    
    customsProceduresStore.ensureLoaded()
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams({
        page: authStore.registers_page.toString(),
        pageSize: authStore.registers_per_page.toString(),
        sortBy: authStore.registers_sort_by?.[0]?.key || 'id',
        sortOrder: authStore.registers_sort_by?.[0]?.order || 'desc'
      })

      if (authStore.registers_search) {
        queryParams.append('search', authStore.registers_search)
      }

      const response = await fetchWrapper.get(`${baseUrl}?${queryParams.toString()}`)

      // API format with pagination metadata
      items.value = response.items || []
      // Set destination for each register
      if (Array.isArray(items.value)) {
        items.value.forEach(setDestinationField)
      }
      totalCount.value = response.pagination?.totalCount || 0
      hasNextPage.value = response.pagination?.hasNextPage || false
      hasPreviousPage.value = response.pagination?.hasPreviousPage || false
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function upload(file, companyId) {
    loading.value = true
    error.value = null
    try {
      const formData = new FormData()
      formData.append('file', file)
      return await fetchWrapper.postFile(`${baseUrl}/upload/${companyId}`, formData)
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getById(id) {
    customsProceduresStore.ensureLoaded()
    item.value = { loading: true }
    try {
      item.value = await fetchWrapper.get(`${baseUrl}/${id}`)
      setDestinationField(item.value)
    } catch (err) {
      item.value = { error: err }
    }
  }

  async function update(id, data) {
    const res = await fetchWrapper.put(`${baseUrl}/${id}`, data)
    if (item.value && item.value.id === id) {
      item.value = { ...item.value, ...data }
    }
    const idx = items.value.findIndex((r) => r.id === id)
    if (idx !== -1) {
      items.value[idx] = { ...items.value[idx], ...data }
    }
    return res
  }

  async function setParcelStatuses(registerId, statusId) {
    loading.value = true
    error.value = null
    try {
      const response = await fetchWrapper.put(
        `${baseUrl}/${registerId}/setparcelstatuses/${statusId}`
      )
      return response
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function validate(registerId, sw) {
    try {
      const url = sw
        ? `${baseUrl}/${registerId}/validate-sw`
        : `${baseUrl}/${registerId}/validate-fc`
      const result = await fetchWrapper.post(url)
      return result
    } catch (err) {
      error.value = err
      throw err
    }
  }

  async function getValidationProgress(handleId) {
    try {
      return await fetchWrapper.get(`${baseUrl}/validate/${handleId}`)
    } catch (err) {
      error.value = err
      throw err
    }
  }

  async function cancelValidation(handleId) {
    try {
      await fetchWrapper.delete(`${baseUrl}/validate/${handleId}`)
    } catch (err) {
      error.value = err
      throw err
    }
  }

  async function lookupFeacnCodes(registerId) {
    try {
      const result = await fetchWrapper.post(`${baseUrl}/${registerId}/lookup-feacn-codes`)
      return result
    } catch (err) {
      error.value = err
      throw err
    }
  }

  async function getLookupFeacnCodesProgress(handleId) {
    try {
      return await fetchWrapper.get(`${baseUrl}/lookup-feacn-codes/${handleId}`)
    } catch (err) {
      error.value = err
      throw err
    }
  }

  async function cancelLookupFeacnCodes(handleId) {
    try {
      await fetchWrapper.delete(`${baseUrl}/lookup-feacn-codes/${handleId}`)
    } catch (err) {
      error.value = err
      throw err
    }
  }

  async function generate(id, invoiceNumber) {
    loading.value = true
    error.value = null
    try {
      let filename
      if (invoiceNumber !== null && invoiceNumber !== undefined) {
        filename = `IndPost_${invoiceNumber}.zip`
      } else {
        filename = `IndPost_${id}.zip`
      }
      return await fetchWrapper.downloadFile(
        `${baseUrl}/${id}/generate`,
        filename
      )
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function generateExcise(id, invoiceNumber) {
    loading.value = true
    error.value = null
    try {
      let filename
      if (invoiceNumber !== null && invoiceNumber !== undefined) {
        filename = `IndPost_${invoiceNumber}-акциз.zip`
      } else {
        filename = `IndPost_${id}-акциз.zip`
      }
      return await fetchWrapper.downloadFile(
        `${baseUrl}/${id}/generate-excise`,
        filename
      )
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function generateWithoutExcise(id, invoiceNumber) {
    loading.value = true
    error.value = null
    try {
      let filename
      if (invoiceNumber !== null && invoiceNumber !== undefined) {
        filename = `IndPost_${invoiceNumber}-без-акциза.zip`
      } else {
        filename = `IndPost_${id}-без-акциза.zip`
      }
      return await fetchWrapper.downloadFile(
        `${baseUrl}/${id}/generate-without-excise`,
        filename
      )
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function download(id, filename) {
    if (!filename) {
      filename = `register_${id}.xlsx`
    }
    loading.value = true
    error.value = null
    try {
      // Use downloadFile helper to trigger browser download
      return await fetchWrapper.downloadFile(
        `${baseUrl}/${id}/download`,
        filename
      )
    } catch (err) {
      error.value = err
    }
    finally {
      loading.value = false
    }
    return null
  }

  async function nextParcel(parcelId) {
    const authStore = useAuthStore()
    
    loading.value = true
    error.value = null
    try {
      const params = buildParcelsFilterParams(authStore)

      return await fetchWrapper.get(`${baseUrl}/nextparcel/${parcelId}?${params.toString()}`)
    } catch (err) {
      error.value = err
    }
    finally {
      loading.value = false
    }
    return null
  }

  async function theNextParcel(parcelId) {
    const authStore = useAuthStore()
    
    loading.value = true
    error.value = null
    try {
      const params = buildParcelsFilterParams(authStore)

      return await fetchWrapper.get(`${baseUrl}/the-nextparcel/${parcelId}?${params.toString()}`)
    } catch (err) {
      error.value = err
    }
    finally {
      loading.value = false
    }
    return null
  }


  async function remove(id) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.delete(`${baseUrl}/${id}`)
      await getAll()
    } catch (err) {
      error.value = err
    }
    finally {
      loading.value = false
    }
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
    upload,
    getById,
    update,
    setParcelStatuses,
    validate,
    getValidationProgress,
    cancelValidation,
    lookupFeacnCodes,
    getLookupFeacnCodesProgress,
    cancelLookupFeacnCodes,
    generate,
    generateExcise,
    generateWithoutExcise,
    download,
    nextParcel,
    theNextParcel,
    remove,
    uploadFile
  }
})
