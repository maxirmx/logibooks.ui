<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useEventsStore } from '@/stores/events.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { CUSTOMS_PROCEDURE, normalizeCustomsProcedureCode } from '@/helpers/customs.procedure.helpers.js'
import ActionButton from '@/components/ActionButton.vue'

const eventsStore = useEventsStore()
const parcelStatusesStore = useParcelStatusesStore()
const warehousesStore = useWarehousesStore()
const registersStore = useRegistersStore()
const authStore = useAuthStore()

const { parcelEvents: events, parcelLoading: loading } = storeToRefs(eventsStore)
const { parcelStatuses } = storeToRefs(parcelStatusesStore)
const { ops: warehouseOps } = storeToRefs(warehousesStore)
const { ops: registerOps } = storeToRefs(registersStore)
const { parcelevents_per_page, parcelevents_page } = storeToRefs(authStore)

const statusSelections = ref({})
const zoneSelections = ref({})
const extDataSelections = ref({})
const saving = ref(false)
const initializing = ref(true)
const errorMessage = ref('')

const parcelEventProcedureSet = new Set(Object.values(CUSTOMS_PROCEDURE))
const selectedCustomsProcedureCode = ref(null)

const hasEvents = computed(() => events.value?.length > 0)
const procedureOptions = computed(() => {
  const customsProcedures = Array.isArray(registerOps.value?.customsProcedures)
    ? registerOps.value.customsProcedures
    : []

  const seen = new Set()

  return customsProcedures
    .map((procedure) => {
      const code = normalizeCustomsProcedureCode(procedure?.value)
      if (!parcelEventProcedureSet.has(code) || seen.has(code)) return null

      seen.add(code)

      const charCode = typeof procedure?.charCode === 'string' ? procedure.charCode.trim() : ''
      const name = typeof procedure?.name === 'string' ? procedure.name.trim() : ''
      const title = [charCode, name].filter(Boolean).join(' ')

      return { value: code, title: title || String(code) }
    })
    .filter(Boolean)
})
const hasProcedureOptions = computed(() => procedureOptions.value.length === parcelEventProcedureSet.size)
const filteredEvents = computed(() =>
  events.value?.filter(
    (item) => normalizeCustomsProcedureCode(item.customsProcedureCode) === selectedCustomsProcedureCode.value
  ) ?? []
)

// Headers for events settings table
const headers = [
  { title: 'Событие', key: 'eventTitle', sortable: false, width: '25%' },
  { title: 'Статус посылки после события', key: 'parcelStatus', sortable: false, width: '25%' },
  { title: 'Зона хранения после события', key: 'zone', sortable: false, width: '25%' },
  { title: 'Голосовая подсказка', key: 'extData', sortable: false, width: '25%' }
]

function getEventTitle(event) {
  return event.eventName || event.eventId
}

function ensureProcedureOptionsLoaded() {
  if (!hasProcedureOptions.value) {
    throw new Error('Не удалось загрузить таможенные процедуры')
  }
}

function ensureSelectedCustomsProcedure() {
  if (procedureOptions.value.some((option) => option.value === selectedCustomsProcedureCode.value)) {
    return
  }

  selectedCustomsProcedureCode.value = procedureOptions.value[0]?.value ?? null
}

function onCustomsProcedureChange(value) {
  const code = normalizeCustomsProcedureCode(value)
  if (!procedureOptions.value.some((option) => option.value === code)) return

  selectedCustomsProcedureCode.value = code
  parcelevents_page.value = 1
}

function onStatusChange(eventId, value) {
  const newValue = value === '' ? 0 : Number(value)
  statusSelections.value = {
    ...statusSelections.value,
    [eventId]: Number.isNaN(newValue) ? 0 : newValue
  }
}

function onZoneChange(eventId, value) {
  const newValue = value === '' ? 0 : Number(value)
  zoneSelections.value = {
    ...zoneSelections.value,
    [eventId]: Number.isNaN(newValue) ? 0 : newValue
  }
}

function onExtDataChange(eventId, value) {
  extDataSelections.value = {
    ...extDataSelections.value,
    [eventId]: value
  }
}

async function loadData() {
  initializing.value = true
  errorMessage.value = ''
  try {
    await parcelStatusesStore.ensureLoaded()
    await warehousesStore.ensureOpsLoaded()
    await registersStore.ensureOpsLoaded()
    ensureProcedureOptionsLoaded()
    ensureSelectedCustomsProcedure()
    parcelevents_page.value = 1
    await eventsStore.parcelGetAll()
    statusSelections.value = events.value.reduce((result, item) => {
      result[item.id] = item.parcelStatusId ?? null
      return result
    }, {})
    zoneSelections.value = events.value.reduce((result, item) => {
      result[item.id] = item.zone ?? null
      return result
    }, {})
    extDataSelections.value = events.value.reduce((result, item) => {
      result[item.id] = item.extData ?? ''
      return result
    }, {})
  } catch (error) {
    errorMessage.value = error?.message || 'Не удалось загрузить настройки событий посылок'
  } finally {
    initializing.value = false
  }
}

