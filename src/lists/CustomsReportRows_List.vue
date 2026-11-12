<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { onUnmounted, computed, watch, ref, toRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useCustomsReportsStore } from '@/stores/customs.reports.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { formatDateTime, formatDateTimeLines } from '@/helpers/date.formatters.js'
import TruncateTooltipCell from '@/components/TruncateTooltipCell.vue'
import ClickableCell from '@/components/ClickableCell.vue'
import PaginationFooter from '@/components/PaginationFooter.vue'
import SortableMultilineHeader from '@/components/SortableMultilineHeader.vue'
import { mdiMagnify } from '@mdi/js'
import router from '@/router'
import { useDebouncedFilterSync } from '@/composables/useDebouncedFilterSync.js'
import { navigateToEditParcel } from '@/helpers/parcels.list.helpers.js'
import { getCurrentInternalRoute } from '@/helpers/parcel.navigation.helpers.js'
import { OP_MODE_PAPERWORK } from '@/helpers/op.mode.js'
import { useCustomsReportPolling } from '@/composables/useCustomsReportPolling.js'
import { getErrorMessage, reportError } from '@/helpers/error.helpers.js'
const props = defineProps({
  reportId: {
    type: Number,
    required: true
  },
  masterInvoice: {
    type: String,
    default: ''
  }
})

const customsReportsStore = useCustomsReportsStore()
const alertStore = useAlertStore()
const report = ref(null)
let statusRequest = 0
let rowsScope = 0
const authStore = useAuthStore()
const customsreportrows_search = toRef(authStore, 'customsreportrows_search')
const customsreportrows_page = toRef(authStore, 'customsreportrows_page')
const customsreportrows_per_page = toRef(authStore, 'customsreportrows_per_page')
const customsreportrows_sort_by = toRef(authStore, 'customsreportrows_sort_by')

const { accountVersion, ops, reportRows, loading, reportRowsTotalCount, reportRowsColumns, reportRowsCustomsProcedure } =
  storeToRefs(customsReportsStore)
const initialAccountVersion = accountVersion.value
const localSearch = ref(customsreportrows_search.value || '')

const isComponentMounted = ref(true)
const DEFAULT_SORT_BY = Object.freeze([{ key: 'rowNumber', order: 'asc' }])
const SORT_ONLY_COLUMN_KEYS = new Set(['rowNumber'])

const headingLabel = computed(() => {
  const invoice = report.value?.masterInvoice
  const routeInvoice = accountVersion.value === initialAccountVersion ? props.masterInvoice : ''
  return (invoice !== ops.value?.defaultMasterInvoice && invoice) || routeInvoice || `№${props.reportId}`
})
const procedureHeadingLabel = computed(() =>
  formatProcedureForHeading(reportRowsCustomsProcedure.value)
)
const headingText = computed(() => {
  const procedure = procedureHeadingLabel.value
  return procedure
    ? `Отчёт о выпуске для ${headingLabel.value} по процедуре ${procedure}`
    : `Отчёт о выпуске для ${headingLabel.value}`
})

function formatProcedureForHeading(value) {
  const text = String(value ?? '').trim()
  return text.replace(/^([А-ЯЁ]{2})\s+(\d+)$/u, '$1$2')
}

function isParcelRowClickable(item) {
  return Boolean(item?.parcelId && item?.registerId)
}

function openParcel(item) {
  const parcelId = item?.parcelId
  const registerId = item?.registerId
  if (!parcelId || !registerId) return
  navigateToEditParcel(router, { ...item, id: parcelId }, 'Редактирование посылки', {
    registerId,
    mode: OP_MODE_PAPERWORK,
    returnUrl: getCurrentInternalRoute(router)
  })
}

function getColumnAlignmentClass(column) {
  return column.align === 'center'
    ? 'text-center'
    : column.align === 'end'
    ? 'text-right'
    : 'text-start'
}

function joinDisplayParts(...parts) {
  return parts
    .filter((part) => part !== null && part !== undefined && String(part).trim() !== '')
    .join(' ')
}

