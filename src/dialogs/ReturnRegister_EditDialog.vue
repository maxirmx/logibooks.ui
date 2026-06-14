<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import { OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'
import { formatDate } from '@/helpers/date.formatters.js'
import ActionButton from '@/components/ActionButton.vue'

const registersStore = useRegistersStore()
const warehousesStore = useWarehousesStore()
const { warehouses } = storeToRefs(warehousesStore)

const selectedWarehouseId = ref('')
const selectedPairKey = ref('')
const selectedRegisterIds = ref([])
const pairs = ref([])
const sourceRegisters = ref([])
const isInitializing = ref(true)
const pairsLoading = ref(false)
const registersLoading = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

const warehouseOptions = computed(() => Array.isArray(warehouses.value) ? warehouses.value : [])
const selectedWarehouseNumber = computed(() => Number(selectedWarehouseId.value) || 0)
const selectedPair = computed(() => pairs.value.find((pair) => getPairKey(pair) === selectedPairKey.value) || null)
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

let pairRequestId = 0
let registerRequestId = 0

onMounted(async () => {
  try {
    await warehousesStore.ensureLoaded()
    if (warehouseOptions.value.length === 1) {
      selectedWarehouseId.value = String(warehouseOptions.value[0].id)
    }
  } catch (error) {
    errorMessage.value = error?.message || 'Не удалось загрузить склады'
  } finally {
    isInitializing.value = false
  }
})

watch(selectedWarehouseId, async () => {
  // Invalidate any in-flight async requests tied to the previous selection.
  pairRequestId += 1
  registerRequestId += 1
  pairsLoading.value = false
  registersLoading.value = false

  selectedPairKey.value = ''
  pairs.value = []
  sourceRegisters.value = []
  selectedRegisterIds.value = []

  if (!selectedWarehouseNumber.value) return

  await loadPairs()
})

watch(selectedPairKey, async () => {
  // Invalidate any in-flight request tied to the previous pair selection.
  registerRequestId += 1
  registersLoading.value = false

  sourceRegisters.value = []
  selectedRegisterIds.value = []

  if (!selectedPair.value) return

  await loadSourceRegisters()
})

function getPairKey(pair) {
  return `${pair.senderCompanyId}:${pair.receiverCompanyId}`
}

function getPairLabel(pair) {
  const sender = pair.senderCompanyName || pair.senderCompanyId
  const receiver = pair.receiverCompanyName || pair.receiverCompanyId
  return `${sender} → ${receiver}`
}

function getRegisterLabel(item) {
  const base = item.dealNumber || item.fileName || `#${item.id}`
  return `${base} · ${item.redParcelsCount}`
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
    const result = await registersStore.getReturnRegisterSourceRegisters({
      warehouseId: selectedWarehouseNumber.value,
      senderCompanyId: pair.senderCompanyId,
      receiverCompanyId: pair.receiverCompanyId
    })
    /* v8 ignore next -- stale async response guard */
    if (requestId === registerRequestId) {
      sourceRegisters.value = Array.isArray(result) ? result : []
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

function isRegisterSelected(registerId) {
  return selectedRegisterIds.value.includes(registerId)
}

function toggleRegister(registerId, checked) {
  if (checked) {
    if (!selectedRegisterIds.value.includes(registerId)) {
      selectedRegisterIds.value = [...selectedRegisterIds.value, registerId]
    }
    return
  }

  selectedRegisterIds.value = selectedRegisterIds.value.filter((id) => id !== registerId)
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

    <div class="return-register-table-wrap">
      <table class="return-register-table" data-testid="registers-table">
        <thead>
          <tr>
            <th></th>
            <th>Реестр</th>
            <th>Дата</th>
            <th>Красная зона</th>
            <th>Всего</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="sourceRegisters.length === 0">
            <td colspan="5" class="empty-cell"></td>
          </tr>
          <tr v-for="item in sourceRegisters" :key="item.id">
            <td>
              <input
                type="checkbox"
                :checked="isRegisterSelected(item.id)"
                :disabled="isSubmitting"
                :aria-label="getRegisterLabel(item)"
                data-testid="register-checkbox"
                @change="toggleRegister(item.id, $event.target.checked)"
              />
            </td>
            <td>{{ item.dealNumber || item.fileName || item.id }}</td>
            <td>{{ formatDate(item.date) }}</td>
            <td>{{ item.redParcelsCount }}</td>
            <td>{{ item.parcelsTotal }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="errorMessage" class="alert alert-danger mt-3 mb-0" data-testid="return-register-error">
      {{ errorMessage }}
    </div>
  </div>
</template>

<style scoped>
.return-register-table-wrap {
  margin-top: 18px;
  overflow-x: auto;
}

.return-register-table {
  width: 100%;
  border-collapse: collapse;
}

.return-register-table th,
.return-register-table td {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  padding: 8px;
  text-align: left;
  vertical-align: middle;
}

.return-register-table th:first-child,
.return-register-table td:first-child {
  width: 44px;
  text-align: center;
}

.empty-cell {
  height: 40px;
}

</style>
