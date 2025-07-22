<script setup>
import { computed } from 'vue'
import OzonParcelsList from '@/components/OzonParcels_List.vue'
import WbrParcelsList from '@/components/WbrParcels_List.vue'
import { OZON_COMPANY_ID, WBR_COMPANY_ID } from '@/helpers/company.constants.js'

const props = defineProps({
  id: { type: Number, required: true },
  companyId: { type: Number, required: true }
})

const listComponent = computed(() => {
  if (props.companyId === OZON_COMPANY_ID) return OzonParcelsList
  if (props.companyId === WBR_COMPANY_ID) return WbrParcelsList
  return null
})
</script>

<template>
  <Suspense>
    <component v-if="listComponent" :is="listComponent" :register-id="props.id" />
  </Suspense>
</template>
