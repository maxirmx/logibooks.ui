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

  async function getItems(manageLoading = true) {
    if (manageLoading) {
      loading.value = true
      error.value = null
    }
    try {
      items.value = await fetchWrapper.get(`${baseUrl}/items`)
    } catch (err) {
      if (manageLoading) {
        error.value = err
      }
      throw err
    } finally {
      if (manageLoading) {
        loading.value = false
      }
    }
  }

  async function getExceptions(manageLoading = true) {
    if (manageLoading) {
      loading.value = true
      error.value = null
    }
    try {
      exceptions.value = await fetchWrapper.get(`${baseUrl}/exceptions`)
    } catch (err) {
      if (manageLoading) {
        error.value = err
      }
      throw err
    } finally {
      if (manageLoading) {
        loading.value = false
      }
    }
  }

  async function parse() {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.post(`${baseUrl}/parse`)
      await Promise.all([
        getItems(false),
        getExceptions(false)
      ])
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { items, exceptions, loading, error, getItems, getExceptions, parse }
})
