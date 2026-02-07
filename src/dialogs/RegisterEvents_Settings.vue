<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useEventsStore } from '@/stores/events.store.js'
import { useRegisterStatusesStore } from '@/stores/register.statuses.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import ActionButton from '@/components/ActionButton.vue'

const eventsStore = useEventsStore()
const registerStatusesStore = useRegisterStatusesStore()
const authStore = useAuthStore()

const { registerEvents: events, registerLoading: loading } = storeToRefs(eventsStore)
const { registerStatuses } = storeToRefs(registerStatusesStore)
const { registerevents_per_page, registerevents_page } = storeToRefs(authStore)

const statusSelections = ref({})
const saving = ref(false)
const initializing = ref(true)
const errorMessage = ref('')

const hasEvents = computed(() => events.value?.length > 0)

// Headers for events settings table
const headers = [
  { title: 'Событие', key: 'eventTitle', sortable: false, width: '60%' },
  { title: 'Статус после события', key: 'status', sortable: false }
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
    await registerStatusesStore.ensureLoaded()
    await eventsStore.registerGetAll()
    statusSelections.value = events.value.reduce((result, item) => {
      result[item.id] = item.registerStatusId ?? item.statusId ?? item.parcelStatusId ?? null
      return result
    }, {})
  } catch (error) {
    errorMessage.value = error?.message || 'Не удалось загрузить настройки событий'
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
      registerStatusId: statusSelections.value[item.id] ?? null
    }))

    await eventsStore.registerUpdateMany(payload)
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
          v-model:items-per-page="registerevents_per_page"
          v-model:page="registerevents_page"
          :items-per-page-options="itemsPerPageOptions"
          :headers="headers"
          :items="events"
          item-value="id"
          class="interlaced-table single-line-table register-events-table"
          density="compact"
          :loading="loading"
        >
          <template #[`item.eventTitle`]="{ item }">
            <span :data-testid="`register-event-row-${item.id}`">{{ getEventTitle(item) }}</span>
          </template>
          <template #[`item.status`]="{ item }">
            <select
              class="form-control input-0"
              :id="`status-select-${item.id}`"
              :value="statusSelections[item.id] ?? '0'"
              @change="onStatusChange(item.id, $event.target.value)"
              :data-testid="`status-select-${item.id}`"
            >
              <option value="0">Не менять</option>
              <option v-for="status in registerStatuses" :key="status.id" :value="status.id">
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
    </div>
  </div>
</template>

<style scoped>
/* Ensure select and option elements in the register events table match text styling */
.register-events-table .form-control,
.register-events-table .form-control option,
.register-events-table select,
.register-events-table select option {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

/* Ensure inputs and selects take full column width */
.register-events-table :deep(td) {
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.register-events-table :deep(input[type='text']),
.register-events-table :deep(select) {
  width: 100%;
  box-sizing: border-box;
  margin: 0;
}
</style>