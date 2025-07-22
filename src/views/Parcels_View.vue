<script setup>
import { ref, onMounted, computed } from 'vue'
import OzonParcelsList from '@/components/OzonParcels_List.vue'
import WbrParcelsList from '@/components/WbrParcels_List.vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { OZON_COMPANY_ID, WBR_COMPANY_ID } from '@/helpers/company.constants.js'

const props = defineProps({ id: { type: Number, required: true } })

const companyId = ref(null)

onMounted(async () => {
  try {
    const res = await fetchWrapper.get(`${apiUrl}/registers/${props.id}`)
    companyId.value = res.companyId
  } catch {
    companyId.value = null
  }
})

const listComponent = computed(() => {
  if (companyId.value === OZON_COMPANY_ID) return OzonParcelsList
  if (companyId.value === WBR_COMPANY_ID) return WbrParcelsList
  return null
})
</script>

<template>
  <Suspense>
    <component v-if="listComponent" :is="listComponent" :register-id="props.id" />
  </Suspense>
</template>
