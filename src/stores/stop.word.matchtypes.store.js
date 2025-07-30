import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/stopwords`

export const useStopWordMatchTypesStore = defineStore('stopWordMatchTypes', () => {
  const matchTypes = ref([])
  const loading = ref(false)
  const error = ref(null)

  const matchTypeMap = ref(new Map())

  async function fetchMatchTypes() {
    loading.value = true
    error.value = null
    try {
      const response = await fetchWrapper.get(`${baseUrl}/matchtypes`)
      matchTypes.value = response || []
      matchTypeMap.value = new Map(matchTypes.value.map(t => [t.id, t]))
    } catch (err) {
      error.value = err
      console.error('Failed to fetch stop word match types:', err)
    } finally {
      loading.value = false
    }
  }

  function getName(id) {
    const type = matchTypeMap.value.get(id)
    return type ? type.name : `Тип ${id}`
  }

  let initialized = false
  function ensureLoaded() {
    if (!initialized && matchTypes.value.length === 0 && !loading.value) {
      initialized = true
      fetchMatchTypes()
    }
  }

  return {
    matchTypes,
    loading,
    error,
    matchTypeMap,
    fetchMatchTypes,
    getName,
    ensureLoaded
  }
})
