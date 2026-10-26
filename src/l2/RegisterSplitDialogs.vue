<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { RouterLink } from 'vue-router'
import ActionButton from '@/components/ActionButton.vue'
import ActionDialog from '@/l2/ActionDialog.vue'
import AppDialogFrame from '@/components/AppDialogFrame.vue'
import { APP_DIALOG_BUTTON_PROPS, APP_DIALOG_MAX_WIDTH, APP_DIALOG_SIZES } from '@/helpers/dialog.helpers.js'
import { buildParcelListLocation } from '@/helpers/parcel.navigation.helpers.js'
import { OP_MODE_PAPERWORK } from '@/helpers/op.mode.js'

defineProps({ state: { type: Object, required: true } })
const emit = defineEmits(['retry', 'refresh', 'acknowledge', 'close', 'cancel'])
const outputs = ['ordinary', 'dangerous']
const location = output => buildParcelListLocation({ registerId: output.id, mode: OP_MODE_PAPERWORK })
</script>

<template>
  <ActionDialog :action-dialog="state.progress" cancellable :cancel-disabled="!state.canCancel" :cancelling="state.cancelling" @cancel="emit('cancel')" />
  <div v-if="['recovery', 'unknown'].includes(state.phase) || state.refreshFailed" class="header-actions-bar">
    <v-btn v-if="state.phase === 'recovery'" v-bind="APP_DIALOG_BUTTON_PROPS.primary" data-testid="split-retry" @click="emit('retry')">Проверить результат разделения</v-btn>
    <v-btn v-if="state.phase === 'unknown'" v-bind="APP_DIALOG_BUTTON_PROPS.primary" :to="{ path: '/registers', query: { mode: OP_MODE_PAPERWORK } }" data-testid="split-register-list">Список реестров</v-btn>
    <v-btn v-if="state.phase === 'unknown'" v-bind="APP_DIALOG_BUTTON_PROPS.destructive" data-testid="split-allow-new" @click="emit('acknowledge')">Разрешить новое разделение</v-btn>
    <v-btn v-if="state.refreshFailed" v-bind="APP_DIALOG_BUTTON_PROPS.primary" data-testid="split-refresh" @click="emit('refresh')">Обновить данные</v-btn>
  </div>
  <v-dialog :model-value="state.summaryVisible" :width="APP_DIALOG_SIZES.medium" :max-width="APP_DIALOG_MAX_WIDTH"
    aria-label="Результаты разделения реестра" @update:model-value="value => { if (!value) emit('close') }">
    <AppDialogFrame title="Результаты разделения реестра">
      <div v-if="state.result" class="form-row-1 form-compact ga-2" data-testid="split-results">
        <div v-for="kind in outputs" :key="kind" class="form-group flex-wrap" :data-testid="`split-result-${kind}`">
          <div class="readonly-field h-auto flex-wrap ga-2">
            <span class="flex-grow-1 text-break" :data-testid="`split-name-${kind}`">{{ state.result[kind].name }}</span>
            <span class="flex-shrink-0 text-no-wrap"><span :data-testid="`split-count-${kind}`">{{ state.result[kind].count }}</span> посылок</span>
          </div>
          <RouterLink v-if="state.result[kind].available" :to="location(state.result[kind])" custom v-slot="{ navigate }">
            <ActionButton :item="state.result[kind]" icon="fa-solid fa-list" tooltip-text="Список посылок"
              :aria-label="`Открыть реестр ${state.result[kind].name}`" :data-testid="`split-open-${kind}`" @click="navigate" />
          </RouterLink>
          <span v-else>Реестр недоступен</span>
        </div>
      </div>
      <template #actions><v-btn v-bind="APP_DIALOG_BUTTON_PROPS.primary" @click="emit('close')">Закрыть</v-btn></template>
    </AppDialogFrame>
  </v-dialog>
</template>