<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

defineProps({
  title: { type: String, required: true },
  tone: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'error', 'warning'].includes(value)
  },
  compact: { type: Boolean, default: false },
  selectionLayout: Boolean,
  contentClass: { type: [String, Array, Object], default: null }
})
</script>

<template>
  <v-card
    class="app-dialog-frame"
    :class="[
      `app-dialog-frame--${tone}`,
      { 'app-dialog-frame--compact': compact, 'app-dialog-frame--selection': selectionLayout }
    ]"
  >
    <div v-if="selectionLayout" class="parcel-selection-dialog-header">
      <div class="header-with-actions">
        <h1 class="primary-heading">{{ title }}</h1>
        <div class="header-actions-bar">
          <slot name="headerActions" />
        </div>
      </div>
      <hr class="hr" />
      <slot name="afterHeader" />
    </div>
    <v-card-title v-else class="app-dialog-frame__title">
      <span
        v-if="tone === 'error' || tone === 'warning'"
        class="app-dialog-frame__tone-icon"
        aria-hidden="true"
      >
        !
      </span>
      <span class="app-dialog-frame__title-text">{{ title }}</span>
      <div v-if="$slots.headerActions" class="app-dialog-frame__header-actions">
        <slot name="headerActions" />
      </div>
    </v-card-title>

    <v-card-text :class="[selectionLayout ? 'app-dialog-frame__selection-content' : 'app-dialog-frame__content', contentClass]">
      <slot />
    </v-card-text>

    <v-card-actions v-if="$slots.actions" class="app-dialog-frame__actions">
      <slot name="actions" />
    </v-card-actions>
  </v-card>
</template>
