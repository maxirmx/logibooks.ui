import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/registers`

export const useRegistersStore = defineStore('registers', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)
  const hasNextPage = ref(false)

  async function getAll(page = 1, pageSize = 10) {
    loading.value = true
    error.value = null
    try {
      const data = await fetchWrapper.get(`${baseUrl}?page=${page}&pageSize=${pageSize}`)
      items.value = data
      hasNextPage.value = data.length === pageSize
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, hasNextPage, getAll }
})
