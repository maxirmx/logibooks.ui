<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, getCurrentScope, ref, toRef } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { useRegisterCustoms } from '@/composables/useRegisterCustoms.js'
import { runWithAlert } from '@/helpers/notification.helpers.js'
import { buildParcelListHeading } from '@/helpers/register.heading.helpers.js'
import { OP_MODE_PAPERWORK, getRegisterNouns } from '@/helpers/op.mode.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import router from '@/router'

const props = defineProps({ registerId: { type: Number, required: true } })
const auth = useAuthStore()
const registers = useRegistersStore()
const componentScope = getCurrentScope()
const itemsPerPage = ref(100)
const { summary, summaryLoading, deleting, remove } = useRegisterCustoms(toRef(props, 'registerId'))
const registerHeading = computed(() => buildParcelListHeading(
  summary.value?.register, registers.getTransportationDocument, getRegisterNouns(OP_MODE_PAPERWORK).singular
))
const headers = [
  { title: '', key: 'actions', sortable: false },
  { title: 'ДТЭГ/ПТДЭГ', key: 'number' },
  { title: 'Всего решений', key: 'decisionCount', align: 'end' },
  { title: 'Применено', key: 'appliedCount', align: 'end' },
  { title: 'Не применено', key: 'notAppliedCount', align: 'end' }
]
const busy = computed(() => summaryLoading.value || deleting.value)

function openDecisions(dec) {
  return runWithAlert(() => router.push({
    name: 'Решения реестра',
    params: { registerId: props.registerId },
    query: dec ? { decId: dec.id } : {}
  }), { fallback: 'Не удалось открыть решения реестра', scope: componentScope })
}

function close() {
  return runWithAlert(
    () => router.push({ path: '/registers', query: { mode: OP_MODE_PAPERWORK } }),
    { fallback: 'Не удалось открыть список реестров', scope: componentScope }
  )
}
</script>

<template>
  <div class="settings table-3 list-with-filters">
    <div class="header-with-actions">
      <h1 class="primary-heading">ДТЭГ/ПТДЭГ — {{ registerHeading }}</h1>
      <div class="header-actions-bar">
        <div v-if="busy" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton :item="null" icon="fa-solid fa-list" tooltip-text="Все решения" aria-label="Все решения"
            :disabled="busy || !summary" @click="() => openDecisions()" />
          <ActionButton :item="null" icon="fa-solid fa-xmark" icon-size="2x" tooltip-text="Закрыть" aria-label="Закрыть" @click="close" />
        </div>
      </div>
    </div>
    <hr class="hr" />
    <PageAlertRegion />
    <v-card class="table-card">
      <v-data-table v-model:items-per-page="itemsPerPage" :headers="headers" :items="summary?.items ?? []"
        :loading="busy" item-value="id" density="compact" class="elevation-1 interlaced-table"
        :items-per-page-options="itemsPerPageOptions" no-data-text="Нет ДТЭГ/ПТДЭГ">
        <template #[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton :item="item" icon="fa-solid fa-list" tooltip-text="Список решений" aria-label="Список решений"
              :disabled="busy" @click="openDecisions" />
            <ActionButton v-if="auth.isShiftLeadPlus" :item="item" icon="fa-solid fa-trash-can"
              tooltip-text="Удалить все решения по ДТЭГ/ПТДЭГ" aria-label="Удалить все решения по ДТЭГ/ПТДЭГ"
              :disabled="busy || summary?.register?.readOnly || !item.decisionCount"
              @click="() => remove({ dec: item })" />
          </div>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>
