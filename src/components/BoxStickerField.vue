<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application
import BoxStickerPrintButton from './BoxStickerPrintButton.vue'
defineProps({
  box: { type: Object, required: true },
  company: { type: Object, default: null },
  showLabel: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false }
})
</script>
<template>
  <div class="box-sticker-field" data-testid="box-sticker-field">
    <span v-if="showLabel" class="label">Код стикера:</span>
    <span class="box-sticker-value" data-testid="box-sticker-value">{{ box.boxSticker || '—' }}</span>
    <BoxStickerPrintButton :box="box" :company="company" :disabled="disabled" />
  </div>
</template>
<style scoped>
.box-sticker-field { display: flex; align-items: center; gap: 0.5rem; }
.box-sticker-value { overflow-wrap: anywhere; min-width: 0; }
</style>
