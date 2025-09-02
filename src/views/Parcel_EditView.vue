<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application

import { computed, ref, onMounted, onUnmounted } from 'vue'
import OzonParcelEditDialog from '@/dialogs/OzonParcel_EditDialog.vue'
import WbrParcelEditDialog from '@/dialogs/WbrParcel_EditDialog.vue'
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
const isComponentMounted = ref(true)

const editComponent = computed(() => {
  if (!isComponentMounted.value || !register.value) return null
  const companyId = register.value.companyId
  if (companyId === OZON_COMPANY_ID) return OzonParcelEditDialog
  if (companyId === WBR_COMPANY_ID) return WbrParcelEditDialog
  return null
})

onMounted(async () => {
  try {
    if (!isComponentMounted.value) return
    loading.value = true
    register.value = await fetchWrapper.get(`${apiUrl}/registers/${props.registerId}`)
  } catch (err) {
    if (isComponentMounted.value) {
      error.value = err
    }
  } finally {
    if (isComponentMounted.value) {
      loading.value = false
    }
  }
})

onUnmounted(() => {
  isComponentMounted.value = false
})
</script>

<template>
  <div v-if="loading">Загрузка...</div>
  <div v-else-if="error">Ошибка загрузки: {{ error.message }}</div>
  <Suspense v-else>
    <component 
      v-if="editComponent" 
      :is="editComponent" 
      :register-id="props.registerId" 
      :id="props.id" 
      :key="props.id" 
    />
    <div v-else>Неизвестный тип компании</div>
  </Suspense>
</template>