async function loadReportRows() {
  const scope = rowsScope
  try {
    await customsReportsStore.getReportRows(props.reportId)
  } catch (error) {
    if (isComponentMounted.value && scope === rowsScope) {
      alertStore.error(error, { fallback: 'Не удалось загрузить строки отчёта' })
    } else reportError(error, { context: 'customs report rows after disposal' })
  }
}

async function loadReportStatus() {
  const id = props.reportId
  const request = ++statusRequest
  const next = await customsReportsStore.getReportStatus(id)
  if (next && isComponentMounted.value && request === statusRequest) showStatus(next)
}

function showStatus(next) {
  const previous = report.value
  report.value = next
  if (next && previous?.stage !== next.stage && customsReportsStore.reportStage(next)?.hasParsedRows) {
    triggerLoad()
  }
}

function reportStatusError(error) {
  if (customsReportsStore.claimReportStatusFailure(props.reportId, error)) {
    alertStore.error(error, { fallback: 'Не удалось получить состояние отчёта' })
  }
}

watch([accountVersion, () => props.reportId], ([, id], previous, onCleanup) => {
  rowsScope++
  customsReportsStore.resetReportRows()
  report.value = null
  onCleanup(customsReportsStore.displayReportStatus(id, showStatus))
  if (previous?.length) triggerLoad()
}, { immediate: true })

const { triggerLoad, stop: stopFilterSync } = useDebouncedFilterSync({
  filters: [{ local: localSearch, store: customsreportrows_search }],
  loadFn: loadReportRows,
  isComponentMounted,
  debounceMs: 300
})

const watcherStop = watch(
  [
    customsreportrows_page,
    customsreportrows_per_page,
    customsreportrows_sort_by
  ],
  () => {
    triggerLoad()
  },
  { immediate: false }
)

const reportToPoll = computed(() => !report.value || customsReportsStore.reportStage(report.value)?.isActive
  ? `${accountVersion.value}/${props.reportId}`
  : null)
useCustomsReportPolling(reportToPoll, loadReportStatus, reportStatusError, {
  startImmediately: true,
  canRetry: customsReportsStore.canRetryReportStatus
})

// Column keys that should use TruncateTooltipCell
const TRUNCATABLE_COLUMNS = [
  'recipient',
  'description',
  'previousMonthValueOrWeight',
  'customsDutiesAndTaxes',
  'customsFees',
  'prohibitionsAndRestrictions',
  'comments'
]
const DATE_TIME_COLUMNS = new Set(['dateTime'])
const allHeaders = [
  { title: 'Номер записи', key: 'id', align: 'start', width: '72px' },
  { title: 'Номер отправления', key: 'parcelNumber', align: 'start', width: '140px' },
  { title: 'Результат обработки', key: 'processingResult', align: 'start', width: '180px' },
  { title: 'УИН', key: 'uin', align: 'start', width: '160px' },
  { title: 'ДТЭГ/ПТДЭГ', key: 'dTag', align: 'start', width: '140px' },
  { title: 'Мастер накладная', key: 'masterInvoice', align: 'start', width: '150px' },
  { title: 'Получатель', key: 'recipient', align: 'start', width: '180px' },
  { title: 'Описание', key: 'description', align: 'start', width: '260px' },
  { title: 'Код ТНВЭД', key: 'tnVed', align: 'start', width: '150px' },
  { title: 'Количество', key: 'quantity', align: 'end', width: '90px' },
  { title: 'Вес', key: 'totalWeight', align: 'end', width: '130px' },
  { title: 'Стоимость', key: 'totalCost', align: 'end', width: '140px' },
  { title: 'Пред. месяц', key: 'previousMonthValueOrWeight', align: 'start' },
  { title: 'Пошлины, налоги', key: 'customsDutiesAndTaxes', align: 'start' },
  { title: 'Сборы', key: 'customsFees', align: 'start' },
  {
    title: 'Запреты и ограничения',
    key: 'prohibitionsAndRestrictions',
    align: 'start',
    width: '220px'
  },
  { title: 'ID резервирования', key: 'customsPaymentReservationId', align: 'start' },
  { title: 'Дата и время', key: 'dateTime', align: 'start', width: '150px' },
  { title: 'Комментарии', key: 'comments', align: 'start', width: '250px' }
]

