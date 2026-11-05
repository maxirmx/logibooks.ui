<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { computed, inject, ref, shallowRef, watch } from 'vue'
import { useStickerCsvDownload } from '@/composables/useStickerCsvDownload.js'
import { boxScanId, MANUAL_SCAN_KEY } from '@/helpers/manual.scan.helpers.js'
import { useBoxesStore } from '@/stores/boxes.store.js'

const props = defineProps({
  registerId: { type: Number, required: true },
  scopeKey: { type: String, required: true },
  readOnly: Boolean,
  disabled: Boolean
})

const scan = inject(MANUAL_SCAN_KEY)
const boxes = useBoxesStore()
const { busy, download } = useStickerCsvDownload('Не удалось выгрузить коды стикеров выбранных коробок. Повторите попытку.')
const isOpen = ref(false)
const menuList = ref(null)
const activator = shallowRef(null)
const target = shallowRef(null)
const selected = shallowRef([])
const canScan = computed(() => !props.readOnly && scan.canScan.value && !scan.disabled.value && !scan.jobsLoading.value &&
  scan.compatibleJobs().length > 0)

function open(event, items) {
  if (props.disabled || !items.length) return
  selected.value = items
  activator.value = event.currentTarget
  target.value = event.type === 'contextmenu' ? [event.clientX, event.clientY] : activator.value
  isOpen.value = true
}

function closeWithFocus() {
  isOpen.value = false
  activator.value?.focus()
}

function exportSelection() {
  closeWithFocus()
  const boxIds = selected.value.map(boxScanId)
  return download(() => boxes.downloadSelectedStickers(props.registerId, boxIds))
}

watch(() => [props.scopeKey, props.disabled], () => { isOpen.value = false })
watch(isOpen, (open) => {
  if (open) menuList.value?.focus('first')
}, { flush: 'post' })
defineExpose({ open })
</script>

<template>
  <v-menu
    v-model="isOpen"
    :target="target"
    :open-on-click="false"
    scroll-strategy="close"
  >
    <v-list
      ref="menuList"
      density="compact"
      role="menu"
      aria-label="Действия с коробками"
      @keydown.esc.stop.prevent="closeWithFocus"
    >
      <v-list-item
        title="Выгрузить коды стикеров в CSV"
        role="menuitem"
        data-testid="selected-boxes-export-stickers"
        :disabled="busy"
        :aria-disabled="busy || undefined"
        @click="exportSelection"
      />
      <v-list-item
        v-if="canScan"
        title="Отметить как отсканированные"
        role="menuitem"
        data-testid="selected-boxes-scan"
        @click="scan.run(selected, null, true)"
      />
    </v-list>
  </v-menu>
</template>
