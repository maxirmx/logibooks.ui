<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { mdiMagnify } from '@mdi/js'
import router from '@/router'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import { useCompaniesStore } from '@/stores/companies.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useAirportsStore } from '@/stores/airports.store.js'
import { useRegisterStatusesStore } from '@/stores/register.statuses.store.js'
import { OP_MODE_WAREHOUSE, getRegisterNouns } from '@/helpers/op.mode.js'
import ActionButton from '@/components/ActionButton.vue'
import WarehouseRegistersTable from '@/components/WarehouseRegistersTable.vue'

const registersStore = useRegistersStore()
const warehousesStore = useWarehousesStore()
const companiesStore = useCompaniesStore()
const countriesStore = useCountriesStore()
const airportsStore = useAirportsStore()
const registerStatusesStore = useRegisterStatusesStore()
const { warehouses } = storeToRefs(warehousesStore)

const selectedWarehouseId = ref('')
const selectedPairKey = ref('')
const selectedRegisterIds = ref([])
const pairs = ref([])
const sourceRegisters = ref([])
const sourceTotalCount = ref(0)
const sourceSearch = ref('')
const sourcePage = ref(1)
const sourcePerPage = ref(25)
const sourceSortBy = ref([{ key: 'id', order: 'desc' }])
const isInitializing = ref(true)
const pairsLoading = ref(false)
const registersLoading = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

const warehouseOptions = computed(() => Array.isArray(warehouses.value) ? warehouses.value : [])
const selectedWarehouseNumber = computed(() => Number(selectedWarehouseId.value) || 0)
const selectedPair = computed(() => pairs.value.find((pair) => getPairKey(pair) === selectedPairKey.value) || null)
const registerNouns = computed(() => getRegisterNouns(OP_MODE_WAREHOUSE))
const canSubmit = computed(() =>
  selectedWarehouseNumber.value > 0 &&
  selectedPair.value !== null &&
  selectedRegisterIds.value.length > 0 &&
  !isInitializing.value &&
  !pairsLoading.value &&
  !registersLoading.value &&
  !isSubmitting.value
)
const isBusy = computed(() => isInitializing.value || pairsLoading.value || registersLoading.value || isSubmitting.value)
const sourceTableDisabled = computed(() => !selectedPair.value || isSubmitting.value)

let pairRequestId = 0
let registerRequestId = 0
let sourceSearchTimer = null

onMounted(async () => {
  try {
    await warehousesStore.ensureLoaded()
  } catch (error) {
    errorMessage.value = getErrorText(error, 'Не удалось загрузить склады')
    isInitializing.value = false
    return
  }

  try {
    await countriesStore.ensureLoaded()
    await registersStore.ensureOpsLoaded()
    await registerStatusesStore.ensureLoaded()
    await companiesStore.getAll()
    await airportsStore.getAll()

    if (warehouseOptions.value.length === 1) {
      selectedWarehouseId.value = String(warehouseOptions.value[0].id)
    }
  } catch (error) {
    errorMessage.value = error?.message || 'Не удалось загрузить данные'
  } finally {
    isInitializing.value = false
  }
})

onUnmounted(() => {
  clearSourceSearchTimer()
})

watch(selectedWarehouseId, async () => {
  // Invalidate any in-flight async requests tied to the previous selection.
  pairRequestId += 1
  registerRequestId += 1
  pairsLoading.value = false
  registersLoading.value = false

  selectedPairKey.value = ''
  pairs.value = []
  clearSourceRegisters()

  if (!selectedWarehouseNumber.value) return

  await loadPairs()
})

watch(selectedPairKey, async () => {
  // Invalidate any in-flight request tied to the previous pair selection.
  registerRequestId += 1
  registersLoading.value = false

  clearSourceRegisters()

  if (!selectedPair.value) return

  await loadSourceRegisters()
})

watch([sourcePage, sourcePerPage, sourceSortBy], () => {
  if (!selectedPair.value) return

  clearSourceSearchTimer()
  loadSourceRegisters()
}, { immediate: false })

watch(sourceSearch, () => {
  if (!selectedPair.value) return

  clearSourceSearchTimer()
  sourceSearchTimer = window.setTimeout(() => {
    sourceSearchTimer = null
    if (sourcePage.value !== 1) {
      sourcePage.value = 1
      return
    }

    loadSourceRegisters()
  }, 300)
})

function clearSourceSearchTimer() {
  if (sourceSearchTimer) {
    window.clearTimeout(sourceSearchTimer)
    sourceSearchTimer = null
  }
}

function clearSourceRegisters() {
  clearSourceSearchTimer()
  sourcePage.value = 1
  sourceRegisters.value = []
  sourceTotalCount.value = 0
  selectedRegisterIds.value = []
}

function getPairKey(pair) {
  return `${pair.senderCompanyId}:${pair.receiverCompanyId}`
}

function getPairLabel(pair) {
  const sender = pair.senderCompanyName || pair.senderCompanyId
  const receiver = pair.receiverCompanyName || pair.receiverCompanyId
  return `${sender} / ${receiver}`
}

function getErrorText(error, fallback) {
  if (error == null) return fallback
  if (typeof error === 'string') return error
  const message = error?.message || error?.msg
  return message ? message : fallback
}

async function loadPairs() {
  const requestId = ++pairRequestId
  pairsLoading.value = true
  errorMessage.value = ''
  try {
    const result = await registersStore.getReturnRegisterPairs(selectedWarehouseNumber.value)
    /* v8 ignore next -- stale async response guard */
    if (requestId === pairRequestId) {
      pairs.value = Array.isArray(result) ? result : []
    }
  } catch (error) {
    /* v8 ignore next -- stale async response guard */
    if (requestId === pairRequestId) {
      errorMessage.value = getErrorText(error, 'Не удалось загрузить отправителей и получателей')
    }
  } finally {
    /* v8 ignore next -- stale async response guard */
    if (requestId === pairRequestId) {
      pairsLoading.value = false
    }
  }
}

