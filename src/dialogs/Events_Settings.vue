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

onMounted(loadData)
</script>

<template>
  <v-container class="d-flex flex-column justify-center align-center fill-height">
    <v-card class="pa-4 ma-2" elevation="8" min-width="480" max-width="720">
      <v-card-title class="text-h5 justify-center">Обработка событий</v-card-title>
      <v-card-text>
        <template v-if="errorMessage">
          <v-alert type="error" dismissible class="mb-4">{{ errorMessage }}</v-alert>
        </template>

        <v-skeleton-loader v-if="initializing" type="table" />

        <template v-else-if="hasEvents">
          <v-data-table :headers="headers" :items="events" :loading="loading" item-value="id" density="compact">
            <template #[`item.eventTitle`]="{ item }">
              <span :data-testid="`parcel-event-row-${item.id}`">{{ getEventTitle(item) }}</span>
            </template>
            <template #[`item.parcelStatus`]="{ item }">
              <select
                :id="`status-select-${item.id}`"
                class="v-select"
                :value="statusSelections[item.id] ?? ''"
                @change="onStatusChange(item.id, $event.target.value)"
              >
                <option value="">Не выбрано</option>
                <option v-for="status in parcelStatuses" :key="status.id" :value="status.id">
                  {{ status.title }}
                </option>
              </select>
            </template>
          </v-data-table>
        </template>
        <template v-else>
          <v-alert type="info">Нет событий для настройки</v-alert>
        </template>
      </v-card-text>
      <v-card-actions class="justify-center">
        <button class="button primary" :disabled="saving || initializing" @click="saveSettings">
          <font-awesome-icon icon="save" class="icon" />
          Сохранить
        </button>
        <button class="button" @click="cancel">
          <font-awesome-icon icon="xmark" class="icon" />
          Отменить
        </button>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<style scoped>
.v-select {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  min-width: 180px;
}
</style>
