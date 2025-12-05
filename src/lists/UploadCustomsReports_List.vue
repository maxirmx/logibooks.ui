<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onMounted, ref } from 'vue'
import TruncateTooltipCell from '@/components/TruncateTooltipCell.vue'
import { storeToRefs } from 'pinia'
import { useDecsStore } from '@/stores/decs.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import ActionDialog from '@/components/ActionDialog.vue'
import ActionButton from '@/components/ActionButton.vue'
import { useActionDialog } from '@/composables/useActionDialog.js'
import { dispatchDecReportUploadedEvent } from '@/helpers/dec.report.events.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'

const decsStore = useDecsStore()
const alertStore = useAlertStore()
const authStore = useAuthStore()

const { reports, loading, error } = storeToRefs(decsStore)
const { alert } = storeToRefs(alertStore)

const fileInput = ref(null)
const { actionDialogState, showActionDialog, hideActionDialog } = useActionDialog()

onMounted(async () => {
  await decsStore.getReports()
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
    await decsStore.upload(file)
    dispatchDecReportUploadedEvent({ fileName: file.name })
    await decsStore.getReports()
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

const headers = [
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
</script>

<template>
  <div class="settings table-3">
    <div class="header-with-actions">
      <h1 class="primary-heading">Отчеты о выпуске</h1>
      <div class="header-actions">
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

    <v-card class="table-card">
      <v-data-table
        v-if="tableItems?.length"
        v-model:items-per-page="authStore.uploadcustomsreports_per_page"
        :items-per-page-options="itemsPerPageOptions"
        v-model:page="authStore.uploadcustomsreports_page"
        v-model:sort-by="authStore.uploadcustomsreports_sort_by"
        :headers="headers"
        :items="tableItems"
        :loading="loading"
        density="compact"
        class="elevation-1 interlaced-table"
        item-value="id"
        height="calc(100vh - 400px)"
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
                col.align === 'center' ? 'text-center' : col.align === 'end' ? 'text-right' : 'text-start'
              ]"
            >
              <!-- File / text columns with conditional truncation tooltip -->
              <TruncateTooltipCell
                v-if="['fileName','masterInvoice','errMsg'].includes(col.key)"
                :text="item[col.key]"
              />

              <!-- Error count with breakdown tooltip -->
              <template v-else-if="col.key === 'errorCount'">
                <v-tooltip v-if="item.errorCount" location="top" open-delay="150">
                  <template #activator="{ props }">
                    <span v-bind="props">{{ item.errorCount }}</span>
                  </template>
                  <div>
                    <div v-for="e in item.errorsBreakdown" :key="e.key">
                      {{ e.label }}: {{ e.count }}
                    </div>
                  </div>
                </v-tooltip>
                <span v-else>0</span>
              </template>

              <!-- Fallback for all other columns -->
              <template v-else>
                {{ item[col.key] }}
              </template>
            </td>
          </tr>
        </template>
      </v-data-table>

      <div v-else-if="!loading" class="text-center m-5">
        Список отчетов пуст
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
