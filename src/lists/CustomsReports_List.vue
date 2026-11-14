<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { computed, onUnmounted, ref, toRef, watch } from 'vue'
import { useAppConfirm } from '@/composables/useAppConfirm.js'
import TruncateTooltipCell from '@/components/TruncateTooltipCell.vue'
import ClickableCell from '@/components/ClickableCell.vue'
import { storeToRefs } from 'pinia'
import { useCustomsReportsStore } from '@/stores/customs.reports.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import ActionDialog from '@/l2/ActionDialog.vue'
import ActionButton from '@/components/ActionButton.vue'
import { useActionDialog } from '@/composables/useActionDialog.js'
import { useCustomsReportPolling } from '@/composables/useCustomsReportPolling.js'
import { getErrorMessage, reportError } from '@/helpers/error.helpers.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'
import router from '@/router'
import { useDebouncedFilterSync } from '@/composables/useDebouncedFilterSync.js'

const customsReportsStore = useCustomsReportsStore()
const alertStore = useAlertStore()
const authStore = useAuthStore()

const { accountVersion, ops, reports, loading, reportsTotalCount } = storeToRefs(customsReportsStore)
const fileInput = ref(null)
const runningAction = ref(false)
const { actionDialogState, showActionDialog, hideActionDialog } = useActionDialog()
const confirm = useAppConfirm()
const uploadcustomsreports_page = toRef(authStore, 'uploadcustomsreports_page')
const uploadcustomsreports_per_page = toRef(authStore, 'uploadcustomsreports_per_page')
const uploadcustomsreports_sort_by = toRef(authStore, 'uploadcustomsreports_sort_by')
const uploadcustomsreports_search = toRef(authStore, 'uploadcustomsreports_search')
const localSearch = ref(uploadcustomsreports_search.value || '')
const isComponentMounted = ref(true)

async function loadReports() {
  const version = accountVersion.value
  try {
    await customsReportsStore.getReports()
  } catch (error) {
    if (isComponentMounted.value && version === accountVersion.value) {
      alertStore.error(error, { fallback: 'Не удалось загрузить отчёты' })
    } else reportError(error, { context: 'customs report list after disposal' })
  }
}

const canPoll = computed(() => !loading.value && !runningAction.value &&
  reports.value.some(report => customsReportsStore.reportStage(report)?.isActive) ? accountVersion.value + 1 : null)
useCustomsReportPolling(canPoll, () => customsReportsStore.getReports(true),
  error => alertStore.error(error, { fallback: 'Не удалось получить состояние отчётов' }))

const { triggerLoad, stop: stopFilterSync } = useDebouncedFilterSync({
  filters: [{ local: localSearch, store: uploadcustomsreports_search }],
  loadFn: loadReports,
  isComponentMounted,
  debounceMs: 300
})

const watcherStop = watch(
  [accountVersion, uploadcustomsreports_page, uploadcustomsreports_per_page, uploadcustomsreports_sort_by],
  () => {
    triggerLoad()
  },
  { immediate: false }
)

onUnmounted(() => {
  isComponentMounted.value = false
  stopFilterSync()
  if (watcherStop) {
    watcherStop()
  }
})

watch(accountVersion, () => {
  hideActionDialog()
  runningAction.value = false
}, { flush: 'sync' })

function openReportUploadDialog() {
  fileInput.value?.click()
}

async function onReportFileSelected(event) {
  const input = event?.target
  const file = input?.files?.[0]

  if (!file) {
    return
  }

  input.value = ''
  const version = accountVersion.value
  try {
    showActionDialog('upload-report')
    const report = await customsReportsStore.upload(file)
    if (version !== accountVersion.value) return
    if (!report?.id || (report.success === false && !customsReportsStore.reportStage(report))) {
      throw new Error(getErrorMessage(report?.errMsg, 'Не удалось загрузить отчёт'), { cause: report })
    }
    if (isComponentMounted.value) await viewReportRows(report)
  } catch (error) {
    if (isComponentMounted.value && version === accountVersion.value) {
      alertStore.error(error, { fallback: 'Не удалось загрузить отчёт' })
    } else reportError(error, { context: 'customs report upload after disposal' })
  } finally {
    if (version === accountVersion.value) hideActionDialog()
  }
}

