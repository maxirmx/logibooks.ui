<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import ActionButton from '@/components/ActionButton.vue'
import { reportError } from '@/helpers/error.helpers.js'
import { runWithAlert } from '@/helpers/notification.helpers.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { onBeforeUnmount, computed, getCurrentScope, watch, ref, toRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useCustomsReportsStore } from '@/stores/customs.reports.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { buildPageOptions } from '@/helpers/pagination.helpers.js'
import { formatDateTimeLines } from '@/helpers/date.formatters.js'
import TruncateTooltipCell from '@/components/TruncateTooltipCell.vue'
import ClickableCell from '@/components/ClickableCell.vue'
import PaginationFooter from '@/components/PaginationFooter.vue'
import SortableMultilineHeader from '@/components/SortableMultilineHeader.vue'
import { mdiMagnify } from '@mdi/js'
import router from '@/router'
import { useDebouncedFilterSync } from '@/composables/useDebouncedFilterSync.js'
import { hasParcelEditRouteAccess, navigateToEditParcel } from '@/helpers/parcels.list.helpers.js'
import { getCurrentInternalRoute } from '@/helpers/parcel.navigation.helpers.js'
import { getRegisterNouns, OP_MODE_PAPERWORK } from '@/helpers/op.mode.js'
import { useRegisterCustoms } from '@/composables/useRegisterCustoms.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { buildParcelListHeading } from '@/helpers/register.heading.helpers.js'
import ResponsiveFilterBar from '@/components/ResponsiveFilterBar.vue'
const props = defineProps({
  reportId: {
    type: Number,
    default: null
  },
  registerId: { type: Number, default: null },
  decId: { type: Number, default: null },
  masterInvoice: {
    type: String,
    default: ''
  }
})

const customsReportsStore = useCustomsReportsStore()
const alertStore = useAlertStore()
const componentScope = getCurrentScope()
const authStore = useAuthStore()
const registerMode = props.registerId !== null
const registerCustoms = registerMode ? useRegisterCustoms(toRef(props, 'registerId'), toRef(props, 'decId')) : null
const registers = registerMode ? useRegistersStore() : null
const summary = registerCustoms?.summary ?? ref(null)
const deleting = registerCustoms?.deleting ?? ref(false)
const registerPageOptions = registerMode ? itemsPerPageOptions.filter(option => option.value > 0) : itemsPerPageOptions
const customsdecisions_search = registerMode ? ref('') : toRef(authStore, 'customsdecisions_search')
const customsdecisions_page = registerMode ? ref(1) : toRef(authStore, 'customsdecisions_page')
const customsdecisions_per_page = registerMode ? ref(100) : toRef(authStore, 'customsdecisions_per_page')
const customsdecisions_sort_by = registerMode ? ref([{ key: 'id', order: 'desc' }]) : toRef(authStore, 'customsdecisions_sort_by')

const reportState = storeToRefs(customsReportsStore)
const { accountVersion, decisionSources } = reportState
const decisions = registerMode ? ref([]) : reportState.decisions
const decisionsLoading = registerMode ? ref(false) : reportState.decisionsLoading
const decisionsTotalCount = registerMode ? ref(0) : reportState.decisionsTotalCount
const decisionsColumns = registerMode ? ref([]) : reportState.decisionsColumns
const decisionsCustomsProcedure = registerMode ? ref(null) : reportState.decisionsCustomsProcedure
const registerHeading = computed(() => registerMode ? buildParcelListHeading(
  summary.value?.register, registers.getTransportationDocument, getRegisterNouns(OP_MODE_PAPERWORK).singular
) : '')
const canDelete = computed(() => registerMode && authStore.isShiftLeadPlus)
const displayedFilterKey = ref(null)
const expandedDecisionId = ref(null)
const deleteDisabled = computed(() => deleting.value || summary.value?.register?.readOnly !== false ||
  displayedFilterKey.value !== decisionFilterKey.value)
const localSearch = ref(customsdecisions_search.value || '')
const reportChangePending = ref(false)
const loading = computed(() => reportChangePending.value || decisionsLoading.value ||
  Boolean(registerCustoms?.summaryLoading.value))
let reportScope = 0
let registerRequest = 0
let opsLoad = null
let opsAlertId
let stopBackNavigation = null

const sourceNames = computed(() =>
  new Map(decisionSources.value?.map(({ value, name }) => [value, name]))
)

watch([() => props.reportId, () => props.decId, accountVersion], () => {
  reportScope++
  dismissOpsAlert()
  reportChangePending.value = true
  if (registerMode) {
    customsdecisions_page.value = 1
    decisions.value = []
    decisionsTotalCount.value = 0
    displayedFilterKey.value = null
    decisionsLoading.value = false
  }
}, { flush: 'sync' })
if (!registerMode) {
  watch(() => props.reportId, () => customsReportsStore.resetDecisions(), { immediate: true, flush: 'sync' })
}

