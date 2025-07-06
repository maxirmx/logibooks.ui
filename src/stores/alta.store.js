import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/alta`

export const useAltaStore = defineStore('alta', () => {
  const items = ref([])
  const exceptions = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function getItems() {
    loading.value = true
    error.value = null
    try {
      items.value = await fetchWrapper.get(`${baseUrl}/items`)
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getExceptions() {
    loading.value = true
    error.value = null
    try {
      exceptions.value = await fetchWrapper.get(`${baseUrl}/exceptions`)
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function parse() {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.post(`${baseUrl}/parse`)
      // Fetch items and exceptions directly instead of using functions that toggle loading state
      const [itemsData, exceptionsData] = await Promise.all([
        fetchWrapper.get(`${baseUrl}/items`),
        fetchWrapper.get(`${baseUrl}/exceptions`)
      ])
      items.value = itemsData
      exceptions.value = exceptionsData
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { items, exceptions, loading, error, getItems, getExceptions, parse }
})