const baseHeaders = [
  { title: '№', key: 'id', align: 'center', width: '70px' },
  { title: 'Имя файла', key: 'fileName', align: 'center', class: 'col-text' },
  { title: 'Состояние', key: 'result', align: 'center', sortable: false },
  { title: 'Процедура', key: 'customsProcedure', align: 'center' },
  { title: 'Мастер накладная', key: 'masterInvoice', align: 'center', class: 'col-text' },
  { title: 'Всего записей', key: 'processedRows', align: 'center' },
  { title: 'Выпущено всего', key: 'releasedParcels', align: 'center' },
  { title: 'Выпущено с уплатой', key: 'releasedWithDutyParcels', align: 'center' },
  { title: 'Запрет выпуска', key: 'heldParcels', align: 'center' },
  { title: 'Обновлено ТН ВЭД', key: 'updatedTnVedParcels', align: 'center' },
  { title: 'Ошибочных записей', key: 'errorCount', align: 'center' },
  { title: 'Ошибка', key: 'errMsg', align: 'center', class: 'col-text' }
]

const headers = computed(() => {
  const list = [...baseHeaders]
  if (authStore.isSrLogistPlus) {
    list.unshift({ title: '', align: 'center', key: 'actions', sortable: false, width: '10%' })
  }
  return list
})

const tableItems = computed(() =>
  (reports.value || []).map((report) => {
    const errorsBreakdown = Object.entries(ops.value?.errorLabels ?? {})
      .map(([key, label]) => {
        const count = report[key] || 0
        return count ? { key, label, count } : null
      })
      .filter(Boolean)

    return {
      ...report,
      errMsg: report.errMsg ? getErrorMessage(report.errMsg, 'Не удалось обработать отчёт о выпуске') : null,
      result: customsReportsStore.reportStage(report)?.name ?? report.stage,
      errorCount: errorsBreakdown.reduce((total, entry) => total + entry.count, 0),
      errorsBreakdown
    }
  })
)

async function handleDeleteReport(report) {
  if (!report?.id || runningAction.value || customsReportsStore.reportStage(report)?.isActive) {
    return
  }


  const version = accountVersion.value
  runningAction.value = true
  try {
    const content = `Удалить отчёт «${report.fileName || report.id}» и его решения? Связи посылок с ДТЭГ/ПТДЭГ будут сняты, если их подтверждает только этот отчёт.`
    const confirmed = await confirm({
      title: 'Подтверждение',
      confirmationText: 'Удалить',
      cancellationText: 'Отмена',
      content
    })

    if (!confirmed || !isComponentMounted.value || version !== accountVersion.value) return

    await customsReportsStore.remove(report.id)
  } catch (error) {
    if (isComponentMounted.value && version === accountVersion.value) {
      alertStore.error(error, { fallback: 'Не удалось удалить отчёт' })
    } else reportError(error, { context: 'customs report deletion after disposal' })
  } finally {
    if (version === accountVersion.value) runningAction.value = false
  }
}

function viewReportRows(report) {
  const hasInvoice = report.masterInvoice && report.masterInvoice !== ops.value?.defaultMasterInvoice &&
    customsReportsStore.reportStage(report)?.hasParsedRows
  const query = hasInvoice ? { masterInvoice: report.masterInvoice } : {}
  return router.push({ path: '/customs-reports/' + report.id + '/rows', query })
}
</script>