const isComponentMounted = ref(true)
const DEFAULT_SORT_BY = Object.freeze([{ key: 'rowNumber', order: 'asc' }])
const SORT_ONLY_COLUMN_KEYS = new Set(['rowNumber'])

const headingLabel = computed(() => props.masterInvoice || `№${props.reportId}`)
const procedureHeadingLabel = computed(() =>
  formatProcedureForHeading(decisionsCustomsProcedure.value)
)
const headingText = computed(() => {
  const procedure = procedureHeadingLabel.value
  if (registerMode) return 'Решения о выпуске — ' + registerHeading.value
  return procedure
    ? `Решения о выпуске для ${headingLabel.value} по процедуре ${procedure}`
    : `Решения о выпуске для ${headingLabel.value}`
})

function formatProcedureForHeading(value) {
  const text = String(value ?? '').trim()
  return text.replace(/^([А-ЯЁ]{2})\s+(\d+)$/u, '$1$2')
}

function hasExpandableGoods(item) {
  return registerMode && (item.items?.length ?? 0) > 1
}

function toggleGoods(id) {
  expandedDecisionId.value = expandedDecisionId.value === id ? null : id
}

function isParcelRowClickable(item) {
  return hasParcelEditRouteAccess(authStore) && Boolean(item?.parcelId && item?.registerId)
}

function openParcel(item) {
  const parcelId = item?.parcelId
  const registerId = item?.registerId
  if (!isParcelRowClickable(item)) return
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

function dismissOpsAlert() {
  if (opsAlertId === undefined) return
  alertStore.dismiss(opsAlertId)
  opsAlertId = undefined
}

async function loadDecisionSources(scope) {
  const version = accountVersion.value
  if (opsLoad?.version === version) {
    opsLoad.scope = scope
    return
  }
  const load = { version, scope }
  opsLoad = load

  try {
    await customsReportsStore.ensureOpsLoaded()
    if (isComponentMounted.value && load.scope === reportScope) dismissOpsAlert()
  } catch (error) {
    if (isComponentMounted.value && load.scope === reportScope) {
      opsAlertId = alertStore.error(error, { fallback: 'Не удалось загрузить источники решений о выпуске' })
    } else {
      reportError(error, { context: 'customs decision sources after their scope changed' })
    }
  } finally {
    if (opsLoad === load) opsLoad = null
  }
}

async function loadDecisions() {
  const scope = reportScope
  const sort = customsdecisions_sort_by.value[0]
  const filter = {
    page: customsdecisions_page.value,
    pageSize: customsdecisions_per_page.value,
    sortBy: sort?.key ?? 'id',
    sortOrder: sort?.order ?? 'desc',
    search: customsdecisions_search.value
  }
  const request = ++registerRequest
  const isCurrent = () => scope === reportScope && isComponentMounted.value &&
    (!registerMode || (request === registerRequest && filter.page === customsdecisions_page.value &&
      filter.pageSize === customsdecisions_per_page.value && sort === customsdecisions_sort_by.value[0] &&
      filter.search === localSearch.value))
  reportChangePending.value = false
  void loadDecisionSources(scope)
  try {
    if (!registerMode) {
      await customsReportsStore.getDecisions(props.reportId)
      return
    }

    decisionsLoading.value = true
    const response = await registerCustoms.getDecisions(filter)
    if (!isCurrent()) return
    decisions.value = response.items
    decisionsTotalCount.value = response.pagination.totalCount
    decisionsColumns.value = response.columns
    decisionsCustomsProcedure.value = response.customsProcedure
    if (customsdecisions_page.value !== response.pagination.currentPage) {
      customsdecisions_page.value = response.pagination.currentPage
    }
    displayedFilterKey.value = decisionFilterKey.value
  } catch (error) {
    if (isCurrent()) {
      if (registerMode) {
        decisions.value = []
        decisionsTotalCount.value = 0
        displayedFilterKey.value = null
      }
      alertStore.error(error, { fallback: 'Не удалось загрузить решения о выпуске' })
    } else {
      reportError(error, { context: 'customs decisions after their scope changed' })
    }
  } finally {
    if (registerMode && request === registerRequest && isComponentMounted.value && scope === reportScope) decisionsLoading.value = false
  }
}

const { triggerLoad, stop: stopFilterSync } = useDebouncedFilterSync({
  filters: [{ local: localSearch, store: customsdecisions_search }],
  loadFn: loadDecisions,
  isComponentMounted,
  debounceMs: 300
})

const watcherStop = watch(
  [
    customsdecisions_page,
    customsdecisions_per_page,
    customsdecisions_sort_by,
    () => props.reportId,
    () => props.decId,
    accountVersion
  ],
  () => {
    triggerLoad()
  },
  { immediate: false }
)

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
  { title: 'Комментарии', key: 'comments', align: 'start', width: '250px' },
  { title: 'Источник', key: 'source', align: 'start', sortable: false }
]

