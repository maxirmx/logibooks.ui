import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { useCustomsProceduresStore } from '@/stores/customs.procedures.store.js'

const baseUrl = `${apiUrl}/registers`

export const useRegistersStore = defineStore('registers', () => {
  const items = ref([])
  const item = ref({})
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
    // Try to get the procedure from the store's map or array
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

  async function getAll(page = 1, pageSize = 10, sortBy = 'id', sortOrder = 'asc', search = '') {
    customsProceduresStore.ensureLoaded()
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder
      })

      if (search) {
        queryParams.append('search', search)
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
    console.log('upload: ' + companyId)
    loading.value = true
    error.value = null
    try {
      const formData = new FormData()
      formData.append('file', file)
      await fetchWrapper.postFile(`${baseUrl}/upload/${companyId}`, formData)
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

  async function setOrderStatuses(registerId, statusId) {
    loading.value = true
    error.value = null
    try {
      const response = await fetchWrapper.put(
        `${baseUrl}/${registerId}/setorderstatuses/${statusId}`
      )
      return response
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function validate(registerId) {
    try {
      const result = await fetchWrapper.post(`${baseUrl}/${registerId}/validate`)
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
      console.error('Error downloading file:', err)
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

  async function nextParcel(orderId) {
    loading.value = true
    error.value = null
    try {
      return await fetchWrapper.get(`${baseUrl}/nextorder/${orderId}`)
    } catch (err) {
      error.value = err
    }
    finally {
      loading.value = false
    }
    return null
  }

  async function remove(id) {
    try {
      await fetchWrapper.delete(`${baseUrl}/${id}`)
      // Refresh the list after deletion
      await getAll()
    } catch (error) {
      console.error('Failed to delete register:', error)
      throw error
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
    setOrderStatuses,
    validate,
    getValidationProgress,
    cancelValidation,
    generate,
    download,
    nextParcel,
    remove
  }
})