async function loadSourceRegisters() {
  const pair = selectedPair.value
  /* v8 ignore next -- defensive guard for direct calls outside the pair watcher */
  if (!pair) return

  const requestId = ++registerRequestId
  registersLoading.value = true
  errorMessage.value = ''
  try {
    const result = await registersStore.getRegisters({
      warehouseId: selectedWarehouseNumber.value,
      senderCompanyId: pair.senderCompanyId,
      receiverCompanyId: pair.receiverCompanyId,
      whOnly: true,
      returnSourceOnly: true,
      page: sourcePage.value,
      pageSize: sourcePerPage.value,
      sortBy: sourceSortBy.value?.[0]?.key || 'id',
      sortOrder: sourceSortBy.value?.[0]?.order || 'desc',
      search: sourceSearch.value
    })
    /* v8 ignore next -- stale async response guard */
    if (requestId === registerRequestId) {
      sourceRegisters.value = Array.isArray(result) ? result : (result?.items || [])
      sourceTotalCount.value = Array.isArray(result)
        ? result.length
        : (result?.pagination?.totalCount || 0)
    }
  } catch (error) {
    /* v8 ignore next -- stale async response guard */
    if (requestId === registerRequestId) {
      errorMessage.value = getErrorText(error, 'Не удалось загрузить реестры')
    }
  } finally {
    /* v8 ignore next -- stale async response guard */
    if (requestId === registerRequestId) {
      registersLoading.value = false
    }
  }
}

async function submit() {
  /* v8 ignore next -- OK action is disabled until the same condition is true */
  if (!canSubmit.value || !selectedPair.value) {
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  try {
    const created = await registersStore.createReturnRegister({
      warehouseId: selectedWarehouseNumber.value,
      senderCompanyId: selectedPair.value.senderCompanyId,
      receiverCompanyId: selectedPair.value.receiverCompanyId,
      registerIds: selectedRegisterIds.value
    })
    const createdId = created?.id
    if (!createdId) {
      throw new Error('Сервер не вернул номер созданного реестра')
    }

    router.push(`/registers/${createdId}/parcels?mode=${OP_MODE_WAREHOUSE}`)
  } catch (error) {
    errorMessage.value = getErrorText(error, 'Не удалось создать реестр возврата')
  } finally {
    isSubmitting.value = false
  }
}

function cancel() {
  router.push(`/registers?mode=${OP_MODE_WAREHOUSE}`)
}
</script>

<template>
  <div class="settings form-4 form-compact">
    <div class="header-with-actions">
      <h1 class="primary-heading">Создание реестра возврата</h1>
      <div class="header-actions-bar">
        <div v-if="isBusy" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-check-double"
            tooltip-text="Создать"
            iconSize="2x"
            :disabled="!canSubmit"
            @click="submit"
          />
          <ActionButton
            :item="{}"
            icon="fa-solid fa-xmark"
            tooltip-text="Отменить"
            iconSize="2x"
            :disabled="isSubmitting"
            @click="cancel"
          />
        </div>
      </div>
    </div>

    <hr class="hr" />

    <div class="form-section">
      <div class="form-row">
        <div class="form-group">
          <label class="label" for="return-register-warehouse">Склад:</label>
          <select
            id="return-register-warehouse"
            v-model="selectedWarehouseId"
            class="form-control input"
            :disabled="isInitializing || isSubmitting"
            data-testid="warehouse-select"
          >
            <option value="">Не выбрано</option>
            <option v-for="warehouse in warehouseOptions" :key="warehouse.id" :value="String(warehouse.id)">
              {{ warehouse.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="label" for="return-register-pair">Отправитель / получатель:</label>
          <select
            id="return-register-pair"
            v-model="selectedPairKey"
            class="form-control input"
            :disabled="!selectedWarehouseNumber || pairsLoading || isSubmitting"
            data-testid="pair-select"
          >
            <option value="">Не выбрано</option>
            <option v-for="pair in pairs" :key="getPairKey(pair)" :value="getPairKey(pair)">
              {{ getPairLabel(pair) }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <section class="return-register-source-section">
      <h2 class="secondary-heading">{{ registerNouns.plural }}</h2>

      <v-text-field
        v-model="sourceSearch"
        :append-inner-icon="mdiMagnify"
        :label="`Поиск по любой информации о ${registerNouns.prepositional}`"
        variant="solo"
        hide-details
        :loading="registersLoading"
        :disabled="sourceTableDisabled"
        data-testid="source-register-search"
      />

      <WarehouseRegistersTable
        v-model:items-per-page="sourcePerPage"
        v-model:page="sourcePage"
        v-model:sort-by="sourceSortBy"
        v-model:selected-ids="selectedRegisterIds"
        :items="sourceRegisters"
        :items-length="sourceTotalCount"
        :loading="registersLoading"
        :show-actions="false"
        :selectable="true"
        :links-enabled="false"
        :selection-disabled="sourceTableDisabled || registersLoading"
      />
    </section>

    <div v-if="errorMessage" class="alert alert-danger mt-3 mb-0" data-testid="return-register-error">
      {{ errorMessage }}
    </div>
  </div>
</template>

<style scoped>
.return-register-source-section {
  margin-top: 1.25rem;
}

.secondary-heading {
  color: #495057;
  font-size: 1.35rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
}

</style>
