<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onUnmounted, ref, toRef, watch } from 'vue'
import { useConfirm } from 'vuetify-use-dialog'
import TruncateTooltipCell from '@/components/TruncateTooltipCell.vue'
import ClickableCell from '@/components/ClickableCell.vue'
import { storeToRefs } from 'pinia'
import { useCustomsReportsStore } from '@/stores/customs.reports.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import ActionDialog from '@/components/ActionDialog.vue'
import ActionButton from '@/components/ActionButton.vue'
import { useActionDialog } from '@/composables/useActionDialog.js'
import { dispatchDecReportUploadedEvent } from '@/helpers/dec.report.events.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import PaginationFooter from '@/components/PaginationFooter.vue'
import { mdiMagnify } from '@mdi/js'
import router from '@/router'
import { useDebouncedFilterSync } from '@/composables/useDebouncedFilterSync.js'

const customsReportsStore = useCustomsReportsStore()
const alertStore = useAlertStore()
const authStore = useAuthStore()

const { reports, loading, error, totalCount } = storeToRefs(customsReportsStore)
const { alert } = storeToRefs(alertStore)

const fileInput = ref(null)
const runningAction = ref(false)
const { actionDialogState, showActionDialog, hideActionDialog } = useActionDialog()
const confirm = useConfirm()
const uploadcustomsreports_page = toRef(authStore, 'uploadcustomsreports_page')
const uploadcustomsreports_per_page = toRef(authStore, 'uploadcustomsreports_per_page')
const uploadcustomsreports_sort_by = toRef(authStore, 'uploadcustomsreports_sort_by')
const uploadcustomsreports_search = toRef(authStore, 'uploadcustomsreports_search')
const localSearch = ref(uploadcustomsreports_search.value || '')
const isComponentMounted = ref(true)

async function loadReports() {
  await customsReportsStore.getReports()
}

const { triggerLoad, stop: stopFilterSync } = useDebouncedFilterSync({
  filters: [{ local: localSearch, store: uploadcustomsreports_search }],
  loadFn: loadReports,
  isComponentMounted,
  debounceMs: 300
})

