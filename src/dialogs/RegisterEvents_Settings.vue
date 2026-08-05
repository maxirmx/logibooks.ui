<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useEventsStore } from '@/stores/events.store.js'
import { useRegisterStatusesStore } from '@/stores/register.statuses.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import {
  CUSTOMS_PROCEDURE,
  normalizeCustomsProcedureCode
} from '@/helpers/customs.procedure.helpers.js'
import ActionButton from '@/components/ActionButton.vue'
import RegisterStatusSelect from '@/components/RegisterStatusSelect.vue'

const eventsStore = useEventsStore()
const registerStatusesStore = useRegisterStatusesStore()
const registersStore = useRegistersStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()

const { registerEvents: events, registerLoading: loading } = storeToRefs(eventsStore)
const { registerStatuses } = storeToRefs(registerStatusesStore)
const { ops: registerOps } = storeToRefs(registersStore)
const { registerevents_per_page, registerevents_page } = storeToRefs(authStore)

const statusSelections = ref({})
const saving = ref(false)
const initializing = ref(true)
const initialLoadFailed = ref(false)

const registerEventProcedureSet = new Set(Object.values(CUSTOMS_PROCEDURE))
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
      if (!registerEventProcedureSet.has(code) || seen.has(code)) return null

      seen.add(code)
      const charCode = typeof procedure?.charCode === 'string' ? procedure.charCode.trim() : ''
      const name = typeof procedure?.name === 'string' ? procedure.name.trim() : ''
      const title = [charCode, name].filter(Boolean).join(' ')
      return { value: code, title: title || String(code) }
    })
    .filter(Boolean)
})
const hasProcedureOptions = computed(
  () => procedureOptions.value.length === registerEventProcedureSet.size
)
const filteredEvents = computed(
  () =>
    events.value?.filter(
      (item) =>
        normalizeCustomsProcedureCode(item.customsProcedureCode) ===
        selectedCustomsProcedureCode.value
    ) ?? []
)
const registerStatusOptions = computed(() => [
  { id: 0, title: 'Не менять' },
  ...(registerStatuses.value ?? [])
])

// Headers for events settings table
const headers = [
  { title: 'Событие', key: 'eventTitle', sortable: false, width: '60%' },
  { title: 'Статус после события', key: 'status', sortable: false }
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
  if (
    procedureOptions.value.some((option) => option.value === selectedCustomsProcedureCode.value)
  ) {
    return
  }

  selectedCustomsProcedureCode.value = procedureOptions.value[0]?.value ?? null
}

function onCustomsProcedureChange(value) {
  const code = normalizeCustomsProcedureCode(value)
  if (!procedureOptions.value.some((option) => option.value === code)) return

  selectedCustomsProcedureCode.value = code
  registerevents_page.value = 1
}

function onStatusChange(eventId, value) {
  const newValue = value === '' ? 0 : Number(value)
  statusSelections.value = {
    ...statusSelections.value,
    [eventId]: Number.isNaN(newValue) ? 0 : newValue
  }
}

async function loadData() {
  initializing.value = true
  initialLoadFailed.value = false
  try {
    await registerStatusesStore.ensureLoaded()
    await registersStore.ensureOpsLoaded()
    ensureProcedureOptionsLoaded()
    ensureSelectedCustomsProcedure()
    registerevents_page.value = 1
    await eventsStore.registerGetAll()
    statusSelections.value = events.value.reduce((result, item) => {
      result[item.id] = item.registerStatusId ?? item.statusId ?? item.parcelStatusId ?? null
      return result
    }, {})
  } catch (error) {
    initialLoadFailed.value = true
    alertStore.error(error, {
      fallback: 'Не удалось загрузить настройки событий',
      action: { label: 'Повторить', handler: loadData }
    })
  } finally {
    initializing.value = false
  }
}

async function saveSettings() {
  saving.value = true
  try {
    const payload = events.value.map((item) => ({
      id: item.id,
      registerStatusId: statusSelections.value[item.id] ?? null
    }))

    await eventsStore.registerUpdateMany(payload)
    await loadData()
  } catch (error) {
    alertStore.error(error, { fallback: 'Не удалось сохранить изменения' })
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
  <div class="settings form-3" data-testid="register-events-processing-settings">
    <div class="header-with-actions">
      <h1 class="primary-heading">Обработка событий реестров/партий</h1>
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

    <PageAlertRegion />

    <div v-if="initializing" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>

    <div v-else>
      <div v-if="loading" class="text-center m-5">
        <span class="spinner-border spinner-border-lg align-center"></span>
      </div>

      <div v-else-if="hasEvents && hasProcedureOptions && !initialLoadFailed">
        <div class="register-events-filter-row mb-3">
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
          v-model:items-per-page="registerevents_per_page"
          v-model:page="registerevents_page"
          :items-per-page-options="itemsPerPageOptions"
          :headers="headers"
          :items="filteredEvents"
          item-value="id"
          class="interlaced-table single-line-table register-events-table"
          density="compact"
          :loading="loading"
        >
          <template #[`item.eventTitle`]="{ item }">
            <span :data-testid="`register-event-row-${item.id}`">{{ getEventTitle(item) }}</span>
          </template>
          <template #[`item.status`]="{ item }">
            <RegisterStatusSelect
              :id="`status-select-${item.id}`"
              class="register-event-status-select"
              :model-value="statusSelections[item.id] ?? 0"
              :items="registerStatusOptions"
              variant="outlined"
              density="compact"
              hide-details
              hide-no-data
              :disabled="saving || loading"
              :menu-props="{ minWidth: 260 }"
              @update:model-value="onStatusChange(item.id, $event)"
              :data-testid="`status-select-${item.id}`"
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
.register-events-table :deep(td) {
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.register-events-table :deep(.register-event-status-select) {
  width: 100%;
  box-sizing: border-box;
  margin: 0;
}
</style>
