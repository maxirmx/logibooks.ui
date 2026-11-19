<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ActionButton from '@/components/ActionButton.vue'
import FieldError from '@/components/FieldError.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { apiUrl } from '@/helpers/config.js'
import { reportError, reportFormError } from '@/helpers/error.helpers.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { recoverPageLoad } from '@/helpers/login.navigation.js'
import { useAlertStore } from '@/stores/alert.store.js'

const headers = [
  { title: 'Дата решения (МСК)', key: 'decisionAt' },
  { title: 'CMR', key: 'cmrNumber' },
  { title: 'Номер посылки', key: 'parcelNumber' },
  { title: 'ДТЭГ/ПТДЭГ', key: 'decCode', sortable: false },
  { title: 'Код решения', key: 'decisionCode', sortable: false },
  { title: 'Результат обработки', key: 'processingResult', sortable: false }
]
const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Europe/Moscow'
})
const fallback = 'Не удалось загрузить журнал синхронизации Альта Софт'
const emptyFilters = { from: '', to: '', cmrNumber: '', parcelNumber: '' }
const textFilters = [
  { name: 'cmrNumber', label: 'CMR', id: 'alta-journal-cmr' },
  { name: 'parcelNumber', label: 'Номер посылки', id: 'alta-journal-parcel' }
]
const draft = reactive({ ...emptyFilters })
const applied = ref({ ...emptyFilters })
const errors = ref({})
const page = ref(1)
const pageSize = ref(50)
const sortBy = ref([{ key: 'decisionAt', order: 'desc' }])
const result = ref(null)
const loading = ref(false)
const router = useRouter()
const alertStore = useAlertStore()
const emptyText = computed(() => Object.values(applied.value).some(Boolean)
  ? 'По заданным фильтрам записи не найдены'
  : 'В журнале пока нет записей')
const items = computed(() => result.value?.items.map(row => ({
  ...row,
  decisionAt: row.decisionAt ? dateFormatter.format(new Date(row.decisionAt)) : '—',
  cmrNumber: row.cmrNumber || '—',
  parcelNumber: row.parcelNumber || '—',
  decCode: row.decCode || '—'
})) ?? [])

function applyFilters() {
  if (draft.from && draft.to && draft.from > draft.to) {
    errors.value = { to: 'Дата окончания периода должна быть не раньше даты начала' }
    return
  }

  errors.value = {}
  page.value = 1
  applied.value = {
    ...draft,
    cmrNumber: draft.cmrNumber.trim(),
    parcelNumber: draft.parcelNumber.trim()
  }
}

function resetFilters() {
  Object.assign(draft, emptyFilters)
  applyFilters()
}

watch([page, pageSize, sortBy, applied], async ([number, size, [sort], filters], _, onCleanup) => {
  let current = true
  onCleanup(() => { current = false })
  loading.value = true

  const params = new URLSearchParams({
    page: String(number),
    pageSize: String(size),
    sortBy: sort.key,
    sortOrder: sort.order
  })
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }

  try {
    const response = await fetchWrapper.get(`${apiUrl}/alta/sync-journal?${params}`)
    if (current) result.value = response
  } catch (error) {
    if (!current) {
      // The query was replaced or the page closed. Keep the failure in diagnostics only.
      reportError(error, { context: 'Alta sync journal query after navigation or filter change' })
      return
    }

    result.value = null
    if (error?.status !== 400) {
      await recoverPageLoad(router, error, fallback)
      return
    }

    reportFormError(error, {
      setErrors: value => { errors.value = value },
      alertStore,
      fallback,
      visibleFields: Object.keys(emptyFilters)
    })
  } finally {
    if (current) loading.value = false
  }
}, { immediate: true })
</script>

<template>
  <div class="settings table-3 list-with-filters">
    <div class="header-with-actions">
      <h1 class="primary-heading">Журнал синхронизации Альта Софт</h1>
      <div class="header-actions-bar">
        <div v-if="loading" class="header-actions header-actions-group" role="status" aria-label="Загрузка журнала">
          <span class="spinner-border spinner-border-m"></span>
        </div>
      </div>
    </div>

    <hr class="hr" />

    <PageAlertRegion />

    <form class="journal-filters list-filters" aria-label="Фильтры журнала" @submit.prevent="applyFilters">
      <fieldset class="journal-date-range">
        <legend>Дата таможенного решения (МСК)</legend>
        <div v-for="(label, name) in { from: 'С', to: 'по' }" :key="name" class="journal-date-field">
          <label class="journal-date-control">
            <span>{{ label }}</span>
            <input
              :id="`alta-journal-${name}`"
              v-model="draft[name]"
              type="datetime-local"
              class="form-control input"
              :aria-invalid="Boolean(errors[name])"
              :aria-describedby="errors[name] ? `alta-journal-${name}-error` : undefined"
            />
          </label>
          <FieldError :id="`alta-journal-${name}-error`" :name="name" :errors="errors" />
        </div>
      </fieldset>
      <div v-for="{ name, label, id } in textFilters" :key="name" class="journal-text-field">
        <label :for="id">
          <span>{{ label }}</span>
          <input
            :id="id"
            v-model="draft[name]"
            type="text"
            class="form-control input"
            :aria-invalid="Boolean(errors[name])"
            :aria-describedby="errors[name] ? `${id}-error` : undefined"
          />
        </label>
        <FieldError :id="`${id}-error`" :name="name" :errors="errors" />
      </div>
      <div class="journal-filter-actions">
        <ActionButton
          :item="{}"
          type="submit"
          icon="fa-solid fa-filter"
          tooltip-text="Применить фильтры"
          aria-label="Применить фильтры"
        />
        <ActionButton
          :item="{}"
          icon="fa-solid fa-filter-circle-xmark"
          tooltip-text="Сбросить фильтры"
          aria-label="Сбросить фильтры"
          @click="resetFilters"
        />
      </div>
    </form>

    <v-card v-if="result" class="table-card">
      <v-data-table-server
        v-model:page="page"
        v-model:items-per-page="pageSize"
        v-model:sort-by="sortBy"
        :headers="headers"
        :items="items"
        :items-length="result.pagination.totalCount"
        :items-per-page-options="[25, 50, 100]"
        :loading="loading"
        :no-data-text="emptyText"
        items-per-page-text="Записей на странице"
        page-text="{0}-{1} из {2}"
        item-value="id"
        density="compact"
        must-sort
        class="elevation-1 interlaced-table"
      />
    </v-card>
  </div>
</template>

<style scoped>
.journal-filters,
.journal-date-range {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.75rem;
  min-width: 0;
}

.journal-date-range legend {
  float: none;
  width: auto;
  margin-bottom: 0.25rem;
  font-size: inherit;
}

.journal-date-field {
  width: min(100%, 15.5rem);
}

.journal-date-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.journal-date-control input {
  flex: 1;
  min-width: 0;
}

.journal-text-field {
  width: min(100%, 12rem);
}

.journal-text-field label {
  display: grid;
  gap: 0.25rem;
  margin: 0;
}

.journal-filter-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.75rem;
}
</style>
