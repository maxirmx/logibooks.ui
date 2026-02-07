<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useEventsStore } from '@/stores/events.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import ActionButton from '@/components/ActionButton.vue'

const eventsStore = useEventsStore()
const parcelStatusesStore = useParcelStatusesStore()

const { parcelEvents: events, parcelLoading: loading } = storeToRefs(eventsStore)
const { parcelStatuses } = storeToRefs(parcelStatusesStore)

const statusSelections = ref({})
const extDataSelections = ref({})
const saving = ref(false)
const initializing = ref(true)
const errorMessage = ref('')

const hasEvents = computed(() => events.value?.length > 0)

// Headers for events settings table
const headers = [
  { title: 'Событие', key: 'eventTitle', sortable: false },
  { title: 'Статус посылки после события', key: 'parcelStatus', sortable: false },
  { title: 'Голосовая подсказка', key: 'extData', sortable: false, width: '50%' }
]

function getEventTitle(event) {
  return event.eventName || event.eventId
}

function onStatusChange(eventId, value) {
  const newValue = value === '' ? 0 : Number(value)
  statusSelections.value = {
    ...statusSelections.value,
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
    await eventsStore.parcelGetAll()
    statusSelections.value = events.value.reduce((result, item) => {
      result[item.id] = item.parcelStatusId ?? null
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
  <div class="settings form-3" data-testid="parcel-events-processing-settings">
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

      <div v-else-if="hasEvents">
        <v-data-table
          :headers="headers"
          :items="events"
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
</style>