const visibleColumnKeys = computed(() => {
  const columns = decisionsColumns.value
  return Array.isArray(columns) && columns.length > 0 ? new Set(columns) : null
})

const headers = computed(() => {
  const keys = visibleColumnKeys.value
  const visible = keys ? allHeaders.filter((header) => keys.has(header.key)) : allHeaders
  if (!registerMode) return visible
  const sortable = ['id', 'dTag', 'parcelNumber', 'processingResult']
  return [
    ...(canDelete.value ? [{ title: '', key: 'actions', sortable: false }] : []),
    ...(decisions.value.some(hasExpandableGoods) ? [{ title: '', key: 'goods', sortable: false }] : []),
    ...visible.map(header => ({ ...header, sortable: !deleting.value && sortable.includes(header.key) }))
  ]
})

function resetHiddenSortColumn() {
  const keys = visibleColumnKeys.value
  if (!keys) return

  const sortKey = customsdecisions_sort_by.value?.[0]?.key
  if (sortKey && !keys.has(sortKey) && !SORT_ONLY_COLUMN_KEYS.has(sortKey)) {
    customsdecisions_sort_by.value = registerMode ? [{ key: 'id', order: 'desc' }] :
      DEFAULT_SORT_BY.map((sort) => ({ ...sort }))
  }
}

const columnMetadataStop = watch(decisionsColumns, () => {
  resetHiddenSortColumn()
})

onBeforeUnmount(() => {
  isComponentMounted.value = false
  stopBackNavigation?.()
  dismissOpsAlert()
  if (!registerMode) customsReportsStore.resetDecisions()
  stopFilterSync()
  watcherStop()
  columnMetadataStop()
})

const maxPage = computed(() =>
  Math.max(1, Math.ceil((decisionsTotalCount.value || 0) / customsdecisions_per_page.value))
)

const pageOptions = computed(() => buildPageOptions(maxPage.value, customsdecisions_page.value))

const reportsNavigationFallback = 'Не удалось открыть список отчётов'

function selectDec(id) {
  return runWithAlert(() => router.replace({
    name: 'Решения реестра', params: { registerId: props.registerId },
    query: id ? { decId: id } : {}
  }), { fallback: 'Не удалось применить фильтр по ДТЭГ/ПТДЭГ', scope: componentScope })
}

const decisionFilterKey = computed(() => JSON.stringify([
  localSearch.value, customsdecisions_page.value, customsdecisions_per_page.value, customsdecisions_sort_by.value
]))

watch([decisionFilterKey, () => props.registerId, () => props.decId, accountVersion], () => {
  expandedDecisionId.value = null
}, { flush: 'sync' })

function deleteDecisions(decision) {
  if (deleteDisabled.value || loading.value) return
  const confirmedFilter = decisionFilterKey.value
  return registerCustoms.remove({
    decision,
    refresh: loadDecisions,
    canSubmit: () => decisionFilterKey.value === confirmedFilter
  })
}

