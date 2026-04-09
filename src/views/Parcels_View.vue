<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { computed, ref, onMounted } from 'vue'
import OzonParcelsList from '@/lists/OzonParcels_List.vue'
import OzonParcelsWhList from '@/lists/OzonParcels_WhList.vue'
import WbrParcelsList from '@/lists/WbrParcels_List.vue'
import WbrParcelsWhList from '@/lists/WbrParcels_WhList.vue'
import Wbr2ParcelsList from '@/lists/Wbr2Parcels_List.vue'
import Wbr2ParcelsWhList from '@/lists/Wbr2Parcels_WhList.vue'
import GtcParcelsList from '@/lists/GtcParcels_List.vue'
import { OZON_COMPANY_ID, WBR_COMPANY_ID, GTC_COMPANY_ID, WBR2_REGISTER_ID } from '@/helpers/company.constants.js'
import { OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { useRouter } from 'vue-router'

const props = defineProps({
  id: { type: Number, required: true },
  mode: { type: String, default: OP_MODE_PAPERWORK }
})
const router = useRouter()

const register = ref(null)
const loading = ref(true)
const error = ref(null)

const listComponent = computed(() => {
  if (!register.value) return null
  const registerType = register.value.registerType
  if (registerType === OZON_COMPANY_ID) {
    return props.mode === OP_MODE_WAREHOUSE ? OzonParcelsWhList : OzonParcelsList
  }
  if (registerType === WBR_COMPANY_ID) {
    return props.mode === OP_MODE_WAREHOUSE ? WbrParcelsWhList : WbrParcelsList
  }
  if (registerType === GTC_COMPANY_ID) return GtcParcelsList
  if (registerType === WBR2_REGISTER_ID) {
    return props.mode === OP_MODE_WAREHOUSE ? Wbr2ParcelsWhList : Wbr2ParcelsList
  }
  return null
})

onMounted(async () => {
  try {
    loading.value = true
    register.value = await fetchWrapper.get(`${apiUrl}/registers/${props.id}`)
  } catch (err) {
    error.value = err
  } finally {
    loading.value = false
  }
})

function closeList() {
  router.back()
}
</script>

<template>
  <div v-if="loading">Загрузка...</div>
  <div v-else-if="error">Ошибка загрузки: {{ error.message }}</div>
  <Suspense v-else>
    <component v-if="listComponent" :is="listComponent" :register-id="props.id" @close="closeList" />
    <div v-else>Неизвестный тип компании</div>
  </Suspense>
</template>
