import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/countries`

export const useCountriesStore = defineStore('countries', () => {
  const countries = ref([])
  const loading = ref(false)
  const error = ref(null)

  let initialized = false

  async function getAll() {
    loading.value = true
    error.value = null
    try {
      countries.value = await fetchWrapper.get(`${baseUrl}/compact`)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function update() {
    loading.value = true
    error.value = null
    initialized = false
    try {
      await fetchWrapper.post(`${baseUrl}/update`)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  function getCountryAlpha2(code) {
    const num = Number(code)
    const country = countries.value.find(c => c.isoNumeric === num)
    return country ? country.isoAlpha2 : code
  }

  function getCountryShortName(code) {
    const num = Number(code)
    const country = countries.value.find(c => c.isoNumeric === num)
    if (!country) return code
    return country.nameRuShort || country.nameRuOfficial || code
  }

  function ensureLoaded() {
    if (!initialized && !loading.value) {
      initialized = true
      getAll()
    }
  }

  return { 
    countries, 
    loading, 
    error, 
    getAll, 
    update, 
    getCountryAlpha2, 
    getCountryShortName,
    ensureLoaded,
  }
})