async function saveSettings() {
  saving.value = true
  errorMessage.value = ''
  try {
    const payload = events.value.map((item) => ({
      id: item.id,
      parcelStatusId: statusSelections.value[item.id] ?? null,
      zone: zoneSelections.value[item.id] ?? null,
      extData: extDataSelections.value[item.id] ?? null
    }))

    await eventsStore.parcelUpdateMany(payload)
    await loadData()
  } catch (error) {
    errorMessage.value = error?.message || 'Не удалось сохранить изменения'
  } finally {
    saving.value = false
  }
}

function cancel() {
  router.back()
}

onMounted(async () => {
  await loadData()
})
</script>

<template>
  <div class="settings table-3" data-testid="parcel-events-processing-settings">
    <div class="header-with-actions">
      <h1 class="primary-heading">Обработка событий посылок</h1>
      <div class="header-actions">
        <ActionButton
          :item="{}"
          icon="fa-solid fa-check-double"
          :iconSize="'2x'"
          tooltip-text="Сохранить"
          :disabled="saving || initializing"
          data-testid="save-button"
          @click="saveSettings"
        />
        <ActionButton
          :item="{}"
          icon="fa-solid fa-xmark"
          :iconSize="'2x'"
          tooltip-text="Отменить"
          :disabled="saving"
          data-testid="cancel-button"
          @click="cancel"
        />
      </div>
    </div>
    <hr class="hr" />

    <div v-if="initializing" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>

    <div v-else>
      <div v-if="errorMessage" class="alert alert-danger mt-3 mb-0">{{ errorMessage }}</div>

      <div v-if="loading" class="text-center m-5">
        <span class="spinner-border spinner-border-lg align-center"></span>
      </div>

      <div v-else-if="hasEvents && hasProcedureOptions && !errorMessage">
        <div class="parcel-events-filter-row mb-3">
          <v-select
            :model-value="selectedCustomsProcedureCode"
            :items="procedureOptions"
            label="Таможенная процедура"
            variant="solo"
            hide-details
            :loading="loading || initializing"
            :disabled="saving || initializing"
            class="procedure-filter"
            data-testid="customs-procedure-select"
            @update:model-value="onCustomsProcedureChange"
          />
        </div>

        <v-data-table
          v-model:items-per-page="parcelevents_per_page"
          v-model:page="parcelevents_page"
          :items-per-page-options="itemsPerPageOptions"
          :headers="headers"
          :items="filteredEvents"
          item-value="id"
          class="interlaced-table single-line-table parcel-events-table"
          density="compact"
          :loading="loading"
        >
          <template #[`item.eventTitle`]="{ item }">
            <span :data-testid="`parcel-event-row-${item.id}`">{{ getEventTitle(item) }}</span>
          </template>
          <template #[`item.parcelStatus`]="{ item }">
            <select
              class="form-control input-0"
              :id="`status-select-${item.id}`"
              :value="statusSelections[item.id] ?? '0'"
              @change="onStatusChange(item.id, $event.target.value)"
              :data-testid="`status-select-${item.id}`"
            >
              <option value="0">Не менять</option>
              <option v-for="status in parcelStatuses" :key="status.id" :value="status.id">
                {{ status.title }}
              </option>
            </select>
          </template>
          <template #[`item.zone`]="{ item }">
            <select
              class="form-control input-0"
              :id="`zone-select-${item.id}`"
              :value="zoneSelections[item.id] ?? '0'"
              @change="onZoneChange(item.id, $event.target.value)"
              :data-testid="`zone-select-${item.id}`"
            >
              <option value="0">Не менять</option>
              <option
                v-for="zone in warehouseOps.zones"
                :key="zone.value"
                :value="zone.value"
              >
                {{ zone.name }}
              </option>
            </select>
          </template>
          <template #[`item.extData`]="{ item }">
            <input
              type="text"
              class="form-control input-0"
              :id="`extdata-input-${item.id}`"
              :value="extDataSelections[item.id] ?? ''"
              @input="onExtDataChange(item.id, $event.target.value)"
              :data-testid="`extdata-input-${item.id}`"
            />
          </template>
          <template #no-data>
            <div class="text-center m-5">Список событий пуст</div>
          </template>
        </v-data-table>
      </div>

      <div v-else class="text-center m-5">Список событий пуст</div>
    </div>
  </div>
</template>

<style scoped>
.parcel-events-filter-row {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.procedure-filter {
  flex: 0 0 220px !important;
  width: 220px;
  max-width: 220px;
  min-width: 220px;
}

.procedure-filter :deep(.v-field__input) {
  min-width: 0;
}

/* Ensure select and option elements in the parcel events table match text styling */
.parcel-events-table .form-control,
.parcel-events-table .form-control option,
.parcel-events-table select,
.parcel-events-table select option {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

/* Ensure inputs and selects take full column width */
.parcel-events-table :deep(td) {
  padding-left: 0px !important;
  padding-right: 0px !important;
}

.parcel-events-table :deep(input[type='text']),
.parcel-events-table :deep(select) {
  width: 100%;
  box-sizing: border-box;
  margin: 0;
}

@media (max-width: 700px) {
  .parcel-events-filter-row {
    flex-direction: column;
  }

  .procedure-filter {
    flex: 0 1 auto !important;
    width: 100%;
    max-width: none;
    min-width: 0;
  }
}
</style>
