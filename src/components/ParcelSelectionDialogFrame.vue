<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import AppDialogFrame from '@/components/AppDialogFrame.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { APP_DIALOG_SIZES } from '@/helpers/dialog.helpers.js'

defineProps({
  title: { type: String, required: true },
  busy: Boolean
})
const open = defineModel({ type: Boolean, required: true })
</script>

<template>
  <v-dialog
    v-model="open"
    :width="`min(${APP_DIALOG_SIZES.workflow}px, 96vw)`"
    :aria-label="title"
    content-class="parcel-selection-dialog-position"
  >
    <AppDialogFrame :title="title" selection-layout>
      <template #headerActions>
        <div v-if="busy" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <slot name="actions" />
      </template>
      <template #afterHeader>
        <PageAlertRegion v-if="open" />
      </template>
      <slot />
    </AppDialogFrame>
  </v-dialog>
</template>

<style>
.parcel-selection-dialog-position {
  position: absolute !important;
  top: 8vh !important;
  left: 2vw !important;
  overflow: visible !important;
}
</style>
