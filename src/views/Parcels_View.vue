<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { computed, ref, onMounted, onUnmounted, provide, watch } from 'vue'
import OzonParcelsList from '@/lists/OzonParcels_List.vue'
import OzonParcelsWhList from '@/lists/OzonParcels_WhList.vue'
import WbrParcelsList from '@/lists/WbrParcels_List.vue'
import WbrParcelsWhList from '@/lists/WbrParcels_WhList.vue'
import WbrNParcelsList from '@/lists/WbrNParcels_List.vue'
import WbrNParcelsWhList from '@/lists/WbrNParcels_WhList.vue'
import GtcParcelsList from '@/lists/GtcParcels_List.vue'
import { OZON_COMPANY_ID, WBR_COMPANY_ID, GTC_COMPANY_ID, WBRN_REGISTER_ID } from '@/helpers/company.constants.js'
import { OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'
import { isImportCustomsProcedure } from '@/helpers/customs.procedure.helpers.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store.js'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useParcelCheckStatusSubscription } from '@/composables/useParcelCheckStatusSubscription.js'
import { normalizeInternalReturnUrl } from '@/helpers/parcel.navigation.helpers.js'
import { reportError } from '@/helpers/error.helpers.js'
import { useParcelFiltersStore } from '@/stores/parcel.filters.store.js'
import { REMOVED_PARCEL_FILTER_MESSAGE } from '@/helpers/parcel.filters.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'

const props = defineProps({
  id: { type: Number, required: true },
  mode: { type: String, default: OP_MODE_PAPERWORK },
  boxId: { type: Number, default: null },
  boxCode: { type: String, default: null },
  returnUrl: { type: String, default: null }
})
const router = useRouter()
const authStore = useAuthStore()
const parcelsStore = useParcelsStore()
const registersStore = useRegistersStore()
const alertStore = useAlertStore()
const filterStore = useParcelFiltersStore()
const savedFilters = ref([])
provide('savedParcelFilter', {
  id: computed(() => authStore.parcels_filter_id),
  options: computed(() => [{ title: 'Нет', value: null }, ...savedFilters.value.map(filter => ({ title: filter.name, value: filter.id }))]),
  select: value => authStore.setParcelFilterId(value)
})
let active = true
let loadVersion = 0

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
  const version = loadVersion
const requestedFilterId = authStore.parcels_filter_id
try {
  const response = await parcelsStore.getAll(props.id, {
    updateStore: false,
    ...(props.mode === OP_MODE_WAREHOUSE
      ? { showMarkedByPartner: true }
      : {}),
    ...(props.boxId ? { boxId: props.boxId } : {})
  })
  if (!active || version !== loadVersion || requestedFilterId !== authStore.parcels_filter_id) return false
  parcelsStore.updateItems(response)
  if (response?.parcelFilterRemoved) alertStore.warning(REMOVED_PARCEL_FILTER_MESSAGE)
  return true
} catch (error) {
  if (!active || version !== loadVersion || requestedFilterId !== authStore.parcels_filter_id) {
    // Superseded live refreshes must not change the current rows or page alert.
    reportError(error, { context: 'parcel list refresh after disposal or replacement' })
    return false
  }
  throw error
}
}

async function refreshPassportCheckStateAndVisibleParcels() {
  const version = loadVersion
  try {
    await Promise.all([
      refreshVisibleParcels(),
      registersStore.getById(props.id)
    ])
  } catch (error) {
    if (!active || version !== loadVersion) {
      // The subscription's error handler belongs to the previous page context.
      reportError(error, { context: 'parcel passport refresh after disposal or replacement' })
      return
    }
    throw error
  }
}

