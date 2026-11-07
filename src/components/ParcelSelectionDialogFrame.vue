<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import PageAlertRegion from '@/components/PageAlertRegion.vue'

defineProps({
  title: { type: String, required: true },
  busy: Boolean
})
const open = defineModel({ type: Boolean, required: true })
</script>

<template>
  <v-dialog v-model="open" content-class="parcel-selection-dialog-position">
    <v-card class="parcel-selection-dialog-card">
      <div class="parcel-selection-dialog-header">
        <div class="header-with-actions">
          <h1 class="primary-heading">{{ title }}</h1>
          <div class="header-actions-bar">
            <div v-if="busy" class="header-actions header-actions-group">
              <span class="spinner-border spinner-border-m"></span>
            </div>
            <slot name="actions" />
          </div>
        </div>
        <hr class="hr" />
        <PageAlertRegion v-if="open" />
      </div>
      <v-card-text class="parcel-selection-dialog-content">
        <slot />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.parcel-selection-dialog-card {
  border: 2px solid #797979;
  box-shadow: 0px 3px 7px rgba(0, 0, 0, 0.1);
  border-radius: 0.25rem;
}

.parcel-selection-dialog-header {
  padding: 16px 16px 0;
}

.parcel-selection-dialog-header .header-with-actions {
  align-items: center;
  margin-bottom: 0.5rem;
}

.parcel-selection-dialog-header .primary-heading {
  margin: 0;
}

.parcel-selection-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 0;
}
</style>

<style>
.parcel-selection-dialog-position {
  position: absolute !important;
  top: 8vh !important;
  left: 2vw !important;
  width: min(960px, 96vw) !important;
  overflow: visible !important;
}
</style>
