import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/orders`

export const useParcelsStore = defineStore('parcels', () => {
  const items = ref([])
  const item = ref({})
  const loading = ref(false)
  const error = ref(null)
  const totalCount = ref(0)
  const hasNextPage = ref(false)
  const hasPreviousPage = ref(false)

  async function getAll(
    registerId,
    statusId = null,
    tnVed = null,
    page = 1,
    pageSize = 100,
    sortBy = 'id',
    sortOrder = 'asc'
  ) {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams({
        registerId: registerId.toString(),
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder
      })
      if (statusId !== null && statusId !== undefined) {
        params.append('statusId', statusId.toString())
      }
      if (tnVed) {
        params.append('tnVed', tnVed)
      }

      const response = await fetchWrapper.get(`${baseUrl}?${params.toString()}`)
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

  async function getById(id) {
    item.value = { loading: true }
    try {
      item.value = await fetchWrapper.get(`${baseUrl}/${id}`)
    } catch (err) {
      item.value = { error: err }
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

  async function generate(id) {
    try {
      // Use the new downloadFile helper with a default filename
      return await fetchWrapper.downloadFile(`${baseUrl}/${id}/generate`, `parcel_${id}.xml`)
    } catch (err) {
      console.error('Error downloading file:', err)
      error.value = err?.message || 'Ошибка при выгрузке накладной для посылки'
      throw err
    }
  }

  async function generateAll(registerId) {
    // Generate XML for all parcels in a register - stub implementation
    console.log('stub generate all parcels XML', registerId)
  }

  async function validate(id) {
      await fetchWrapper.post(`${baseUrl}/${id}/validate`)
      return true
  }

  async function approve(id) {
      await fetchWrapper.post(`${baseUrl}/${id}/approve`)
      return true
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
    generate,
    generateAll,
    validate,
    approve
  }
})
