<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onMounted } from 'vue'
import TruncateTooltipCell from '@/components/TruncateTooltipCell.vue'
import { storeToRefs } from 'pinia'
import { useDecsStore } from '@/stores/decs.store.js'
import { useAlertStore } from '@/stores/alert.store.js'

const decsStore = useDecsStore()
const alertStore = useAlertStore()

const { reports, loading, error } = storeToRefs(decsStore)
const { alert } = storeToRefs(alertStore)

onMounted(async () => {
  await decsStore.getReports()
})

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
    <h1 class="primary-heading">Отчеты по загрузке ДТ</h1>
    <hr class="hr" />

    <v-card>
    <v-data-table
      v-if="tableItems?.length"
      :headers="headers"
      :items="tableItems"
      :loading="loading"
      density="compact"
      class="elevation-1 interlaced-table"
      item-value="id"
    >
      <template #item.fileName="{ value }">
        <TruncateTooltipCell :text="value" />
      </template>
      <template #item.errorCount="{ item, value }">
        <v-tooltip v-if="value" location="top" open-delay="150">
          <template #activator="{ props }">
            <span v-bind="props" class="error-count error-positive">{{ value }}</span>
          </template>
          <div class="tooltip-errors">
            <div v-for="e in item.errorsBreakdown" :key="e.key" class="tooltip-line">
              <span class="tooltip-label">{{ e.label }}:</span> <span class="tooltip-number">{{ e.count }}</span>
            </div>
          </div>
        </v-tooltip>
        <span v-else class="error-count">0</span>
      </template>
      <template #item.masterInvoice="{ value }">
        <TruncateTooltipCell :text="value" />
      </template>
      <template #item.errMsg="{ value }">
        <TruncateTooltipCell :text="value" />
      </template>
    </v-data-table>      
  
    <div v-else-if="!loading" class="text-center m-5">
        Список отчетов пуст
      </div>
    </v-card>

    <div v-if="loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    <div v-if="error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке информации: {{ error }}</div>
    </div>
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>

<style scoped>
.col-text {
  min-width: 140px;        /* minimal width */
}

.file-text {
  min-width: 180px;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