const watcherStop = watch(
  [uploadcustomsreports_page, uploadcustomsreports_per_page, uploadcustomsreports_sort_by],
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

function openReportUploadDialog() {
  fileInput.value?.click()
}

async function onReportFileSelected(event) {
  const input = event?.target
  const file = input?.files?.[0]

  if (!file) {
    return
  }

  try {
    showActionDialog('upload-report')
    await customsReportsStore.upload(file)
    dispatchDecReportUploadedEvent({ fileName: file.name })
    await customsReportsStore.getReports()
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || 'Не удалось загрузить отчёт'
    alertStore.error(message)
  } finally {
    hideActionDialog()
    if (input) {
      input.value = ''
    }
  }
}

const baseHeaders = [
  { title: '№', key: 'id', align: 'center', width: '70px' },
  { title: 'Имя файла', key: 'fileName', align: 'center', class: 'col-text' },
  { title: 'Результат загрузки', key: 'result', align: 'center' },
  { title: 'Процедура', key: 'customsProcedure', align: 'center' },
  { title: 'Мастер накладная', key: 'masterInvoice', align: 'center', class: 'col-text'},
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

const maxPage = computed(() => Math.max(1, Math.ceil((totalCount.value || 0) / uploadcustomsreports_per_page.value)))

const pageOptions = computed(() => {
  const mp = maxPage.value
  const current = uploadcustomsreports_page.value || 1
  if (mp <= 200) {
    return Array.from({ length: mp }, (_, i) => ({ value: i + 1, title: String(i + 1) }))
  }

  const set = new Set()
  for (let i = 1; i <= 10; i++) set.add(i)
  for (let i = Math.max(1, mp - 9); i <= mp; i++) set.add(i)
  for (let i = Math.max(1, current - 10); i <= Math.min(mp, current + 10); i++) set.add(i)

  return Array.from(set).sort((a, b) => a - b).map(n => ({ value: n, title: String(n) }))
})

// Labels for error breakdown tooltip
const errorLabels = {
  emptyRows: 'Пустых строк в отчёте',
  errorInvalidTnVedRecords: 'Несуществующих ТН ВЭД',
  errorDecisionRecords: 'Нераспознанных решений таможенного органа',
  errorProcedureMismatchRecords: 'Несовпадений таможенной процедуры с реестром',
  errorParcelNotFoundRecords: 'Ненайденных посылок',
  errorAlreadyProcessedParcels: 'Посылок с установленным полем ДТЭГ/ПТДЭГ'
}

const tableItems = computed(() =>
  (reports.value || []).map((report) => {
    const errorCount =
      (report.emptyRows || 0) +
      (report.errorInvalidTnVedRecords || 0) +
      (report.errorDecisionRecords || 0) +
      (report.errorProcedureMismatchRecords || 0) +
      (report.errorParcelNotFoundRecords || 0) +
      (report.errorAlreadyProcessedParcels || 0)

    // Build breakdown array only for non-zero entries
    const errorsBreakdown = Object.entries(errorLabels)
      .map(([key, label]) => {
        const count = report[key] || 0
        return count ? { key, label, count } : null
      })
      .filter(Boolean)

    return {
      ...report,
      result: report.success ? 'Успешно' : 'Не успешно',
      errorCount,
      errorsBreakdown
    }
  })
)

async function handleDeleteReport(report) {
  if (!report?.id || runningAction.value) {
    return
  }

  if (runningAction.value) return

  runningAction.value = true
  try {
    const content = `Удалить информацию об отчёте "${report.fileName || report.id}" ?`
    const confirmed = await confirm({
      title: 'Подтверждение',
      confirmationText: 'Удалить',
      cancellationText: 'Не удалять',
      dialogProps: {
        width: '30%',
        minWidth: '250px'
      },
      confirmationButtonProps: {
        color: 'orange-darken-3'
      },
      content
    })

    if (!confirmed) return

    await customsReportsStore.remove(report.id)
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || 'Не удалось удалить отчёт'
    alertStore.error(message)
  } finally {
    runningAction.value = false
  }
}

function viewReportRows(report) {
  const query = {}
  if (report?.masterInvoice) {
    query.masterInvoice = report.masterInvoice
  }

  router.push({
    path: `/customs-reports/${report.id}/rows`,
    query
  })
}
</script>

<template>
  <div class="settings table-3">
    <div class="header-with-actions">
      <h1 class="primary-heading">Отчеты о выпуске</h1>
      <div style="display:flex; align-items:center;">
        <div v-if="loading" class="header-actions header-actions-group">
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
          accept=".xls,.xlsx,.zip,.rar"
          data-testid="reports-upload-input"
          style="display: none"
          @change="onReportFileSelected"
        />
      </div>
    </div>
    <hr class="hr" />

    <div class="mb-4">
      <v-text-field
        v-model="localSearch"
        :append-inner-icon="mdiMagnify"
        label="Поиск по отчётам"
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
        :items-length="totalCount"
        :loading="loading"
        density="compact"
        class="elevation-1 interlaced-table"
        item-value="id"
        fixed-header
        hide-default-footer
      >
        <!-- Row-level slot to avoid dotted slot names -->
        <template #item="{ item, columns }">
          <tr>
            <td
              v-for="col in columns"
              :key="col.key"
              :class="[
                col.class,
                col.align === 'center' ? 'text-center' : col.align === 'end' ? 'text-right' : 'text-start'
              ]"
              :data-column-key="col.key"
            >
              <!-- File / text columns with conditional truncation tooltip -->
              <template v-if="['fileName','masterInvoice','errMsg'].includes(col.key)">
                <ClickableCell :item="item" cell-class="truncated-cell clickable-cell" @click="() => viewReportRows(item)">
                  <template #default>
                    <TruncateTooltipCell :text="item[col.key]" />
                  </template>
                </ClickableCell>
              </template>

              <!-- ID column - clickable cell to view rows -->
              <template v-else-if="col.key === 'id'">
                <ClickableCell :item="item" :display-value="item.id" cell-class="truncated-cell clickable-cell" :data-testid="'report-id-link-' + item.id" @click="() => viewReportRows(item)" />
              </template>

              <!-- Error count with breakdown tooltip -->
              <template v-else-if="col.key === 'errorCount'">
                <v-tooltip v-if="item.errorCount" location="top" open-delay="150">
                  <template #activator="{ props }">
                    <ClickableCell v-bind="props" :item="item" cell-class="truncated-cell clickable-cell" @click="() => viewReportRows(item)">
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
                    :disabled="loading || runningAction" />
                  <ActionButton
                    :item="item"
                    icon="fa-solid fa-trash-can"
                    tooltip-text="Удалить информацию об отчёте"
                    data-testid="reports-delete-button"
                    :disabled="loading || runningAction"
                    @click="handleDeleteReport(item)"
                  />
                </div>
              </template>

              <!-- Fallback for all other columns - make clickable -->
              <template v-else>
                <ClickableCell :item="item" cell-class="truncated-cell clickable-cell" @click="() => viewReportRows(item)">
                  <template #default>
                    {{ item[col.key] }}
                  </template>
                </ClickableCell>
              </template>
            </td>
          </tr>
        </template>
      </v-data-table-server>
      <div class="v-data-table-footer">
        <PaginationFooter
          v-model:items-per-page="uploadcustomsreports_per_page"
          v-model:page="uploadcustomsreports_page"
          :items-per-page-options="itemsPerPageOptions"
          :page-options="pageOptions"
          :total-count="totalCount"
          :max-page="maxPage"
        />
      </div>
    </v-card>

    <div v-if="error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке информации: {{ error }}</div>
    </div>
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
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
