import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/feacncodes`

export const useFeacnCodesStore = defineStore('feacn.codes', () => {
  const orders = ref([])
  const prefixes = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function getOrders() {
    loading.value = true
    error.value = null
    try {
      orders.value = await fetchWrapper.get(`${baseUrl}/orders`)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function getPrefixes(orderId) {
    if (!orderId) {
      prefixes.value = []
      return
    }
    loading.value = true
    error.value = null
    try {
      prefixes.value = await fetchWrapper.get(`${baseUrl}/orders/${orderId}/prefixes`)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function update() {
    await fetchWrapper.post(`${baseUrl}/update`)
  }

  return { orders, prefixes, loading, error, getOrders, getPrefixes, update }
})