function closeReport() {
  if (registerMode) {
    return runWithAlert(() => router.push({
      name: 'ДТЭГ/ПТДЭГ реестра', params: { registerId: props.registerId }
    }), { fallback: 'Не удалось открыть ДТЭГ/ПТДЭГ реестра', scope: componentScope })
  }
  const reportsPath = '/customs-reports'
  const previous = router.options.history.state.back
  if (typeof previous === 'string' && previous.split(/[?#]/, 1)[0] === reportsPath) {
    if (stopBackNavigation) return

    const fromPath = router.currentRoute.value.fullPath
    const toPath = router.resolve(previous).fullPath
    const stopError = router.onError((error, to, from) => {
      if (from.fullPath !== fromPath || (to.redirectedFrom ?? to).fullPath !== toPath) return
      stopBackNavigation()
      alertStore.error(error, { fallback: reportsNavigationFallback })
    })
    const stopAfterEach = router.afterEach((_to, from) => {
      if (from.fullPath === fromPath) stopBackNavigation()
    })

    // History traversal returns void. Vue Router reports asynchronous errors via onError.
    stopBackNavigation = () => {
      stopError()
      stopAfterEach()
      stopBackNavigation = null
    }

    return runWithAlert(() => {
      try {
        router.back()
      } catch (error) {
        stopBackNavigation?.()
        throw error
      }
    }, { fallback: reportsNavigationFallback, scope: componentScope })
  }

  return runWithAlert(() => router.replace(reportsPath), {
    fallback: reportsNavigationFallback,
    scope: componentScope
  })
}
</script>

<template>
  <div class="settings table-3 list-with-filters">
    <div class="header-with-actions">
      <h1 class="primary-heading">{{ headingText }}</h1>
      <div class="header-actions-bar">
        <div v-if="loading || deleting" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton v-if="canDelete && !decId" 
            :item="null" 
            icon="fa-solid fa-broom"
            icon-size="2x"
            tooltip-text="Удалить все решения для реестра" 
            aria-label="Удалить все решения для реестра" :disabled="deleteDisabled || loading || !decisionsTotalCount"
            @click="() => deleteDecisions()" />
          <ActionButton
            :item="null"
            icon="fa-solid fa-xmark"
            icon-size="2x"
            tooltip-text="Закрыть"
            aria-label="Закрыть"
            data-testid="customs-report-close"
            @click="closeReport"
          />
        </div>
      </div>
    </div>
    <hr class="hr" />

    <PageAlertRegion />

    <ResponsiveFilterBar v-if="registerMode" aria-label="Фильтры таможенных решений">
      <v-select :model-value="decId" :items="summary?.items ?? []" item-title="number" item-value="id"
        label="ДТЭГ/ПТДЭГ" placeholder="Все решения" :disabled="deleting || !summary" clearable
        density="compact" @update:model-value="selectDec" />
      <v-text-field v-model="localSearch" :append-inner-icon="mdiMagnify" label="Поиск по решениям"
        :disabled="deleting" density="compact" class="responsive-filter-bar__item--grow" />
    </ResponsiveFilterBar>
    <div v-else class="list-filters">
      <v-text-field
        v-model="localSearch"
        :append-inner-icon="mdiMagnify"
        label="Поиск по решениям"
        variant="solo"
        hide-details
        :loading="loading"
      />
    </div>

    <v-card class="table-card">
      <v-data-table-server
        v-model:items-per-page="customsdecisions_per_page"
        :items-per-page-options="registerPageOptions"
        v-model:page="customsdecisions_page"
        v-model:sort-by="customsdecisions_sort_by"
        :headers="headers"
        :items="decisions"
        :items-length="decisionsTotalCount"
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
              <ActionButton v-if="col.key === 'actions'" :item="item" icon="fa-solid fa-trash-can"
                tooltip-text="Удалить решение" aria-label="Удалить решение" :disabled="deleteDisabled || loading" @click="deleteDecisions" />
              <template v-else-if="col.key === 'goods'">
                <ActionButton
                  v-if="hasExpandableGoods(item)"
                  :item="item.id"
                  icon="fa-solid fa-boxes-stacked"
                  tooltip-text="Товары"
                  aria-label="Товары"
                  :aria-expanded="expandedDecisionId === item.id"
                  :disabled="loading || displayedFilterKey !== decisionFilterKey"
                  @click="toggleGoods"
                />
              </template>
              <ClickableCell v-else
                :item="item"
                cell-class="clickable-cell"
                :disabled="!isParcelRowClickable(item)"
                @click="openParcel"
              >
                <!-- DTag column: two-line display with secondary muted line for rowNumber -->
                <template v-if="col.key === 'dTag'">
                  <div class="two-line-cell">
                    <div class="primary-line">{{ item.dTag }}</div>
                    <div v-if="!item.items?.length || item.rowNumber" class="secondary-line">Позиция {{ item.rowNumber }}</div>
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

                <template v-else-if="col.key === 'source'">
                  {{ sourceNames.get(item.source) ?? '—' }}
                </template>

                <!-- Fallback for all other columns -->
                <template v-else>
                  {{ item[col.key] }}
                </template>
              </ClickableCell>
            </td>
          </tr>
          <tr v-if="hasExpandableGoods(item) && expandedDecisionId === item.id">
            <td :colspan="columns.length">
              <div class="table-card app-table-card">
                <div class="app-table-scroll">
                  <table class="app-table interlaced-table" aria-label="Товары">
                    <thead>
                      <tr>
                        <th scope="col">Описание</th>
                        <th scope="col">Код ТН ВЭД</th>
                        <th scope="col">Предшествующий код</th>
                        <th scope="col">Количество</th>
                        <th scope="col">Общая стоимость</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(goods, index) in item.items" :key="index">
                        <td>{{ goods.description }}</td>
                        <td>{{ goods.tnVed }}</td>
                        <td>{{ goods.prevTnVed }}</td>
                        <td>{{ goods.quantity }}</td>
                        <td>{{ goods.totalCost }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </td>
          </tr>
        </template>
      </v-data-table-server>
      <div class="v-data-table-footer">
        <PaginationFooter
          v-model:items-per-page="customsdecisions_per_page"
          v-model:page="customsdecisions_page"
          :items-per-page-options="registerPageOptions"
          :page-options="pageOptions"
          :total-count="decisionsTotalCount"
          :max-page="maxPage"
          :disabled="deleting"
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