const visibleColumnKeys = computed(() => {
  const columns = reportRowsColumns.value
  return Array.isArray(columns) && columns.length > 0 ? new Set(columns) : null
})

const headers = computed(() => {
  const keys = visibleColumnKeys.value
  return keys ? allHeaders.filter((header) => keys.has(header.key)) : allHeaders
})

function resetHiddenSortColumn() {
  const keys = visibleColumnKeys.value
  if (!keys) return

  const sortKey = customsreportrows_sort_by.value?.[0]?.key
  if (sortKey && !keys.has(sortKey) && !SORT_ONLY_COLUMN_KEYS.has(sortKey)) {
    customsreportrows_sort_by.value = DEFAULT_SORT_BY.map((sort) => ({ ...sort }))
  }
}

const columnMetadataStop = watch(reportRowsColumns, () => {
  resetHiddenSortColumn()
})

onUnmounted(() => {
  isComponentMounted.value = false
  stopFilterSync()
  watcherStop()
  columnMetadataStop()
})

const maxPage = computed(() =>
  Math.max(1, Math.ceil((reportRowsTotalCount.value || 0) / customsreportrows_per_page.value))
)

const pageOptions = computed(() => {
  const mp = maxPage.value
  const current = customsreportrows_page.value || 1
  if (mp <= 200) {
    return Array.from({ length: mp }, (_, i) => ({ value: i + 1, title: String(i + 1) }))
  }

  const set = new Set()
  for (let i = 1; i <= 10; i++) set.add(i)
  for (let i = Math.max(1, mp - 9); i <= mp; i++) set.add(i)
  for (let i = Math.max(1, current - 10); i <= Math.min(mp, current + 10); i++) set.add(i)

  return Array.from(set)
    .sort((a, b) => a - b)
    .map((n) => ({ value: n, title: String(n) }))
})

// Navigation handled by parent view; no local back action
</script>

