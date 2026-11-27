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
const emit = defineEmits(['retry', 'acknowledge', 'close', 'cancel'])
const location = output => buildParcelListLocation({ registerId: output.id, mode: OP_MODE_PAPERWORK })
</script>

<template>
  <ActionDialog :action-dialog="state.progress" cancellable :cancel-disabled="!state.canCancel" :cancelling="state.cancelling" @cancel="emit('cancel')" />
  <div v-if="['recovery', 'unknown'].includes(state.phase)" class="header-actions-bar">
    <v-btn v-if="state.phase === 'recovery'" v-bind="APP_DIALOG_BUTTON_PROPS.primary" data-testid="split-retry" @click="emit('retry')">Проверить результат разделения</v-btn>
    <v-btn v-if="state.phase === 'unknown'" v-bind="APP_DIALOG_BUTTON_PROPS.primary" :to="{ path: '/registers', query: { mode: OP_MODE_PAPERWORK } }" data-testid="split-register-list">Список реестров</v-btn>
    <v-btn v-if="state.phase === 'unknown'" v-bind="APP_DIALOG_BUTTON_PROPS.destructive" data-testid="split-allow-new" @click="emit('acknowledge')">Разрешить новое разделение</v-btn>
  </div>
  <v-dialog :model-value="state.summaryVisible" :width="APP_DIALOG_SIZES.medium" :max-width="APP_DIALOG_MAX_WIDTH"
    aria-label="Результаты разделения реестра" @update:model-value="value => { if (!value) emit('close') }">
    <AppDialogFrame title="Результаты разделения реестра">
      <div v-if="state.result" class="form-row-1 form-compact ga-2" data-testid="split-results">
        <div v-for="output in state.result.outputs" :key="output.id" class="form-group flex-wrap" data-testid="split-output">
          <div class="readonly-field h-auto flex-wrap ga-2">
            <span class="flex-grow-1 text-break">{{ output.name }}</span>
            <span class="flex-shrink-0 text-no-wrap">{{ output.count }} посылок</span>
            <span v-if="output.manifestFileName" class="w-100 text-break">
              Манифест № {{ output.manifestPosition }} · {{ output.manifestFileName }}
            </span>
          </div>
          <RouterLink v-if="output.available" :to="location(output)" custom v-slot="{ navigate }">
            <ActionButton :item="output" icon="fa-solid fa-list" tooltip-text="Список посылок"
              :aria-label="`Открыть реестр ${output.name}`" :data-testid="`split-open-${output.id}`" @click="navigate" />
          </RouterLink>
          <span v-else>Реестр недоступен</span>
        </div>
        <p v-if="state.result.sourceOnlyCount > 0" class="mb-0" data-testid="split-source-only">
          Остались только в исходном реестре · {{ state.result.sourceOnlyCount }} посылок
        </p>
      </div>
      <template #actions><v-btn v-bind="APP_DIALOG_BUTTON_PROPS.primary" @click="emit('close')">Закрыть</v-btn></template>
    </AppDialogFrame>
  </v-dialog>
</template>
