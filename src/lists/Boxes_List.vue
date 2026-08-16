<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { mdiMagnify } from '@mdi/js'
import router from '@/router'
import ActionButton from '@/components/ActionButton.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { useBoxesStore } from '@/stores/boxes.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { buildParcelListHeading } from '@/helpers/register.heading.helpers.js'
import { getRegisterNouns, OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { runWithRetryAlert } from '@/helpers/notification.helpers.js'

const props = defineProps({
  registerId: {
    type: Number,
    required: true
  }
})

const authStore = useAuthStore()
const boxesStore = useBoxesStore()
const registersStore = useRegistersStore()
const { boxes, loading: boxesLoading } = storeToRefs(boxesStore)
const { item: register, loading: registerLoading } = storeToRefs(registersStore)

const loading = computed(() => boxesLoading.value || registerLoading.value)
const readOnly = computed(() => register.value?.readOnly === true)
const registerHeading = computed(() =>
  buildParcelListHeading(
    register.value,
    (id) => registersStore.getTransportationDocument(id),
    getRegisterNouns(OP_MODE_WAREHOUSE).singular
  )
)

const headers = [
  { title: '', key: 'actions', align: 'center', sortable: false, width: '56px' },
  { title: 'Номер коробки', key: 'code', sortable: true },
  { title: 'Длина, см', key: 'lengthCm', align: 'end', sortable: true },
  { title: 'Ширина, см', key: 'widthCm', align: 'end', sortable: true },
  { title: 'Высота, см', key: 'heightCm', align: 'end', sortable: true },
  { title: 'Вес, кг', key: 'weightKg', align: 'end', sortable: true }
]

function filterBoxes(value, query, item) {
  const code = (item?.raw ?? item)?.code
  const normalizedQuery = typeof query === 'string' ? query.toLocaleUpperCase() : ''
  return typeof code === 'string' && code.toLocaleUpperCase().includes(normalizedQuery)
}

function formatBoxMetric(value, decimals, fixed = false) {
  if (value === null || value === undefined || value === '') return '—'
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  return number.toLocaleString('ru-RU', {
    minimumFractionDigits: fixed ? decimals : 0,
    maximumFractionDigits: decimals
  })
}

function openCreateView() {
  if (readOnly.value || loading.value) return
  router.push(`/registers/${props.registerId}/boxes/create`)
}

function openEditView(box) {
  if (readOnly.value || loading.value || !box?.id) return
  router.push(`/registers/${props.registerId}/boxes/edit/${box.id}`)
}

function close() {
  router.push({ path: '/registers', query: { mode: OP_MODE_WAREHOUSE } })
}

function loadData() {
  return runWithRetryAlert(
    () =>
      Promise.all([
        registersStore.ensureOpsLoaded(),
        registersStore.getById(props.registerId),
        boxesStore.getAll(props.registerId)
      ]),
    { fallback: 'Не удалось загрузить коробки' }
  )
}

onMounted(loadData)

defineExpose({
  loadData,
  openCreateView,
  openEditView,
  close,
  formatBoxMetric
})
</script>

<template>
  <div class="settings table-2" data-testid="boxes-list">
    <div class="header-with-actions">
      <h1 class="primary-heading">Коробки: {{ registerHeading }}</h1>
      <div class="header-actions-bar">
        <div v-if="loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-plus"
            icon-size="2x"
            tooltip-text="Создать коробку"
            :disabled="loading || readOnly"
            data-testid="box-create-action"
            @click="openCreateView"
          />
          <ActionButton
            :item="{}"
            icon="fa-solid fa-xmark"
            icon-size="2x"
            tooltip-text="Закрыть"
            :disabled="loading"
            data-testid="boxes-close-action"
            @click="close"
          />
        </div>
      </div>
    </div>

    <hr class="hr" />

    <PageAlertRegion />

    <v-text-field
      v-model="authStore.boxes_search"
      :append-inner-icon="mdiMagnify"
      label="Поиск по номеру коробки"
      variant="solo"
      hide-details
      :disabled="loading"
    />

    <v-card class="table-card">
      <v-data-table
        v-model:items-per-page="authStore.boxes_per_page"
        v-model:page="authStore.boxes_page"
        v-model:sort-by="authStore.boxes_sort_by"
        :headers="headers"
        :items="boxes"
        :search="authStore.boxes_search"
        :custom-filter="filterBoxes"
        :loading="loading"
        :items-per-page-options="itemsPerPageOptions"
        items-per-page-text="Коробок на странице"
        page-text="{0}-{1} из {2}"
        item-value="id"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
        data-testid="boxes-table"
      >
        <template #[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать коробку"
              :disabled="loading || readOnly"
              @click="openEditView"
            />
          </div>
        </template>

        <template #[`item.lengthCm`]="{ item }">
          {{ formatBoxMetric(item.lengthCm, 2) }}
        </template>
        <template #[`item.widthCm`]="{ item }">
          {{ formatBoxMetric(item.widthCm, 2) }}
        </template>
        <template #[`item.heightCm`]="{ item }">
          {{ formatBoxMetric(item.heightCm, 2) }}
        </template>
        <template #[`item.weightKg`]="{ item }">
          {{ formatBoxMetric(item.weightKg, 3, true) }}
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<style scoped>
@import '@/assets/styles/scrollable-table.css';
</style>
