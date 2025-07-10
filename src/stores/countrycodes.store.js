import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/countrycodes`

export const useCountryCodesStore = defineStore('countrycodes', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function getAll() {
    loading.value = true
    error.value = null
    try {
      items.value = await fetchWrapper.get(`${baseUrl}/compact`)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function update() {
    await fetchWrapper.post(`${baseUrl}/update`)
  }

  return { items, loading, error, getAll, update }
})