<template>
  <div class="settings table-3 list-with-filters">
    <div class="header-with-actions">
      <h1 class="primary-heading">Отчеты о выпуске</h1>
      <div class="header-actions-bar">
        <div v-if="loading && !actionDialogState.show" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            tooltip-text="Загрузить отчёт"
            iconSize="2x"
            icon="fa-solid fa-file-import"
            :item="null"
            :disabled="loading"
            data-testid="reports-upload-header-button"
            @click="openReportUploadDialog"
          >
            Загрузить
          </ActionButton>
        </div>
        <input
          type="file"
          ref="fileInput"
          :accept="ops?.uploadExtensions.join(',')"
          data-testid="reports-upload-input"
          style="display: none"
          @change="onReportFileSelected"
        />
      </div>
    </div>
    <hr class="hr" />

    <PageAlertRegion />

    <div class="list-filters">
      <v-text-field
        v-model="localSearch"
        :append-inner-icon="mdiMagnify"
        label="Поиск по номеру мастер накладной"
        variant="solo"
        hide-details
        :loading="loading"
        :disabled="runningAction"
      />
    </div>

    <v-card class="table-card">
      <v-data-table-server
        v-model:items-per-page="uploadcustomsreports_per_page"
        :items-per-page-options="itemsPerPageOptions"
        v-model:page="uploadcustomsreports_page"
        v-model:sort-by="uploadcustomsreports_sort_by"
        :headers="headers"
        :items="tableItems"
        :items-length="reportsTotalCount"
        :loading="loading"
        density="compact"
        class="elevation-1 interlaced-table"
        item-value="id"
        fixed-header
      >
        <!-- Row-level slot to avoid dotted slot names -->
        <template #item="{ item, columns }">
          <tr>
            <td
              v-for="col in columns"
              :key="col.key"
              :class="[
                col.class,
                col.align === 'center'
                  ? 'text-center'
                  : col.align === 'end'
                  ? 'text-right'
                  : 'text-start'
              ]"
              :data-column-key="col.key"
            >
              <!-- File / text columns with conditional truncation tooltip -->
              <template v-if="['fileName', 'masterInvoice', 'errMsg'].includes(col.key)">
                <ClickableCell
                  :item="item"
                  cell-class="truncated-cell clickable-cell"
                  @click="() => viewReportRows(item)"
                >
                  <template #default>
                    <TruncateTooltipCell :text="item[col.key]" />
                  </template>
                </ClickableCell>
              </template>

              <!-- ID column - clickable cell to view rows -->
              <template v-else-if="col.key === 'id'">
                <ClickableCell
                  :item="item"
                  :display-value="item.id"
                  cell-class="truncated-cell clickable-cell"
                  :data-testid="'report-id-link-' + item.id"
                  @click="() => viewReportRows(item)"
                />
              </template>

              <!-- Error count with breakdown tooltip -->
              <template v-else-if="col.key === 'errorCount'">
                <v-tooltip v-if="item.errorCount" location="top" open-delay="150">
                  <template #activator="{ props }">
                    <ClickableCell
                      v-bind="props"
                      :item="item"
                      cell-class="truncated-cell clickable-cell"
                      @click="() => viewReportRows(item)"
                    >
                      <template #default>
                        {{ item.errorCount }}
                      </template>
                    </ClickableCell>
                  </template>
                  <div>
                    <div v-for="e in item.errorsBreakdown" :key="e.key">
                      {{ e.label }}: {{ e.count }}
                    </div>
                  </div>
                </v-tooltip>
                <span v-else>0</span>
              </template>

              <!-- Actions column -->
              <template v-else-if="col.key === 'actions'">
                <div class="actions-container">
                  <ActionButton
                    :item="item"
                    icon="fa-solid fa-list"
                    tooltip-text="Подробная информация"
                    @click="viewReportRows(item)"
                    :disabled="loading || runningAction"
                  />
                  <ActionButton
                    :item="item"
                    v-if="authStore.isShiftLeadPlus && !customsReportsStore.reportStage(item)?.isActive"
                    icon="fa-solid fa-trash-can"
                    tooltip-text="Удалить отчёт и его решения"
                    data-testid="reports-delete-button"
                    :disabled="loading || runningAction"
                    @click="handleDeleteReport(item)"
                  />
                </div>
              </template>

              <!-- Fallback for all other columns - make clickable -->
              <template v-else>
                <ClickableCell
                  :item="item"
                  cell-class="truncated-cell clickable-cell"
                  @click="() => viewReportRows(item)"
                >
                  <template #default>
                    {{ item[col.key] }}
                  </template>
                </ClickableCell>
              </template>
            </td>
          </tr>
        </template>
      </v-data-table-server>
    </v-card>
    <ActionDialog :action-dialog="actionDialogState" />
  </div>
</template>

<style scoped>
@import '@/assets/styles/scrollable-table.css';

/* Minimal width for truncation columns */
.col-text {
  min-width: 140px;
}
</style>
