<script setup>
import { computed, ref, onMounted } from 'vue'
import OzonParcelEditDialog from '@/components/OzonParcel_EditDialog.vue'
import WbrParcelEditDialog from '@/components/WbrParcel_EditDialog.vue'
import { OZON_COMPANY_ID, WBR_COMPANY_ID } from '@/helpers/company.constants.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const props = defineProps({
  registerId: { type: Number, required: true },
  id: { type: Number, required: true }
})

const register = ref(null)
const loading = ref(true)
const error = ref(null)

const editComponent = computed(() => {
  if (!register.value) return null
  const customerId = register.value.customerId
  if (customerId === OZON_COMPANY_ID) return OzonParcelEditDialog
  if (customerId === WBR_COMPANY_ID) return WbrParcelEditDialog
  return null
})

onMounted(async () => {
  try {
    loading.value = true
    register.value = await fetchWrapper.get(`${apiUrl}/registers/${props.registerId}`)
  } catch (err) {
    error.value = err
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading">Загрузка...</div>
  <div v-else-if="error">Ошибка загрузки: {{ error.message }}</div>
  <Suspense v-else>
    <component v-if="editComponent" :is="editComponent" :register-id="props.registerId" :id="props.id" />
    <div v-else>Неизвестный тип компании</div>
  </Suspense>
</template>
