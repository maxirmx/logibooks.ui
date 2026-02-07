<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useEventsStore } from '@/stores/events.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'

const eventsStore = useEventsStore()
const parcelStatusesStore = useParcelStatusesStore()

const { parcelEvents: events, parcelLoading: loading } = storeToRefs(eventsStore)
const { parcelStatuses } = storeToRefs(parcelStatusesStore)

const statusSelections = ref({})
const saving = ref(false)
const initializing = ref(true)
const errorMessage = ref('')

const hasEvents = computed(() => events.value?.length > 0)

// Headers for events settings table
const headers = [
  { title: 'Событие', key: 'eventTitle', sortable: false, width: '60%' },
  { title: 'Статус посылки после события', key: 'parcelStatus', sortable: false }
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
      parcelStatusId: statusSelections.value[item.id] ?? null
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
  <div class="settings form-2" data-testid="parcel-events-processing-settings">
    <h1 class="primary-heading">Обработка событий</h1>
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
          <template #no-data>
            <div class="text-center m-5">Список событий пуст</div>
          </template>
        </v-data-table>
      </div>

      <div v-else class="text-center m-5">Список событий пуст</div>

      <div class="form-group mt-8">
        <button class="button primary" type="button" :disabled="saving || initializing" @click="saveSettings">
          <span v-show="saving" class="spinner-border spinner-border-sm mr-1"></span>
          <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
          Сохранить
        </button>
        <button class="button secondary" type="button" :disabled="saving" @click="cancel">
          <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
          Отменить
        </button>
      </div>
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
</style>