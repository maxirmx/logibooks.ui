<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { computed, ref, onMounted, onUnmounted } from 'vue'
import OzonParcelsList from '@/lists/OzonParcels_List.vue'
import OzonParcelsWhList from '@/lists/OzonParcels_WhList.vue'
import WbrParcelsList from '@/lists/WbrParcels_List.vue'
import WbrParcelsWhList from '@/lists/WbrParcels_WhList.vue'
import Wbr2ParcelsList from '@/lists/Wbr2Parcels_List.vue'
import Wbr2ParcelsWhList from '@/lists/Wbr2Parcels_WhList.vue'
import WbrNParcelsList from '@/lists/WbrNParcels_List.vue'
import WbrNParcelsWhList from '@/lists/WbrNParcels_WhList.vue'
import GtcParcelsList from '@/lists/GtcParcels_List.vue'
import { OZON_COMPANY_ID, WBR_COMPANY_ID, GTC_COMPANY_ID, WBR2_REGISTER_ID, WBRN_REGISTER_ID } from '@/helpers/company.constants.js'
import { OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'
import { isImportCustomsProcedure } from '@/helpers/customs.procedure.helpers.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store.js'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useParcelCheckStatusSubscription } from '@/composables/useParcelCheckStatusSubscription.js'

const props = defineProps({
  id: { type: Number, required: true },
  mode: { type: String, default: OP_MODE_PAPERWORK }
})
const router = useRouter()
const authStore = useAuthStore()
const parcelsStore = useParcelsStore()

const register = ref(null)
const loading = ref(true)
const error = ref(null)
const passportSubscriptionEnabled = computed(() =>
  props.mode === OP_MODE_PAPERWORK &&
  authStore.isSrLogistPlus &&
  isImportCustomsProcedure(register.value?.customsProcedureCode)
)

const filteredRefreshIntervalMs = 500
let filteredRefreshTimer = null
let filteredRefreshRunning = false
let filteredRefreshPending = false
let lastFilteredRefreshAt = 0

async function refreshVisibleParcels() {
  const response = await parcelsStore.getAll(props.id, { updateStore: false })
  parcelsStore.updateItems(response)
}

function scheduleFilteredRefresh() {
  filteredRefreshPending = true
  if (filteredRefreshTimer || filteredRefreshRunning) return

  const delay = Math.max(0, filteredRefreshIntervalMs - (Date.now() - lastFilteredRefreshAt))
  filteredRefreshTimer = setTimeout(async () => {
    filteredRefreshTimer = null
    if (!filteredRefreshPending) return

    filteredRefreshPending = false
    filteredRefreshRunning = true
    lastFilteredRefreshAt = Date.now()
    try {
      await refreshVisibleParcels()
    } catch {
      // Live refresh is best-effort; the existing REST UI remains usable.
    } finally {
      filteredRefreshRunning = false
      if (filteredRefreshPending) scheduleFilteredRefresh()
    }
  }, delay)
}

useParcelCheckStatusSubscription({
  registerId: computed(() => props.id),
  enabled: passportSubscriptionEnabled,
  refresh: refreshVisibleParcels,
  onUpdates: (_change, accepted) => {
    const passportFilter = authStore.parcels_passport_check_status
    if (passportFilter !== null && passportFilter !== undefined &&
        accepted.some(update => update.checkCode === 'passport')) {
      scheduleFilteredRefresh()
    }
  }
})

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
  if (registerType === WBRN_REGISTER_ID) {
    return props.mode === OP_MODE_WAREHOUSE ? WbrNParcelsWhList : WbrNParcelsList
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

onUnmounted(() => {
  if (filteredRefreshTimer) clearTimeout(filteredRefreshTimer)
  filteredRefreshTimer = null
  filteredRefreshPending = false
})

function closeList() {
  router.push({
    path: '/registers',
    query: { mode: props.mode }
  })
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