function cancelPendingFilteredRefresh() {
  if (filteredRefreshTimer) clearTimeout(filteredRefreshTimer)
  filteredRefreshTimer = null
  filteredRefreshPending = false
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
    const version = loadVersion
    try {
      await refreshVisibleParcels()
    } catch (error) {
      if (active && version === loadVersion) alertStore.error(error, { fallback: 'Не удалось обновить список посылок', action: { label: 'Повторить', handler: refreshVisibleParcels } })
      else {
        // A completed refresh must not publish a message in a new page context.
        reportError(error, { context: 'parcel list refresh error after disposal or replacement' })
      }
    } finally {
      filteredRefreshRunning = false
      if (filteredRefreshPending) scheduleFilteredRefresh()
    }
  }, delay)
}

useParcelCheckStatusSubscription({
  registerId: computed(() => props.id),
  enabled: passportSubscriptionEnabled,
  refresh: refreshPassportCheckStateAndVisibleParcels,
  onUpdates: (_change, accepted) => {
    const passportFilter = authStore.parcels_passport_check_status
    if ((passportFilter != null || authStore.parcels_filter_id != null) &&
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
  if (registerType === WBRN_REGISTER_ID) {
    return props.mode === OP_MODE_WAREHOUSE ? WbrNParcelsWhList : WbrNParcelsList
  }
  return null
})

const listProps = computed(() => ({
  registerId: props.id,
  mode: props.mode,
  boxId: props.boxId,
  boxCode: props.boxCode
}))

async function load() {
  const version = ++loadVersion
const filterSelection = authStore.parcels_filter_id
cancelPendingFilteredRefresh()
try {
  loading.value = true
  error.value = null
  savedFilters.value = []
  const [loadedRegister, filters] = await Promise.all([
    fetchWrapper.get(`${apiUrl}/registers/${props.id}`),
    filterStore.getAll()
  ])
  if (!active || version !== loadVersion || filterSelection !== authStore.parcels_filter_id) return
  savedFilters.value = filters
  if (authStore.parcels_filter_id != null && !filters.some(filter => filter.id === authStore.parcels_filter_id)) {
    authStore.setParcelFilterId(null)
    alertStore.warning(REMOVED_PARCEL_FILTER_MESSAGE)
  }
  register.value = loadedRegister
} catch (err) {
  if (!active || version !== loadVersion || filterSelection !== authStore.parcels_filter_id) {
    // A superseded load must not replace the destination page's alert.
    reportError(err, { context: 'parcel list initialization after disposal or replacement' })
    return
  }
  error.value = err
  alertStore.error(err, { fallback: 'Не удалось загрузить список посылок', action: { label: 'Повторить', handler: load } })
} finally {
  if (active && version === loadVersion) loading.value = false
}
}
onMounted(() => { void load() })
watch(() => [props.id, props.mode, authStore.user?.id], () => { void load() })

onUnmounted(() => {
  active = false
  cancelPendingFilteredRefresh()
})

async function clearBoxScope() {
  if (props.boxId == null) return

  const currentRoute = router.currentRoute.value
  const query = { ...currentRoute.query }
  delete query.boxId
  delete query.boxCode

  try {
    await router.replace({ path: currentRoute.path, query })
  } catch (error) {
    alertStore.error(error, { fallback: 'Не удалось очистить фильтр по коробке' })
  }
}

async function closeList() {
  const returnUrl = normalizeInternalReturnUrl(props.returnUrl)
  const destination =
    returnUrl || {
      path: '/registers',
      query: { mode: props.mode }
    }

  try {
    await router.push(destination)
  } catch (error) {
    alertStore.error(error, { fallback: 'Не удалось закрыть список посылок' })
  }
}
</script>

<template>
  <div v-if="loading">Загрузка...</div>
  <div v-else-if="error" class="settings form-4">
    <h1>Посылки реестра</h1>
    <hr class="hr" />
    <PageAlertRegion />
  </div>
  <Suspense v-else>
    <component
      v-if="listComponent"
      :is="listComponent"
      v-bind="listProps"
      @close="closeList"
      @clear-box-scope="clearBoxScope"
    />
    <div v-else>Неизвестный тип компании</div>
  </Suspense>
</template>
