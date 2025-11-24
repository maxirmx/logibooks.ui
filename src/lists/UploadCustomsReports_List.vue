<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onMounted } from 'vue'
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
  { title: '№', key: 'id', align: 'start', width: '70px' },
  { title: 'Имя файла', key: 'fileName', align: 'start' },
  { title: 'Результат загрузки', key: 'result', align: 'start' },
  { title: 'Процедура', key: 'customsProcedure', align: 'start' },
  { title: 'Мастер накладная', key: 'masterInvoice', align: 'start' },
  { title: 'Всего записей', key: 'processedRows', align: 'end', width: '120px' },
  { title: 'Выпущено всего', key: 'releasedParcels', align: 'end', width: '140px' },
  { title: 'Выпущено с уплатой', key: 'releasedWithDutyParcels', align: 'end', width: '170px' },
  { title: 'Запрет выпуска', key: 'heldParcels', align: 'end', width: '140px' },
  { title: 'Обновлено кодов ТН ВЭД', key: 'updatedTnVedParcels', align: 'end', width: '200px' },
  { title: 'Ошибочных записей', key: 'errorCount', align: 'end', width: '170px' },
  { title: 'Ошибка', key: 'errMsg', align: 'start' }
]

const tableItems = computed(() =>
  (reports.value || []).map((report) => ({
    ...report,
    result: report.success ? 'Успешно' : 'Не успешно',
    errorCount:
      (report.emptyRows || 0) +
      (report.errorInvalidTnVedRecords || 0) +
      (report.errorDecisionRecords || 0) +
      (report.errorProcedureMismatchRecords || 0) +
      (report.errorParcelNotFoundRecords || 0) +
      (report.errorAlreadyProcessedParcels || 0)
  }))
)
</script>

<template>
  <div class="settings table-2">
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
      />
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
