<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application
import { computed, onUnmounted, ref } from 'vue'
import ActionButton from './ActionButton.vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { useBoxesStore } from '@/stores/boxes.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { reportError } from '@/helpers/error.helpers.js'

const props = defineProps({
  box: { type: Object, required: true },
  disabled: { type: Boolean, default: false }
})
const auth = useAuthStore()
const boxes = useBoxesStore()
const alerts = useAlertStore()
const busy = ref(false)
const title = 'Выгрузить коды стикеров'
const boxId = computed(() => Number(props.box.boxId ?? props.box.id))
const physical = computed(() => Number.isInteger(boxId.value) && boxId.value > 0 &&
  props.box.bucketIndex == null && (props.box.area == null || Number(props.box.area) === 1))
const unavailable = computed(() => props.disabled || busy.value ||
  !(props.box.code ?? props.box.boxCode)?.trim() || !props.box.boxSticker?.trim())
let mounted = true
onUnmounted(() => { mounted = false })

async function download() {
  if (!auth.isWhManagerPlus || !physical.value || unavailable.value) return
  busy.value = true
  try {
    await boxes.downloadStickers(boxId.value)
  } catch (error) {
    if (mounted) alerts.error(error, { fallback: 'Не удалось выгрузить коды стикеров коробки. Повторите попытку.' })
    else reportError(error, { context: 'box sticker export after unmount' })
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <ActionButton v-if="auth.isWhManagerPlus && physical" :item="box" icon="fa-solid fa-share"
    :tooltip-text="title" :aria-label="title" data-testid="box-export-stickers"
    :disabled="unavailable" @click="download" />
</template>
