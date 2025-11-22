<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useParcelProcessingEventsStore } from '@/stores/parcel.processing.events.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'

const parcelProcessingEventsStore = useParcelProcessingEventsStore()
const parcelStatusesStore = useParcelStatusesStore()

const { events, loading } = storeToRefs(parcelProcessingEventsStore)
const { parcelStatuses } = storeToRefs(parcelStatusesStore)

const statusSelections = ref({})
const saving = ref(false)
const initializing = ref(true)
const errorMessage = ref('')

const hasEvents = computed(() => events.value?.length > 0)

function getEventTitle(event) {
  return event.eventName || event.eventId
}

function onStatusChange(eventId, value) {
  const newValue = value === '' ? null : Number(value)
  statusSelections.value = {
    ...statusSelections.value,
    [eventId]: Number.isNaN(newValue) ? null : newValue
  }
}

async function loadData() {
  initializing.value = true
  errorMessage.value = ''
  try {
    await parcelStatusesStore.ensureLoaded()
    await parcelProcessingEventsStore.getAll()
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

    await parcelProcessingEventsStore.updateMany(payload)
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
    <h1 class="primary-heading">Настройки обработки событий посылок</h1>
    <hr class="hr" />

    <div v-if="initializing" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>

    <div v-else>
      <div v-if="errorMessage" class="alert alert-danger mt-3 mb-0">{{ errorMessage }}</div>

      <div v-if="loading" class="text-center m-5">
        <span class="spinner-border spinner-border-lg align-center"></span>
      </div>

      <div v-else-if="hasEvents" class="parcel-events-table">
        <div class="table-header">
          <div class="table-cell">Событие</div>
          <div class="table-cell">Статус посылки</div>
        </div>
        <div
          v-for="event in events"
          :key="event.id"
          class="table-row"
          data-testid="parcel-event-row"
        >
          <div class="table-cell label" :data-testid="`event-title-${event.id}`">{{ getEventTitle(event) }}</div>
          <div class="table-cell selector">
            <select
              class="form-control input"
              :id="`status-select-${event.id}`"
              :value="statusSelections[event.id] ?? ''"
              @change="onStatusChange(event.id, $event.target.value)">
              <option value="">Не выбрано</option>
              <option
                v-for="status in parcelStatuses"
                :key="status.id"
                :value="status.id"
              >
                {{ status.title }}
              </option>
            </select>
          </div>
        </div>
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
