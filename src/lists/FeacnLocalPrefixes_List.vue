<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { onMounted, computed, ref, unref } from 'vue'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useFeacnPrefixesStore } from '@/stores/feacn.prefixes.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import ActionButton from '@/components/ActionButton.vue'
import { useAppConfirm } from '@/composables/useAppConfirm.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import {
  prohibitionScopeFilterItems,
  getProhibitionScopeLabels,
  getProhibitionScopeSortOrder,
  getProhibitionScopeRows,
  getProhibitionReasonLines,
  matchesProhibitionScope
} from '@/helpers/prohibition.scope.helpers.js'
import { mdiMagnify } from '@mdi/js'
import { runWithRetryAlert } from '@/helpers/notification.helpers.js'
import {
  preloadFeacnInfo,
  loadFeacnTooltipOnHover,
  useFeacnTooltips
} from '@/helpers/feacn.info.helpers.js'

const prefixesStore = useFeacnPrefixesStore()
const countriesStore = useCountriesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const confirm = useAppConfirm()

const { prefixes, loading } = storeToRefs(prefixesStore)
const runningAction = ref(false)
// Shared FEACN info cache
const feacnTooltips = useFeacnTooltips()

// Tooltip width limitation
const tooltipMaxWidth = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.innerWidth * 0.5}px`
  }
  return '400px'
})

// Custom filter function for v-data-table
function filterLocalPrefixes(value, query, item) {
  if (query === null || item === null) {
    return false
  }
  const i = item.raw
  if (i === null) {
    return false
  }
  const q = query.toLocaleUpperCase()
  const procedureText = getProhibitionScopeLabels(i, countriesStore.getCountryShortName).join(' ')
  const reasonText = getProhibitionReasonLines(i).join(' ')

  return (
    (i.code?.toLocaleUpperCase() ?? '').indexOf(q) !== -1 ||
    (i.description?.toLocaleUpperCase() ?? '').indexOf(q) !== -1 ||
    procedureText.toLocaleUpperCase().indexOf(q) !== -1 ||
    reasonText.toLocaleUpperCase().indexOf(q) !== -1 ||
    (feacnTooltips.value[i.code]?.name?.toLocaleUpperCase() ?? '').indexOf(q) !== -1 ||
    (i.exceptions?.some((exc) => {
      const exceptionCode = getExceptionCode(exc)
      return (
        exceptionCode.toLocaleUpperCase().includes(q) ||
        (feacnTooltips.value[exceptionCode]?.name?.toLocaleUpperCase() ?? '').indexOf(q) !== -1
      )
    }) ??
      false)
  )
}

const filteredPrefixes = computed(() => {
  const procedureFilter = unref(authStore.feacnlocalprefixes_procedure)
  const countryFilter = unref(authStore.feacnlocalprefixes_country)
  if (procedureFilter !== 'all' || countryFilter !== 'all') {
    return prefixes.value.filter((prefix) =>
      matchesProhibitionScope(prefix, procedureFilter, countryFilter)
    )
  }
  return prefixes.value
})

const countryFilterItems = computed(() => [
  { title: 'Любая', value: 'all' },
  ...countriesStore.countries.map((country) => ({
    title: countriesStore.getCountryShortName(country.isoNumeric),
    value: country.isoNumeric
  }))
])

const tablePrefixes = computed(() =>
  filteredPrefixes.value.map((prefix) => ({
    ...prefix,
    procedure: getProhibitionScopeSortOrder(prefix)
  }))
)

const headers = [
  ...(authStore.isSrLogistPlus
    ? [{ title: '', align: 'center', key: 'actions', sortable: false }]
    : []),
  { title: 'Префикс', key: 'code', align: 'start' },
  { title: 'Описание', key: 'description', align: 'start' },
  { title: 'Исключения', key: 'exceptions', align: 'start' },
  { title: 'Страна', key: 'country', align: 'start', sortable: false },
  { title: 'Процедура', key: 'procedure', align: 'start' },
  { title: 'Причина запрета', key: 'prohibitionReason', align: 'start', sortable: false }
]

async function loadPrefixes() {
  await prefixesStore.getAll()
  const codes = prefixes.value.map((prefix) => prefix.code)
  const exceptionCodes = prefixes.value.flatMap((prefix) =>
    prefix.exceptions ? prefix.exceptions.map((exception) => getExceptionCode(exception)) : []
  )
  await preloadFeacnInfo([...codes, ...exceptionCodes])
}

onMounted(() =>
  runWithRetryAlert(() => Promise.all([countriesStore.ensureLoaded(), loadPrefixes()]), {
    fallback: 'Не удалось загрузить локальные префиксы'
  })
)

// Helper function to get exception code from either string or FeacnPrefixExceptionDto
function getExceptionCode(exception) {
  return typeof exception === 'string' ? exception : exception.code
}

// Helper function to get unique key for exception items
function getExceptionKey(exception, index) {
  return typeof exception === 'string' ? exception : `${exception.id || index}-${exception.code}`
}

function openCreateDialog() {
  router.push('/feacn/prefix/create')
}

function openEditDialog(item) {
  router.push(`/feacn/prefix/edit/${item.id}`)
}

async function deletePrefix(item) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    const confirmed = await confirm({
      title: 'Подтверждение',
      confirmationText: 'Удалить',
      cancellationText: 'Не удалять',
      content: 'Удалить префикс?'
    })

    if (confirmed) {
      try {
        await prefixesStore.remove(item.id)
      } catch {
        alertStore.error('Ошибка при удалении префикса')
      }
    }
  } finally {
    runningAction.value = false
  }
}

// Expose for testing
defineExpose({
  openCreateDialog,
  openEditDialog,
  deletePrefix,
  getExceptionCode,
  getExceptionKey,
  getProhibitionScopeLabels,
  getProhibitionScopeSortOrder,
  getProhibitionScopeRows,
  getProhibitionReasonLines,
  prohibitionScopeFilterItems,
  countryFilterItems,
  filteredPrefixes,
  tablePrefixes,
  filterLocalPrefixes
})
</script>

<template>
  <div class="settings table-3" data-testid="feacn-prefixes-list">
    <div class="header-with-actions">
      <h1 class="primary-heading">Префиксы ТН ВЭД для формирования запретов</h1>
      <div class="header-actions-bar" v-if="authStore.isSrLogistPlus">
        <div v-if="runningAction || loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-plus"
            tooltip-text="Добавить префикс"
            iconSize="2x"
            :disabled="runningAction || loading"
            @click="openCreateDialog"
          />
        </div>
      </div>
    </div>

    <hr class="hr" />

    <PageAlertRegion />

    <div class="prefix-filter-row">
      <v-select
        v-model="authStore.feacnlocalprefixes_procedure"
        :items="prohibitionScopeFilterItems"
        label="Таможенная процедура"
        variant="solo"
        hide-details
        :disabled="runningAction || loading"
        class="procedure-filter"
      />
      <v-autocomplete
        v-model="authStore.feacnlocalprefixes_country"
        :items="countryFilterItems"
        label="Страна"
        variant="solo"
        hide-details
        :disabled="runningAction || loading"
        class="country-filter"
      />
      <v-text-field
        v-model="authStore.feacnlocalprefixes_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по префиксам ТН ВЭД"
        variant="solo"
        hide-details
        :disabled="runningAction || loading"
      />
    </div>

    <v-card class="table-card">
      <v-data-table
        v-model:items-per-page="authStore.feacnlocalprefixes_per_page"
        items-per-page-text="Префиксов на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="authStore.feacnlocalprefixes_page"
        :headers="headers"
        :items="tablePrefixes"
        :search="authStore.feacnlocalprefixes_search"
        v-model:sort-by="authStore.feacnlocalprefixes_sort_by"
        :custom-filter="filterLocalPrefixes"
        :loading="loading"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
      >
        <template v-slot:[`item.code`]="{ item }">
          <span>{{ item.code }}</span>
        </template>

        <template v-slot:[`item.country`]="{ item }">
          <template
            v-for="scopeRows in [getProhibitionScopeRows(item, countriesStore.getCountryShortName)]"
            :key="scopeRows.map((row) => row.key).join('-')"
          >
            <span v-if="scopeRows.length" class="procedure-lines">
              <span v-for="row in scopeRows" :key="row.key" class="procedure-line">
                {{ row.country }}
              </span>
            </span>
            <span v-else>-</span>
          </template>
        </template>

        <template v-slot:[`item.procedure`]="{ item }">
          <template
            v-for="procedureRows in [getProhibitionScopeRows(item, countriesStore.getCountryShortName)]"
            :key="procedureRows.map((row) => row.key).join('-')"
          >
            <span
              v-if="procedureRows.length"
              :key="`${procedureRows.map((row) => row.key).join('-')}-lines`"
              class="procedure-lines"
            >
              <span v-for="row in procedureRows" :key="row.key" class="procedure-line">
                {{ row.procedure }}
              </span>
            </span>
            <span v-else :key="`${procedureRows.map((row) => row.key).join('-')}-empty`">-</span>
          </template>
        </template>

        <template v-slot:[`item.description`]="{ item }">
          {{ feacnTooltips[item.code]?.name || '-' }}
        </template>

        <template v-slot:[`item.exceptions`]="{ item }">
          <span v-if="item.exceptions && item.exceptions.length">
            <span
              v-for="(exception, index) in item.exceptions"
              :key="getExceptionKey(exception, index)"
            >
              <v-tooltip location="top" content-class="feacn-tooltip" :max-width="tooltipMaxWidth">
                <template v-slot:activator="{ props }">
                  <span
                    v-bind="props"
                    class="feacn-code-tooltip"
                    @mouseenter="loadFeacnTooltipOnHover(getExceptionCode(exception))"
                  >
                    {{ getExceptionCode(exception) }}
                  </span>
                </template>
                <span>{{
                  feacnTooltips[getExceptionCode(exception)]?.name || 'Наведите для загрузки...'
                }}</span>
              </v-tooltip>
              <span v-if="index < item.exceptions.length - 1">, </span>
            </span>
          </span>
          <span v-else>-</span>
        </template>

        <template v-slot:[`item.prohibitionReason`]="{ item }">
          <template
            v-for="procedureRows in [getProhibitionScopeRows(item, countriesStore.getCountryShortName)]"
            :key="procedureRows.map((row) => row.key).join('-')"
          >
            <span v-if="procedureRows.length" class="reason-lines">
              <span v-for="row in procedureRows" :key="row.key" class="reason-line">
                <template v-if="row.reason">{{ row.reason }}</template>
                <template v-else>&nbsp;</template>
              </span>
            </span>
            <span v-else>-</span>
          </template>
        </template>

        <template v-slot:[`item.actions`]="{ item }">
          <div v-if="authStore.isSrLogistPlus" class="actions-container">
            <ActionButton
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать префикс"
              @click="openEditDialog"
              :disabled="runningAction || loading"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить префикс"
              @click="deletePrefix"
              :disabled="runningAction || loading"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Alert -->
  </div>
</template>

<style scoped>
@import '@/assets/styles/scrollable-table.css';

.prefix-filter-row {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.prefix-filter-row .v-text-field-stub,
.prefix-filter-row :deep(.v-text-field) {
  flex: 1 1 auto;
}

.procedure-filter {
  flex: 0 0 200px !important;
  width: 200px;
  max-width: 200px;
  min-width: 200px;
}

.country-filter {
  flex: 0 0 240px !important;
  width: 240px;
  max-width: 240px;
  min-width: 240px;
}

.procedure-filter :deep(.v-field__input) {
  min-width: 0;
}

.procedure-line,
.reason-line {
  display: block;
  min-height: 1.35em;
  line-height: 1.35;
  white-space: nowrap;
}

@media (max-width: 700px) {
  .prefix-filter-row {
    flex-direction: column;
  }

  .procedure-filter,
  .country-filter {
    flex-basis: auto;
    width: auto;
    max-width: none;
    min-width: 0;
  }
}
</style>
