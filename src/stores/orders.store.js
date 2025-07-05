import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/orders`

export const useOrdersStore = defineStore('orders', () => {
  const items = ref([])
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

  async function update(id, data) {
    console.log('stub update order', id, data)
  }

  async function generate(id) {
    console.log('stub generate order', id)
  }

  async function generateAll(registerId) {
    console.log('stub generate all orders for register', registerId)
  }

  return {
    items,
    loading,
    error,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    getAll,
    update,
    generate,
    generateAll
  }
})
