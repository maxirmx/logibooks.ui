import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/registers`

export const useRegistersStore = defineStore('registers', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)
  const totalCount = ref(0)
  const hasNextPage = ref(false)
  const hasPreviousPage = ref(false)

  async function getAll(page = 1, pageSize = 10, sortBy = 'id', sortOrder = 'asc', search = '') {
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

  async function setOrderStatuses(registerId, statusId) {
    loading.value = true
    error.value = null
    try {
      console.log('Store: setOrderStatuses called with:', { registerId, statusId, type: typeof statusId })
      const response = await fetchWrapper.put(`${baseUrl}/${registerId}/setorderstatuses/${statusId}`)
      console.log('Store: Response received:', response)
      return response
    } catch (err) {
      console.error('Store: Error in setOrderStatuses:', err)
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
    loading,
    error,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    getAll,
    upload,
    setOrderStatuses,
    validate,
    getValidationProgress,
    cancelValidation,
    remove
  }
})
