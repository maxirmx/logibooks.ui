import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/status`

export const useStatusStore = defineStore('status', () => {
  const coreVersion = ref('')
  const dbVersion = ref('')

  async function fetchStatus() {
    const res = await fetchWrapper.get(`${baseUrl}/status`)
    coreVersion.value = res.AppVersion
    dbVersion.value = res.DbVersion
  }

  return { coreVersion, dbVersion, fetchStatus }
})