<template>
  <div class="settings table-3 list-with-filters">
    <div class="header-with-actions">
      <h1 class="primary-heading">{{ headingText }}</h1>
      <div class="header-actions-bar">
        <RouterLink to="/customs-reports" class="link">К списку отчётов</RouterLink>
        <div v-if="loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
      </div>
    </div>
    <hr class="hr" />

    <PageAlertRegion />

    <div v-if="report" aria-live="polite" class="mb-3">
      <strong>{{ customsReportsStore.reportStage(report)?.name ?? report.stage }}</strong>
      <span v-if="report.uploadedAt"> · Загружен {{ formatDateTime(report.uploadedAt) }}</span>
      <span v-if="report.uploadedByUserId"> · Пользователь №{{ report.uploadedByUserId }}</span>
      <div v-if="report.errMsg">
        {{ getErrorMessage(report.errMsg, 'Не удалось обработать отчёт о выпуске') }}
      </div>
    </div>

    <div class="list-filters">
      <v-text-field
        v-model="localSearch"
        :append-inner-icon="mdiMagnify"
        label="Поиск по отчёту"
        variant="solo"
        hide-details
        :loading="loading"
      />
    </div>

    <v-card class="table-card">
      <v-data-table-server
        v-model:items-per-page="customsreportrows_per_page"
        :items-per-page-options="itemsPerPageOptions"
        v-model:page="customsreportrows_page"
        v-model:sort-by="customsreportrows_sort_by"
        :headers="headers"
        :items="reportRows"
        :items-length="reportRowsTotalCount"
        :loading="loading"
        density="compact"
        class="elevation-1 interlaced-table"
        item-value="id"
        hide-default-footer
      >
        <template #[`header.tnVed`]="{ column, isSorted, getSortIcon }">
          <SortableMultilineHeader
            :lines="['Код ТНВЭД', 'Предшествующий']"
            :column="column"
            :is-sorted="isSorted"
            :get-sort-icon="getSortIcon"
          />
        </template>

        <template #[`header.totalWeight`]="{ column, isSorted, getSortIcon }">
          <SortableMultilineHeader
            :lines="['Вес']"
            :column="column"
            :is-sorted="isSorted"
            :get-sort-icon="getSortIcon"
          />
        </template>

        <template #[`header.totalCost`]="{ column, isSorted, getSortIcon }">
          <SortableMultilineHeader
            :lines="['Стоимость']"
            :column="column"
            :is-sorted="isSorted"
            :get-sort-icon="getSortIcon"
          />
        </template>

        <template #[`header.dateTime`]="{ column, isSorted, getSortIcon }">
          <SortableMultilineHeader
            :lines="['Дата', 'Время']"
            :column="column"
            :is-sorted="isSorted"
            :get-sort-icon="getSortIcon"
          />
        </template>

        <!-- Row-level slot -->
        <template #item="{ item, columns }">
          <tr>
            <td
              v-for="col in columns"
              :key="col.key"
              :class="[col.class, getColumnAlignmentClass(col)]"
              :data-column-key="col.key"
            >
              <ClickableCell
                :item="item"
                cell-class="clickable-cell"
                :disabled="!isParcelRowClickable(item)"
                @click="openParcel"
              >
                <template v-if="col.key === 'parcelNumber'">
                  {{ item.parcelNumber }}
                </template>

                <!-- DTag column: two-line display with secondary muted line for rowNumber -->
                <template v-else-if="col.key === 'dTag'">
                  <div class="two-line-cell">
                    <div class="primary-line">{{ item.dTag }}</div>
                    <div class="secondary-line">Позиция {{ item.rowNumber }}</div>
                  </div>
                </template>

                <!-- TN VED column: current code with previous code on the second line -->
                <template v-else-if="col.key === 'tnVed'">
                  <div class="two-line-cell">
                    <div class="primary-line">{{ item.tnVed }}</div>
                    <div class="secondary-line tnved-previous-line">{{ item.prevTnVed || '' }}</div>
                  </div>
                </template>

                <!-- Combined value/unit columns -->
                <template v-else-if="col.key === 'totalWeight'">
                  <span class="nowrap-cell">{{
                    joinDisplayParts(item.totalWeight, item.weightUnit)
                  }}</span>
                </template>
                <template v-else-if="col.key === 'totalCost'">
                  <span class="nowrap-cell">{{
                    joinDisplayParts(item.totalCost, item.currency)
                  }}</span>
                </template>

                <!-- Date/time columns: local date on line 1, local time on line 2 -->
                <template v-else-if="DATE_TIME_COLUMNS.has(col.key)">
                  <div class="two-line-cell">
                    <div
                      v-for="(line, index) in formatDateTimeLines(item[col.key])"
                      :key="index"
                      :class="index === 0 ? 'primary-line' : 'secondary-line'"
                    >
                      {{ line }}
                    </div>
                  </div>
                </template>

                <!-- Text columns with conditional truncation tooltip -->
                <TruncateTooltipCell
                  v-else-if="TRUNCATABLE_COLUMNS.includes(col.key)"
                  :text="item[col.key]"
                />

                <!-- Fallback for all other columns -->
                <template v-else>
                  {{ item[col.key] }}
                </template>
              </ClickableCell>
            </td>
          </tr>
        </template>
      </v-data-table-server>
      <div class="v-data-table-footer">
        <PaginationFooter
          v-model:items-per-page="customsreportrows_per_page"
          v-model:page="customsreportrows_page"
          :items-per-page-options="itemsPerPageOptions"
          :page-options="pageOptions"
          :total-count="reportRowsTotalCount"
          :max-page="maxPage"
        />
      </div>
    </v-card>
  </div>
</template>

<style scoped>
.two-line-cell {
  display: flex;
  flex-direction: column;
}
.two-line-cell .primary-line {
  font-weight: 400;
}
.two-line-cell .secondary-line {
  font-size: 0.85em;
  color: #2a2c2d; /* muted gray */
}
.tnved-previous-line {
  min-height: 1em;
}
.nowrap-cell {
  white-space: nowrap;
}

/* Minimal width for truncation columns */
.col-text {
  min-width: 140px;
}
</style>
